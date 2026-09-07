import mathJson from "../../../curriculum/math.json";
import englishJson from "../../../curriculum/english.json";
import reasoningJson from "../../../curriculum/reasoning.json";
import scienceJson from "../../../curriculum/science.json";
import {
  ConceptAvailabilitySchema,
  CurriculumDefinitionSchema,
  type ActivitySpec,
  type ConceptAvailability,
  type CurriculumConcept,
  type CurriculumDefinition,
  type LearningDirective,
  type ProgressEvent,
  type RepresentationStage,
  type StudentConceptState,
} from "@child-learning/contracts";

export const DEFAULT_CURRICULUM: readonly CurriculumDefinition[] = [mathJson, englishJson, reasoningJson, scienceJson].map((definition) => CurriculumDefinitionSchema.parse(definition));

export function validateCurriculumRegistry(definitions: readonly CurriculumDefinition[]): Map<string, CurriculumConcept> {
  const concepts = new Map<string, CurriculumConcept>();
  for (const definition of definitions) {
    for (const concept of definition.concepts) {
      if (concept.subject !== definition.subject) throw new Error(`${concept.id} subject does not match its curriculum`);
      if (concepts.has(concept.id)) throw new Error(`duplicate curriculum concept: ${concept.id}`);
      const stages = concept.stages.map((stage) => stage.stage);
      if (new Set(stages).size !== stages.length) throw new Error(`${concept.id} stages must be unique and remain in configured order`);
      concepts.set(concept.id, concept);
    }
  }
  for (const concept of concepts.values()) {
    for (const required of [...concept.prerequisites, ...concept.readinessConceptIds]) if (!concepts.has(required)) throw new Error(`${concept.id} references missing concept ${required}`);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (conceptId: string): void => {
    if (visiting.has(conceptId)) throw new Error(`curriculum prerequisite cycle includes ${conceptId}`);
    if (visited.has(conceptId)) return;
    visiting.add(conceptId);
    const concept = concepts.get(conceptId)!;
    for (const parent of new Set([...concept.prerequisites, ...concept.readinessConceptIds])) visit(parent);
    visiting.delete(conceptId);
    visited.add(conceptId);
  };
  for (const conceptId of concepts.keys()) visit(conceptId);
  return concepts;
}

export const DEFAULT_CONCEPTS = validateCurriculumRegistry(DEFAULT_CURRICULUM);

export function representationStageFromEvent(event: ProgressEvent): RepresentationStage | undefined {
  const match = event.comparabilityKey?.match(/(?:^|\|)stage:([^|]+)(?:\||$)/);
  return match?.[1] as RepresentationStage | undefined;
}

function stageEvidence(conceptId: string, stage: RepresentationStage, events: readonly ProgressEvent[]): ProgressEvent[] {
  return events.filter((event) => event.conceptId === conceptId && event.evidenceStatus === "confirmed" && event.eventType === "observation" && (representationStageFromEvent(event) ?? "pictorial") === stage);
}

function completesStage(concept: CurriculumConcept, stage: RepresentationStage, events: readonly ProgressEvent[]): boolean {
  const stageIndex = concept.stages.findIndex((candidate) => candidate.stage === stage);
  const definition = concept.stages[stageIndex];
  if (!definition) return true;
  const laterEvidenceExists = concept.stages.slice(stageIndex + 1).some((later) => stageEvidence(concept.id, later.stage, events).length > 0);
  if (laterEvidenceExists) return true;
  const evidence = stageEvidence(concept.id, stage, events);
  if (definition.evidencePurpose === "exploration") return evidence.length >= definition.minimumConfirmed;
  const recent = evidence.filter((event) => event.comparable !== false && typeof event.score === "number").slice(-definition.minimumConfirmed);
  return recent.length >= definition.minimumConfirmed && recent.reduce((sum, event) => sum + (event.score ?? 0), 0) / recent.length >= definition.minimumAverage;
}

export function conceptIsSecure(concept: CurriculumConcept, _states: readonly StudentConceptState[], events: readonly ProgressEvent[]): boolean {
  return concept.stages.every((stage) => completesStage(concept, stage.stage, events));
}

export function deriveConceptAvailability(input: { definitions?: readonly CurriculumDefinition[]; states: readonly StudentConceptState[]; events?: readonly ProgressEvent[]; directives?: readonly LearningDirective[]; now?: Date | string }): ConceptAvailability[] {
  const definitions = input.definitions ?? DEFAULT_CURRICULUM;
  const concepts = validateCurriculumRegistry(definitions);
  const events = input.events ?? [];
  const now = new Date(input.now ?? new Date());
  const directives = (input.directives ?? []).filter((directive) => !directive.expiresAt || Date.parse(directive.expiresAt) >= now.getTime());
  const directiveByConcept = new Map<string, LearningDirective>();
  for (const directive of directives) directiveByConcept.set(directive.conceptId, directive);
  const secure = new Set([...concepts.values()].filter((concept) => conceptIsSecure(concept, input.states, events)).map((concept) => concept.id));

  return [...concepts.values()].sort((a, b) => a.subject.localeCompare(b.subject) || a.step - b.step || a.id.localeCompare(b.id)).map((concept) => {
    const directive = directiveByConcept.get(concept.id);
    const required = [...new Set([...concept.prerequisites, ...concept.readinessConceptIds])];
    const unmetPrerequisiteIds = required.filter((conceptId) => !secure.has(conceptId));
    const completedStages = concept.stages.filter((stage) => completesStage(concept, stage.stage, events));
    const currentStage = concept.stages.find((stage) => !completedStages.includes(stage))?.stage ?? concept.stages.at(-1)!.stage;
    const ownEvidence = events.some((event) => event.conceptId === concept.id && event.evidenceStatus === "confirmed");
    const assessingReportedCapability = directive?.action === "assess";
    const introducedEarly = (directive?.action === "introduce" || assessingReportedCapability) && concept.allowEarlyIntroduction;
    let status: ConceptAvailability["status"];
    let reason: string;
    if (directive?.action === "defer") { status = "deferred"; reason = `An adult deferred this concept: ${directive.reason}`; }
    else if (secure.has(concept.id)) { status = "secure"; reason = "The configured learning stages have enough confirmed evidence."; }
    else if (ownEvidence) { status = "active"; reason = `Learning is active at the ${currentStage} stage based on the child's own evidence.`; }
    else if (assessingReportedCapability) { status = "available"; reason = `An adult reported this as a current capability. Start with a ${directive.requestedStage ?? currentStage} diagnostic; the statement itself does not count as mastery.`; }
    else if (unmetPrerequisiteIds.length === 0) { status = "available"; reason = `The ${currentStage} stage is ready to introduce.`; }
    else if (introducedEarly) { status = "available"; reason = `An adult opened an early ${directive.requestedStage ?? concept.stages[0]!.stage} introduction without marking prerequisites mastered.`; }
    else { status = "locked"; reason = `Build readiness through ${unmetPrerequisiteIds.join(", ")} or let an adult open an early introduction.`; }
    return ConceptAvailabilitySchema.parse({ conceptId: concept.id, subject: concept.subject, title: concept.title, status, currentStage: introducedEarly ? directive?.requestedStage ?? concept.stages[0]!.stage : currentStage, stageOrder: concept.stages.map((stage) => stage.stage), branchKind: concept.branchKind, unmetPrerequisiteIds, reason, introducedEarly, priority: directive?.action === "assess" ? 5 : directive?.action === "prioritize" ? directive.priority ?? 3 : 0 });
  });
}

export function filterAvailableActivities(activities: readonly ActivitySpec[], availability: readonly ConceptAvailability[]): ActivitySpec[] {
  const byConcept = new Map(availability.map((entry) => [entry.conceptId, entry]));
  return activities.filter((activity) => {
    const entry = byConcept.get(activity.conceptId);
    if (!entry || entry.status === "locked" || entry.status === "deferred") return false;
    const activityStage = activity.representationStage ?? entry.stageOrder[0]!;
    const activityIndex = entry.stageOrder.indexOf(activityStage);
    const currentIndex = entry.stageOrder.indexOf(entry.currentStage);
    return activityIndex >= 0 && currentIndex >= 0 && activityIndex <= currentIndex;
  });
}
