import {
  CurriculumPackRevisionSchema,
  type ActivitySpec,
  type CurriculumActivityTemplate,
  type CurriculumConcept,
  type CurriculumDefinition,
  type CurriculumPackRevision,
} from "@child-learning/contracts";

export type CurriculumRegistryOptions = {
  generators?: ReadonlySet<string>;
  evaluators?: ReadonlySet<string>;
  renderers?: ReadonlySet<string>;
};

const BUILT_IN_SUBJECTS: Record<string, { title: string; description: string }> = {
  math: { title: "Math", description: "Numbers, operations, patterns, measurement, and mathematical reasoning." },
  english: { title: "Language Arts", description: "Reading, writing, vocabulary, comprehension, and communication." },
  reasoning: { title: "Reasoning", description: "Patterns, classification, sequencing, logic, and problem solving." },
  science: { title: "Science", description: "Observation, living systems, matter, Earth, and scientific explanation." },
};

export function curriculumDefinitionsToPackRevision(definitions: readonly CurriculumDefinition[]): CurriculumPackRevision {
  const subjects = definitions.map((definition) => ({ id: definition.subject, ...(BUILT_IN_SUBJECTS[definition.subject] ?? { title: definition.title, description: `${definition.title} learning path.` }) }));
  const concepts = definitions.flatMap((definition) => definition.concepts);
  const edges = concepts.flatMap((concept) => [
    ...concept.prerequisites.map((from) => ({ id: `${from}--requires--${concept.id}`, from, to: concept.id, type: "requires" as const })),
    ...concept.readinessConceptIds.map((from) => ({ id: `${from}--readiness--${concept.id}`, from, to: concept.id, type: "readiness" as const })),
  ]);
  return CurriculumPackRevisionSchema.parse({
    schemaVersion: "2.0",
    id: "capability-path-v1",
    packId: "core-foundations",
    revision: 1,
    title: "Core foundations",
    description: "The original Learning Worktable capability paths, preserved as the first immutable curriculum revision.",
    subjects,
    concepts,
    edges,
    activityTemplates: [],
    provenance: { origin: "original", notes: "Imported from the original capability-path-v1 curriculum files." },
    createdBy: "system-migration",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
}

export class CurriculumRegistry {
  readonly revisions: readonly CurriculumPackRevision[];
  readonly concepts = new Map<string, CurriculumConcept>();
  readonly conceptRevisionIds = new Map<string, string>();
  readonly subjects = new Map<string, { id: string; title: string; description: string; icon?: string }>();
  readonly templates = new Map<string, CurriculumActivityTemplate>();
  readonly assessmentTargets = new Map<string, { conceptId: string; stage: string; questionnairePrompt?: string }>();

  constructor(revisionInputs: readonly CurriculumPackRevision[], options: CurriculumRegistryOptions = {}) {
    this.revisions = revisionInputs.map((revision) => CurriculumPackRevisionSchema.parse(revision));

    for (const revision of this.revisions) this.addSubjects(revision);
    for (const revision of this.revisions) this.addConcepts(revision, options);
    this.applyTypedDependencies();
    for (const revision of this.revisions) this.addTemplates(revision);
    this.validateGraph();
  }

  private addSubjects(revision: CurriculumPackRevision): void {
    for (const subject of revision.subjects) {
      const display = BUILT_IN_SUBJECTS[subject.id] ?? subject;
      const existing = this.subjects.get(subject.id);
      if (existing && (existing.title !== display.title || existing.description !== display.description)) throw new Error(`subject ${subject.id} has conflicting definitions`);
      this.subjects.set(subject.id, { id: subject.id, title: display.title, description: display.description, ...(subject.icon ? { icon: subject.icon } : {}) });
    }
  }

  private addConcepts(revision: CurriculumPackRevision, options: CurriculumRegistryOptions): void {
    for (const concept of revision.concepts) {
      if (!this.subjects.has(concept.subject)) throw new Error(`${concept.id} references unknown subject ${concept.subject}`);
      if (this.concepts.has(concept.id)) throw new Error(`duplicate curriculum concept: ${concept.id}`);
      const stages = new Set<string>();
      for (const stage of concept.stages) {
        if (stages.has(stage.stage)) throw new Error(`${concept.id} repeats stage ${stage.stage}`);
        stages.add(stage.stage);
        if (options.generators && !options.generators.has(stage.generator)) throw new Error(`${concept.id} references unknown generator ${stage.generator}`);
        if (options.evaluators && !options.evaluators.has(stage.evaluator)) throw new Error(`${concept.id} references unknown evaluator ${stage.evaluator}`);
        if (options.renderers && !options.renderers.has(stage.renderer)) throw new Error(`${concept.id} references unknown renderer ${stage.renderer}`);
        const allowedKinds = stage.activityKinds.length > 0 ? stage.activityKinds : concept.activityKinds;
        if (allowedKinds.some((kind) => !concept.activityKinds.includes(kind))) throw new Error(`${concept.id} stage ${stage.stage} uses an unsupported activity kind`);
      }
      for (const target of concept.assessmentTargets) {
        if (!stages.has(target.stage)) throw new Error(`${concept.id} assessment target ${target.claim} references missing stage ${target.stage}`);
        const owner = this.assessmentTargets.get(target.claim);
        if (owner && owner.conceptId !== concept.id) throw new Error(`assessment claim ${target.claim} is assigned to both ${owner.conceptId} and ${concept.id}`);
        this.assessmentTargets.set(target.claim, { conceptId: concept.id, stage: target.stage, ...(target.questionnairePrompt ? { questionnairePrompt: target.questionnairePrompt } : {}) });
      }
      this.concepts.set(concept.id, concept);
      this.conceptRevisionIds.set(concept.id, revision.id);
    }
  }

  private applyTypedDependencies(): void {
    const requiredByConcept = new Map<string, string[]>();
    const readinessByConcept = new Map<string, string[]>();
    for (const revision of this.revisions) for (const edge of revision.edges) {
      if (edge.type === "requires") requiredByConcept.set(edge.to, [...(requiredByConcept.get(edge.to) ?? []), edge.from]);
      if (edge.type === "readiness") readinessByConcept.set(edge.to, [...(readinessByConcept.get(edge.to) ?? []), edge.from]);
    }
    for (const [id, concept] of this.concepts) this.concepts.set(id, {
      ...concept,
      prerequisites: [...new Set([...concept.prerequisites, ...(requiredByConcept.get(id) ?? [])])],
      readinessConceptIds: [...new Set([...concept.readinessConceptIds, ...(readinessByConcept.get(id) ?? [])])],
    });
  }

  private addTemplates(revision: CurriculumPackRevision): void {
    for (const template of revision.activityTemplates) {
      if (this.templates.has(template.id)) throw new Error(`duplicate activity template: ${template.id}`);
      const concept = this.concepts.get(template.conceptId);
      if (!concept) throw new Error(`${template.id} references missing concept ${template.conceptId}`);
      if (!concept.stages.some((stage) => stage.stage === template.stage)) throw new Error(`${template.id} references missing stage ${template.stage}`);
      const itemIds = new Set(template.items.map((item) => item.id));
      if (Object.keys(template.answerSpecs).some((id) => !itemIds.has(id)) || template.items.some((item) => !template.answerSpecs[item.id])) throw new Error(`${template.id} answer specifications must match every item`);
      if (template.items.some((item) => item.conceptId !== template.conceptId || !concept.activityKinds.includes(item.kind))) throw new Error(`${template.id} contains an item outside its concept contract`);
      this.templates.set(template.id, template);
    }
  }

  private validateGraph(): void {
    const edgeIds = new Set<string>();
    for (const revision of this.revisions) for (const edge of revision.edges) {
      if (edgeIds.has(edge.id)) throw new Error(`duplicate curriculum edge: ${edge.id}`);
      edgeIds.add(edge.id);
      if (!this.concepts.has(edge.from)) throw new Error(`edge ${edge.id} references missing source ${edge.from}`);
      if (!this.concepts.has(edge.to)) throw new Error(`edge ${edge.id} references missing target ${edge.to}`);
    }
    for (const concept of this.concepts.values()) {
      for (const required of [...concept.prerequisites, ...concept.readinessConceptIds]) if (!this.concepts.has(required)) throw new Error(`${concept.id} references missing concept ${required}`);
    }
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (id: string): void => {
      if (visiting.has(id)) throw new Error(`curriculum prerequisite cycle includes ${id}`);
      if (visited.has(id)) return;
      visiting.add(id);
      const concept = this.concepts.get(id)!;
      for (const parent of new Set([...concept.prerequisites, ...concept.readinessConceptIds])) visit(parent);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of this.concepts.keys()) visit(id);
    const edgeParents = new Map<string, string[]>();
    for (const revision of this.revisions) for (const edge of revision.edges) if (edge.type === "requires" || edge.type === "readiness") edgeParents.set(edge.to, [...(edgeParents.get(edge.to) ?? []), edge.from]);
    const edgeVisiting = new Set<string>();
    const edgeVisited = new Set<string>();
    const visitEdges = (id: string): void => {
      if (edgeVisiting.has(id)) throw new Error(`curriculum edge cycle includes ${id}`);
      if (edgeVisited.has(id)) return;
      edgeVisiting.add(id);
      for (const parent of edgeParents.get(id) ?? []) visitEdges(parent);
      edgeVisiting.delete(id);
      edgeVisited.add(id);
    };
    for (const id of this.concepts.keys()) visitEdges(id);
  }

  definitions(): CurriculumDefinition[] {
    return [...this.subjects.values()].map((subject) => ({ schemaVersion: "1.0" as const, subject: subject.id, title: subject.title, concepts: [...this.concepts.values()].filter((concept) => concept.subject === subject.id).sort((a, b) => a.step - b.step || a.id.localeCompare(b.id)) }));
  }

  revisionForConcept(conceptId: string): CurriculumPackRevision | undefined {
    const revisionId = this.conceptRevisionIds.get(conceptId);
    return this.revisions.find((revision) => revision.id === revisionId);
  }

  activityMatchesActiveRevision(activity: ActivitySpec): boolean {
    const revision = this.revisionForConcept(activity.conceptId);
    if (!revision) return false;
    if (activity.curriculumRef) return activity.curriculumRef.packId === revision.packId && activity.curriculumRef.revisionId === revision.id && activity.curriculumRef.nodeRevisionId === `${revision.id}:${activity.conceptId}`;
    if (activity.curriculumVersion) return activity.curriculumVersion === revision.id;
    return revision.id === "capability-path-v1";
  }
}
