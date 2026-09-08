import { LearnerRoadmapSchema, type ConceptAvailability, type LearningDirective, type LearnerRoadmap, type ProgressEvent, type RoadmapEdge, type RoadmapNode, type StudentConceptState } from "@child-learning/contracts";
import { deriveConceptAvailability } from "./curriculum.js";
import type { CurriculumRegistry } from "./registry.js";

function graphFingerprint(nodes: readonly RoadmapNode[], edges: readonly RoadmapEdge[]): string {
  const graph = JSON.stringify({ nodes, edges });
  let hash = 2_166_136_261;
  for (let index = 0; index < graph.length; index += 1) {
    hash ^= graph.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function roadmapId(studentId: string, subject: string, at: string, nodes: readonly RoadmapNode[], edges: readonly RoadmapEdge[]): string {
  const timestamp = at.replace(/[^0-9A-Za-z]+/g, "-");
  return `roadmap-${studentId}-${subject}-${timestamp}-${graphFingerprint(nodes, edges)}`;
}

function confirmedScores(events: readonly ProgressEvent[], conceptId: string): number[] {
  return events.filter((event) => event.conceptId === conceptId && event.evidenceStatus === "confirmed" && typeof event.score === "number").map((event) => event.score!);
}

function needsExtraPractice(events: readonly ProgressEvent[], state: StudentConceptState | undefined, conceptId: string): boolean {
  if (state?.status === "revisit") return true;
  const scores = confirmedScores(events, conceptId).slice(-3);
  return scores.length >= 2 && scores.filter((score) => score < .75).length >= 2;
}

function nodeStatus(availability: ConceptAvailability): RoadmapNode["status"] {
  if (availability.status === "secure") return "completed";
  if (availability.status === "active") return "current";
  if (availability.status === "available") return "ready";
  if (availability.status === "deferred") return "deferred";
  return "locked";
}

export function projectLearnerRoadmaps(input: { studentId: string; registry: CurriculumRegistry; states: readonly StudentConceptState[]; events?: readonly ProgressEvent[]; directives?: readonly LearningDirective[]; now?: Date | string }): LearnerRoadmap[] {
  const now = new Date(input.now ?? new Date()).toISOString();
  const events = input.events ?? [];
  const availability = deriveConceptAvailability({ definitions: input.registry.definitions(), states: input.states, events, ...(input.directives ? { directives: input.directives } : {}), now });
  const availabilityById = new Map(availability.map((entry) => [entry.conceptId, entry]));
  const stateById = new Map(input.states.map((state) => [state.conceptId, state]));
  const depthCache = new Map<string, number>();
  const depth = (conceptId: string): number => {
    const cached = depthCache.get(conceptId);
    if (cached !== undefined) return cached;
    const concept = input.registry.concepts.get(conceptId)!;
    const parents = [...new Set([...concept.prerequisites, ...concept.readinessConceptIds])];
    const value = parents.length === 0 ? 0 : Math.max(...parents.map((parent) => depth(parent))) + 1;
    depthCache.set(conceptId, value);
    return value;
  };

  return [...input.registry.subjects.values()].map((subject) => {
    const concepts = [...input.registry.concepts.values()].filter((concept) => concept.subject === subject.id).sort((a, b) => depth(a.id) - depth(b.id) || a.step - b.step || a.id.localeCompare(b.id));
    const nodes: RoadmapNode[] = concepts.map((concept) => {
      const entry = availabilityById.get(concept.id)!;
      const scores = confirmedScores(events, concept.id);
      return {
        id: concept.id,
        conceptId: concept.id,
        subject: concept.subject,
        title: concept.title,
        description: concept.description,
        stage: entry.currentStage,
        status: nodeStatus(entry),
        branchKind: concept.branchKind,
        depth: depth(concept.id),
        reason: entry.reason,
        evidenceCount: scores.length,
        ...(scores.length > 0 ? { recentScore: scores.at(-1) } : {}),
        reviewDue: stateById.get(concept.id)?.status === "revisit",
        curriculumRevisionId: input.registry.conceptRevisionIds.get(concept.id)!,
      };
    });
    const edgeMap = new Map<string, RoadmapEdge>();
    const conceptIds = new Set(concepts.map((concept) => concept.id));
    for (const revision of input.registry.revisions) for (const edge of revision.edges) if (conceptIds.has(edge.from) && conceptIds.has(edge.to)) edgeMap.set(edge.id, edge);
    for (const concept of concepts) {
      for (const from of concept.prerequisites) if (conceptIds.has(from)) edgeMap.set(`${from}--requires--${concept.id}`, { id: `${from}--requires--${concept.id}`, from, to: concept.id, type: "requires" });
      for (const from of concept.readinessConceptIds) if (conceptIds.has(from)) edgeMap.set(`${from}--readiness--${concept.id}`, { id: `${from}--readiness--${concept.id}`, from, to: concept.id, type: "readiness" });
      if (needsExtraPractice(events, stateById.get(concept.id), concept.id) && availabilityById.get(concept.id)?.status !== "secure") {
        const practiceId = `${concept.id}::extra-practice`;
        nodes.push({ id: practiceId, conceptId: concept.id, subject: concept.subject, title: `${concept.title} practice`, description: `Another route through ${concept.title.toLocaleLowerCase()}.`, stage: availabilityById.get(concept.id)!.currentStage, status: "ready", branchKind: "extra-practice", depth: depth(concept.id) + 1, reason: "Repeated confirmed work shows that another practice route would help.", evidenceCount: confirmedScores(events, concept.id).length, reviewDue: false, curriculumRevisionId: input.registry.conceptRevisionIds.get(concept.id)!, parentConceptId: concept.id, rejoinsConceptId: concept.id });
        edgeMap.set(`${concept.id}--branches--${practiceId}`, { id: `${concept.id}--branches--${practiceId}`, from: concept.id, to: practiceId, type: "branches" });
        edgeMap.set(`${practiceId}--rejoins--${concept.id}`, { id: `${practiceId}--rejoins--${concept.id}`, from: practiceId, to: concept.id, type: "rejoins" });
      }
    }
    const edges = [...edgeMap.values()];
    const explicitCurrentNodeIds = nodes.filter((node) => node.status === "current").map((node) => node.id);
    const readyNodes = nodes.filter((node) => node.status === "ready").sort((left, right) => (availabilityById.get(right.conceptId)?.priority ?? 0) - (availabilityById.get(left.conceptId)?.priority ?? 0) || left.depth - right.depth || left.id.localeCompare(right.id));
    const readyNodeIds = readyNodes.map((node) => node.id);
    const currentNodeIds = explicitCurrentNodeIds.length > 0 ? explicitCurrentNodeIds : readyNodeIds.slice(0, 1);
    const completedNodeIds = nodes.filter((node) => node.status === "completed").map((node) => node.id);
    const coreNodes = nodes.filter((node) => node.branchKind === "core" || node.branchKind === "extension");
    const expansionNeeded = coreNodes.length > 0 && coreNodes.every((node) => node.status === "completed");
    return LearnerRoadmapSchema.parse({ schemaVersion: "1.0", id: roadmapId(input.studentId, subject.id, now, nodes, edges), studentId: input.studentId, subject: subject.id, title: subject.title, curriculumRevisionIds: [...new Set(concepts.map((concept) => input.registry.conceptRevisionIds.get(concept.id)!))], nodes, edges, currentNodeIds: currentNodeIds.length > 0 ? currentNodeIds : readyNodeIds.slice(0, 1), completedNodeIds, frontierNodeIds: [...currentNodeIds, ...readyNodeIds], expansionNeeded, ...(expansionNeeded ? { expansionReason: `The approved ${subject.title} roadmap is complete. An adult can review a proposed extension.` } : {}), generatedAt: now });
  });
}
