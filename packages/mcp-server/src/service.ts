import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  ActivitySpecSchema,
  CurriculumActivationSchema,
  CurriculumPackRevisionSchema,
  CurriculumRevisionDecisionSchema,
  CurriculumRevisionProposalSchema,
  EvaluationSchema,
  HumanOverrideSchema,
  LearningDirectiveSchema,
  ReportSnapshotSchema,
  StudentSchema,
  SubmissionSchema,
  toChildActivitySpec,
  toChildLearnerRoadmap,
  type ActivitySpec,
  type CurriculumPackRevision,
  type CurriculumRevisionDecision,
  type CurriculumRevisionProposal,
  type LearnerRoadmap,
  type ConceptAvailability,
  type Evaluation,
  type HumanOverride,
  type LearningDirective,
  type ProgressEvent,
  type ReportSnapshot,
  type RepresentationStage,
  type Student,
  type StudentConceptState,
  type Submission,
} from "@child-learning/contracts";
import {
  ACTIVITY_GENERATORS,
  CurriculumRegistry,
  DEFAULT_CURRICULUM,
  DEFAULT_PROGRESSION_POLICY,
  GROWING_PATHS_REVISION,
  comparabilityKey,
  conceptIsSecure,
  curriculumDefinitionsToPackRevision,
  deriveConceptAvailability,
  filterAvailableActivities,
  projectLearnerRoadmaps,
  projectProgression,
  projectStudentConceptState,
  progressEventsFromEvaluation,
  rankRecommendations,
  recentTrend,
  scoreSubmission,
} from "@child-learning/domain";
import { closeDatabase, LearningRepository, migrateDatabase, openDatabase, type SqliteDatabase } from "@child-learning/database";
import { seedDemo } from "@child-learning/demo";
import { ArtifactStore, type StoredArtifact } from "@child-learning/storage";

export interface LocalServiceOptions {
  projectRoot?: string;
  databasePath?: string;
  artifactsDir?: string;
  clock?: () => string;
  env?: NodeJS.ProcessEnv;
}

export interface RecommendationRequestOptions {
  now?: string;
  availableMinutes?: number;
  preferredSubject?: ActivitySpec["subject"];
  adultGoalConceptIds?: string[];
}

export interface DemoStatus {
  initialized: boolean;
  projectRoot: string;
  databasePath: string;
  artifactsDir: string;
  dataLocation: "explicit" | "workspace" | "legacy-web";
  students: number;
  activities: number;
  submissions: number;
  evaluations: number;
  progressEvents: number;
}

export interface LocalService {
  readonly root: string;
  readonly databasePath: string;
  readonly artifactsDir: string;
  readonly db: SqliteDatabase;
  readonly repo: LearningRepository;
  readonly store: ArtifactStore;
  readonly registry: CurriculumRegistry;
  close(): void;
  initializeDemo(now?: string): Promise<unknown>;
  demoStatus(): DemoStatus;
  listStudents(): Student[];
  createStudent(input: { id?: string; displayName: string; birthDate?: string; schoolPlacement?: string; preferredLanguage?: string; accommodations?: string[]; interests?: string[]; learningGoals?: string[]; selectedSubjects?: string[]; reportedCapabilities?: Student["reportedCapabilities"]; baselineNotes?: string; baselineStatus?: Student["baselineStatus"] }): Student;
  getStudentContext(studentId: string): Record<string, unknown>;
  generateActivity(input: { subject?: ActivitySpec["subject"]; conceptId?: string; generator?: string; seed: number; studentId?: string; itemCount?: number; representationStage?: RepresentationStage; difficultyLevel?: number; now?: string }): ActivitySpec;
  validateAndStoreActivity(specInput: unknown): Promise<Record<string, unknown>>;
  getActivity(activityId: string, adult?: boolean): Record<string, unknown>;
  storeActivityRender(input: { activityId: string; bytes: Uint8Array; mediaType: "text/html" | "application/pdf"; fileExtension: ".html" | ".pdf"; renderKind: "worksheet-html" | "worksheet-pdf" }): Promise<Record<string, unknown>>;
  recordDigitalSubmission(input: Omit<Submission, "submittedAt"> & { submittedAt?: string; operationKey?: string }): Promise<Record<string, unknown>>;
  proposeUploadedWorkEvaluation(input: { submissionId: string; conceptId?: string; score?: number; evidence: string[]; confidence: number; items?: Evaluation["items"]; rationale?: string; now?: string }): Promise<Record<string, unknown>>;
  confirmEvaluation(input: { evaluationId: string; reviewerId: string; score: number; rationale: string; now?: string }): Promise<Record<string, unknown>>;
  rejectEvaluation(input: { evaluationId: string; reviewerId: string; reason: string; now?: string }): Promise<Record<string, unknown>>;
  getProgress(studentId: string, conceptId?: string): Record<string, unknown>;
  getLearningPath(studentId: string): Record<string, unknown>;
  listCurriculum(): Record<string, unknown>;
  getCurriculumGraph(subject?: string): Record<string, unknown>;
  getLearningRoadmaps(studentId: string, adult?: boolean): Record<string, unknown>;
  reconcileLearningRoadmaps(studentId: string, triggerType?: string, triggerId?: string): Promise<Record<string, unknown>>;
  proposeCurriculumRevision(input: Omit<CurriculumRevisionProposal, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<Record<string, unknown>>;
  decideCurriculumRevision(input: { proposalId: string; decision: "approved" | "rejected"; reviewerId: string; note: string; now?: string }): CurriculumRevisionDecision;
  activateCurriculumRevision(input: { proposalId?: string; revisionId?: string; actorId: string; reason: string; action?: "activate" | "rollback"; now?: string }): Promise<Record<string, unknown>>;
  applyLearningDirective(input: { id: string; studentId: string; conceptId: string; action: "introduce" | "assess" | "prioritize" | "defer" | "clear"; reason: string; authorId: string; requestedStage?: RepresentationStage; priority?: number; expiresAt?: string; operationKey?: string }): Promise<Record<string, unknown>>;
  recommendNextActivity(studentId: string, options?: RecommendationRequestOptions): Promise<Record<string, unknown>>;
  getTimeline(studentId: string): unknown[];
  getArtifactLineage(artifactId: string): Promise<Record<string, unknown>>;
  applyOverride(input: { id: string; studentId: string; conceptId: string; targetStep: number; reason: string; authorId: string; targetId?: string; operationKey?: string }): Record<string, unknown>;
  reverseOverride(input: { id: string; studentId: string; conceptId: string; targetId: string; reason: string; authorId: string; operationKey?: string }): Record<string, unknown>;
  generateProgressReport(studentId: string, now?: string): Promise<Record<string, unknown>>;
  composeVisualAsset(input: { id?: string; width?: number; height?: number; shapes: Array<Record<string, unknown>>; metadata?: Record<string, unknown> }): Promise<StoredArtifact>;
}

const iso = (value?: string, fallback?: () => string) => new Date(value ?? fallback?.() ?? new Date().toISOString()).toISOString();
const parseJson = <T>(value: unknown, fallback: T): T => {
  try { return typeof value === "string" ? JSON.parse(value) as T : (value as T); } catch { return fallback; }
};
const rowStudent = (row: Record<string, unknown>): Student => {
  const metadata = parseJson<{ preferredLanguage?: string; accommodations?: string[]; interests?: string[]; learningGoals?: string[]; selectedSubjects?: string[]; reportedCapabilities?: Student["reportedCapabilities"]; baselineNotes?: string; baselineStatus?: Student["baselineStatus"] }>(row.metadata_json, {});
  return StudentSchema.parse({
    id: row.id, displayName: row.display_name, birthDate: row.birth_date ?? undefined,
    gradeBand: row.grade ?? "school-age", preferredLanguage: metadata.preferredLanguage ?? "en", accommodations: metadata.accommodations ?? [], interests: metadata.interests ?? [], learningGoals: metadata.learningGoals ?? [], selectedSubjects: metadata.selectedSubjects ?? [], reportedCapabilities: metadata.reportedCapabilities ?? [], ...(metadata.baselineNotes ? { baselineNotes: metadata.baselineNotes } : {}), baselineStatus: metadata.baselineStatus ?? "unassessed",
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
};
const rowActivity = (row: Record<string, unknown>, adult: boolean): Record<string, unknown> => {
  const specification = ActivitySpecSchema.parse(parseJson(row.specification_json, {}));
  const safe = adult ? specification : toChildActivitySpec(specification);
  return { ...safe, artifactId: row.artifact_id ?? undefined };
};
const cleanUndefined = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
function rowProgressEvent(row: Record<string, unknown>): ProgressEvent {
  return {
    id: String(row.id), studentId: String(row.student_id), conceptId: String(row.concept_id),
    ...(row.evaluation_id ? { evaluationId: String(row.evaluation_id) } : {}),
    ...(row.score !== null && row.score !== undefined ? { score: Number(row.score) } : {}),
    eventType: String(row.event_type) as ProgressEvent["eventType"], comparable: Boolean(row.comparable),
    evidenceStatus: String(row.evidence_status) as ProgressEvent["evidenceStatus"],
    ...(row.confidence !== null && row.confidence !== undefined ? { confidence: Number(row.confidence) } : {}),
    ...(row.comparability_key ? { comparabilityKey: String(row.comparability_key) } : {}), occurredAt: String(row.occurred_at),
    ...(row.reason ? { reason: String(row.reason) } : {}),
  };
}

function stateFromRow(studentId: string, conceptId: string, row: Record<string, unknown> | undefined, at: string): StudentConceptState {
  return row ? {
    studentId, conceptId, step: Number(row.step), status: String(row.status) as StudentConceptState["status"],
    recentScores: parseJson<number[]>(row.recent_scores_json, []), updatedAt: String(row.updated_at),
    ...(row.last_event_at ? { lastEvidenceAt: String(row.last_event_at) } : {}),
  } : { studentId, conceptId, step: 0, status: "new", recentScores: [], updatedAt: at };
}
function stateSnapshot(state: StudentConceptState): { step: number; status: StudentConceptState["status"] } {
  return { step: state.step, status: state.status };
}
function activeHumanOverrides(rows: readonly Record<string, unknown>[]): HumanOverride[] {
  const activeById = new Map<string, HumanOverride>();
  for (const row of rows) {
    if (row.decision === "reversed") {
      activeById.delete(String(row.target_id));
      continue;
    }
    if (row.decision !== "applied" || row.concept_id == null || row.target_step == null) continue;
    const override = HumanOverrideSchema.parse({
      id: row.id,
      studentId: row.student_id,
      conceptId: row.concept_id,
      targetStep: row.target_step,
      reason: row.reason,
      authorId: row.actor,
      createdAt: row.created_at,
    });
    activeById.set(override.id, override);
  }
  const latestByConcept = new Map<string, HumanOverride>();
  for (const override of activeById.values()) latestByConcept.set(override.conceptId, override);
  return [...latestByConcept.values()];
}
function activeLearningDirectives(rows: readonly Record<string, unknown>[], now: Date | string): LearningDirective[] {
  const byConcept = new Map<string, LearningDirective>();
  for (const row of rows) {
    if (row.target_type !== "concept-plan") continue;
    const parsed = LearningDirectiveSchema.safeParse(parseJson(row.override_json, {}));
    if (!parsed.success) continue;
    if (parsed.data.action === "clear") byConcept.delete(parsed.data.conceptId);
    else byConcept.set(parsed.data.conceptId, parsed.data);
  }
  const cutoff = new Date(now).getTime();
  return [...byConcept.values()].filter((directive) => !directive.expiresAt || Date.parse(directive.expiresAt) >= cutoff);
}
function availabilityStatusRank(status: ConceptAvailability["status"]): number {
  return status === "active" ? 0 : status === "available" ? 1 : status === "secure" ? 2 : 3;
}
function requireShaForEvaluation(evaluation: Evaluation): string {
  return createHash("sha256").update(JSON.stringify(evaluation)).digest("hex").slice(0, 24);
}
function validateAnswerConsistency(spec: ActivitySpec): void {
  const itemIds = new Set(spec.items.map((item) => item.id));
  const answerIds = Object.keys(spec.answerSpecs);
  if (itemIds.size !== spec.items.length) throw new Error("activity item ids must be unique");
  if (answerIds.length !== spec.items.length || answerIds.some((id) => !itemIds.has(id))) throw new Error("answerSpecs must contain exactly one entry for every item");
  if (spec.comparabilityKey !== comparabilityKey(spec)) throw new Error("comparabilityKey must match the activity structure");
  if (spec.items.some((item) => item.difficulty < 0 || item.difficulty > 10)) throw new Error("item difficulty must be between 0 and 10");
  for (const item of spec.items) {
    const answer = spec.answerSpecs[item.id];
    if (!answer) throw new Error(`missing answer specification for ${item.id}`);
    if (item.kind === "picture-addition-subtraction") {
      const expectedResult = item.operation === "addition" ? item.leftCount + item.rightCount : item.leftCount - item.rightCount;
      if (expectedResult < 0 || item.result !== expectedResult) throw new Error(`${item.id} result does not match the visible arithmetic`);
      if (answer.type !== "integer" || answer.expected !== expectedResult) throw new Error(`${item.id} answer does not match the arithmetic result`);
    }
    if (item.kind === "phonics-picture-word" && (answer.type !== "text" || answer.expected.toLocaleLowerCase() !== item.targetSound.toLocaleLowerCase())) throw new Error(`${item.id} answer must match the target sound`);
    if (item.kind === "equation") {
      const expected = answer.type === "integer" || answer.type === "number" ? answer.expected : undefined;
      const equation = item.equation.match(/^\s*(-?\d+)\s*([+\-−])\s*(-?\d+)\s*=?\s*$/);
      if (!equation) throw new Error(`${item.id} equation must contain one supported arithmetic fact`);
      const left = Number(equation[1]); const right = Number(equation[3]);
      const computed = equation[2] === "+" ? left + right : left - right;
      if (computed !== item.answer || expected !== item.answer) throw new Error(`${item.id} answer does not match the visible equation`);
    }
    if (item.kind === "number-choice") {
      if (answer.type !== "choice" || answer.expected !== String(item.correctChoice)) throw new Error(`${item.id} answer must equal correctChoice`);
      if (!item.choices.map(String).includes(answer.expected)) throw new Error(`${item.id} choice answer is not one of the choices`);
    }
    if (item.kind === "equal-groups-fair-sharing") {
      if (item.total !== item.groupCount * item.amountPerGroup) throw new Error(`${item.id} total must equal groups times amount per group`);
      if (answer.type !== "integer" || answer.expected !== item.amountPerGroup) throw new Error(`${item.id} answer must equal amountPerGroup`);
    }
    if (item.kind === "handwriting-writing" && (answer.type !== "rubric" || answer.rubricId !== item.rubricId || answer.requiresHumanReview !== true)) throw new Error(`${item.id} handwriting answers must use its review rubric`);
    if (item.kind === "reading-comprehension") {
      if (item.choices && (answer.type !== "choice" || answer.expected !== item.correctAnswer || !item.choices.includes(item.correctAnswer))) throw new Error(`${item.id} choice answer must match the reading answer and one of the choices`);
      if (!item.choices && (answer.type !== "text" || answer.expected !== item.correctAnswer)) throw new Error(`${item.id} written answer must match the reading answer`);
    }
    if (item.kind === "sequencing-reasoning") {
      const validIndices = item.answer.every((index) => index >= 0 && index < item.sequence.length) && new Set(item.answer).size === item.answer.length;
      if (!validIndices || answer.type !== "sequence" || answer.expected.length !== item.answer.length || answer.expected.some((index, position) => index !== item.answer[position])) throw new Error(`${item.id} sequence answer must exactly match valid card positions`);
    }
    if (item.kind === "science-observation" && (answer.type !== "observation" || answer.requiresHumanReview !== true)) throw new Error(`${item.id} observations must remain human-reviewed`);
    if (item.kind === "selected-response" && (answer.type !== "choice" || answer.expected !== item.correctChoice || !item.choices.includes(item.correctChoice))) throw new Error(`${item.id} selected response must match one listed choice`);
    if (item.kind === "numeric-response" && ((answer.type !== "integer" && answer.type !== "number") || answer.expected !== item.expected)) throw new Error(`${item.id} numeric answer must match the configured expected value`);
    if (item.kind === "short-response" && (answer.type !== "text" || !item.expectedAnswers.some((expected) => expected.toLocaleLowerCase() === answer.expected.toLocaleLowerCase()))) throw new Error(`${item.id} short answer must match one configured response`);
    if (item.kind === "extended-response" && (answer.type !== "rubric" || answer.rubricId !== item.rubricId || answer.requiresHumanReview !== true)) throw new Error(`${item.id} extended responses must use their review rubric`);
    if (item.kind === "ordering") {
      const validIndices = item.correctOrder.every((index) => index >= 0 && index < item.options.length) && new Set(item.correctOrder).size === item.correctOrder.length;
      if (!validIndices || answer.type !== "sequence" || answer.expected.some((index, position) => index !== item.correctOrder[position])) throw new Error(`${item.id} ordering answer must match valid option positions`);
    }
  }
}

function dbCounts(db: SqliteDatabase): { students: number; activities: number; submissions: number; evaluations: number; progress_events: number } {
  const count = (table: string) => Number((db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count);
  return { students: count("students"), activities: count("activities"), submissions: count("submissions"), evaluations: count("evaluations"), progress_events: count("progress_events") };
}

function findWorkspaceRoot(cwd: string): string {
  let current = resolve(cwd);
  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}

export function resolveProjectRoot(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string {
  const configured = env.CHILD_LEARNING_PROJECT_ROOT ?? env.KINDERGARTEN_PROJECT_ROOT ?? env.CLAUDE_PROJECT_DIR;
  return configured ? resolve(configured) : findWorkspaceRoot(cwd);
}

export function createLocalService(options: LocalServiceOptions = {}): LocalService {
  const env = options.env ?? process.env;
  const root = resolve(options.projectRoot ?? resolveProjectRoot(env));
  const explicitDatabasePath = options.databasePath ?? env.CHILD_LEARNING_DB_PATH ?? env.KINDERGARTEN_DB_PATH ?? env.LEARNING_WORKTABLE_DB;
  const explicitArtifactsDir = options.artifactsDir ?? env.CHILD_LEARNING_ARTIFACTS_DIR ?? env.KINDERGARTEN_ARTIFACTS_DIR ?? env.LEARNING_WORKTABLE_ARTIFACTS;
  const legacyDatabasePath = join(root, "apps/web/.data/learning-worktable.db");
  const useLegacyWebData = !explicitDatabasePath && existsSync(legacyDatabasePath);
  const resolveDataPath = (value: string): string => isAbsolute(value) ? resolve(value) : resolve(root, value);
  const databasePath = resolveDataPath(explicitDatabasePath ?? (useLegacyWebData ? "apps/web/.data/learning-worktable.db" : ".data/learning-worktable.db"));
  const artifactsDir = resolveDataPath(explicitArtifactsDir ?? (useLegacyWebData ? "apps/web/.data/artifacts" : ".data/artifacts"));
  const dataLocation: DemoStatus["dataLocation"] = explicitDatabasePath || explicitArtifactsDir ? "explicit" : useLegacyWebData ? "legacy-web" : "workspace";
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = openDatabase({ filename: databasePath });
  migrateDatabase(db);
  const clock = options.clock ?? (() => new Date().toISOString());
  const repo = new LearningRepository(db, clock);
  const store = new ArtifactStore({ rootDir: artifactsDir, clock });
  const builtInRevisions = [curriculumDefinitionsToPackRevision(DEFAULT_CURRICULUM), GROWING_PATHS_REVISION];
  for (const revision of builtInRevisions) {
    if (!repo.getCurriculumRevision(revision.id)) repo.saveCurriculumRevision(revision, createHash("sha256").update(JSON.stringify(revision)).digest("hex"));
    if (!db.prepare("SELECT 1 FROM curriculum_activations WHERE pack_id = ? LIMIT 1").get(revision.packId)) repo.saveCurriculumActivation({ id: `activation-${revision.id}`, packId: revision.packId, revisionId: revision.id, action: "activate", actorId: "system-migration", reason: revision.id === "capability-path-v1" ? "Import the original capability path as the first immutable curriculum revision." : "Activate the original open-ended demonstration paths.", createdAt: revision.createdAt });
  }
  const registryOptions = { generators: new Set([...Object.keys(ACTIVITY_GENERATORS), "template-bank"]), evaluators: new Set(["deterministic", "human", "review-gated"]), renderers: new Set(["worksheet", "guided-screen", "hands-on"]) };
  let registry = new CurriculumRegistry(repo.listActiveCurriculumRevisions(), registryOptions);
  const reloadRegistry = (): CurriculumRegistry => { registry = new CurriculumRegistry(repo.listActiveCurriculumRevisions(), registryOptions); return registry; };
  const generateFromTemplate = (conceptId: string, input: { studentId?: string; seed: number; itemCount?: number; representationStage?: RepresentationStage; difficultyLevel?: number; now?: string }): ActivitySpec => {
    const concept = registry.concepts.get(conceptId);
    if (!concept) throw new Error(`curriculum concept not found: ${conceptId}`);
    const stage = concept.stages.find((candidate) => candidate.stage === input.representationStage) ?? concept.stages[0]!;
    const conceptTemplates = [...registry.templates.values()].filter((template) => template.conceptId === conceptId && (concept.templateIds.length === 0 || concept.templateIds.includes(template.id)));
    const stageTemplates = conceptTemplates.filter((template) => template.stage === stage.stage);
    const templates = stageTemplates.length > 0 ? stageTemplates : conceptTemplates;
    const template = templates[Math.abs(input.seed) % templates.length];
    if (!template) throw new Error(`${conceptId} has no registered deterministic generator or activity template for ${stage.stage}`);
    const selectedItems = template.items.slice(0, Math.max(1, Math.min(input.itemCount ?? template.items.length, template.items.length)));
    const itemIds = new Map(selectedItems.map((item, index) => [item.id, `${template.id}-${input.seed}-${index + 1}`]));
    const items = selectedItems.map((item) => ({ ...item, id: itemIds.get(item.id)! }));
    const answerSpecs = Object.fromEntries(selectedItems.map((item) => [itemIds.get(item.id)!, template.answerSpecs[item.id]!]));
    const revision = registry.revisionForConcept(conceptId)!;
    const base = ActivitySpecSchema.parse({ schemaVersion: "1.0", id: `activity-${template.id}-${input.studentId ?? "unassigned"}-${input.seed}`, studentId: input.studentId ?? "unassigned", subject: concept.subject, conceptId, title: template.title, objectives: template.objectives, difficultyLevel: input.difficultyLevel ?? 5, estimatedMinutes: template.estimatedMinutes, activityType: template.activityType, representationStage: stage.stage, deliveryMode: stage.deliveryMode, evidencePurpose: stage.evidencePurpose, curriculumVersion: revision.id, curriculumRef: { packId: revision.packId, revisionId: revision.id, nodeRevisionId: `${revision.id}:${concept.id}` }, visualSupport: items.some((item) => item.assetRefs.length > 0), instructions: template.instructions, items, answerSpecs, scoring: template.scoring, prerequisiteConceptIds: [...concept.prerequisites, ...concept.readinessConceptIds], rationale: `Selected from ${revision.title} at the ${stage.title ?? stage.stage} stage.`, source: "curriculum", sourceMetadata: revision.provenance, generator: { name: "template-bank", version: "1.0" }, seed: input.seed, createdAt: iso(input.now, clock), comparabilityKey: "pending" });
    return { ...base, comparabilityKey: comparabilityKey(base) };
  };
  const requirePendingEvaluation = (evaluation: Evaluation): void => {
    if (evaluation.status !== "needs-human-review") throw new Error("Only a pending human-review evaluation can be resolved.");
    const resolution = db.prepare("SELECT id FROM evaluations WHERE supersedes_evaluation_id = ? LIMIT 1").get(evaluation.id);
    if (resolution) throw new Error("This evaluation has already been reviewed.");
  };
  const refreshBaselineStatus = (studentId: string): void => {
    const learnerRow = repo.getStudent(studentId);
    const learner = learnerRow ? rowStudent(learnerRow) : undefined;
    if (!learner || learner.baselineStatus !== "diagnostic-in-progress") return;
    const pendingDiagnostics = Number((db.prepare(`SELECT COUNT(*) AS count FROM activities a WHERE a.student_id = ? AND a.activity_type = 'assessment' AND a.title LIKE 'Starting check:%' AND NOT EXISTS (SELECT 1 FROM submissions s JOIN evaluations e ON e.submission_id = s.id AND e.outcome = 'final' WHERE s.activity_id = a.id)`).get(studentId) as { count: number }).count);
    if (pendingDiagnostics === 0) repo.saveStudent({ id: learner.id, displayName: learner.displayName, ...(learner.birthDate ? { birthDate: learner.birthDate } : {}), grade: learner.gradeBand, metadata: { preferredLanguage: learner.preferredLanguage, accommodations: learner.accommodations, interests: learner.interests, learningGoals: learner.learningGoals, selectedSubjects: learner.selectedSubjects, reportedCapabilities: learner.reportedCapabilities, baselineNotes: learner.baselineNotes, baselineStatus: "established" } });
  };
  const service: LocalService = {
    root, databasePath, artifactsDir, db, repo, store,
    get registry() { return registry; },
    close: () => closeDatabase(db),
    async initializeDemo(now) { return seedDemo({ databasePath, artifactsDir, now: now ?? clock() }); },
    demoStatus() {
      const counts = dbCounts(db);
      return { initialized: counts.students > 0 || counts.activities > 0, projectRoot: root, databasePath, artifactsDir, dataLocation, students: counts.students, activities: counts.activities, submissions: counts.submissions, evaluations: counts.evaluations, progressEvents: counts.progress_events };
    },
    listStudents: () => repo.listStudents().map(rowStudent),
    createStudent(input) {
      const now = clock();
      const student = StudentSchema.parse({ id: input.id ?? `student-${randomUUID()}`, displayName: input.displayName, ...(input.birthDate ? { birthDate: input.birthDate } : {}), gradeBand: input.schoolPlacement ?? "school-age", preferredLanguage: input.preferredLanguage ?? "en", accommodations: input.accommodations ?? [], interests: input.interests ?? [], learningGoals: input.learningGoals ?? [], selectedSubjects: input.selectedSubjects ?? [], reportedCapabilities: input.reportedCapabilities ?? [], ...(input.baselineNotes ? { baselineNotes: input.baselineNotes } : {}), baselineStatus: input.baselineStatus ?? "unassessed", createdAt: now, updatedAt: now });
      const row = repo.saveStudent({ id: student.id, displayName: student.displayName, ...(student.birthDate ? { birthDate: student.birthDate } : {}), grade: student.gradeBand, metadata: { preferredLanguage: student.preferredLanguage, accommodations: student.accommodations, interests: student.interests, learningGoals: student.learningGoals, selectedSubjects: student.selectedSubjects, reportedCapabilities: student.reportedCapabilities, baselineNotes: student.baselineNotes, baselineStatus: student.baselineStatus } });
      return rowStudent(row);
    },
    getStudentContext(studentId) {
      const student = repo.getStudent(studentId);
      if (!student) throw new Error(`student not found: ${studentId}`);
      const learningPath = service.getLearningPath(studentId) as { availability: ConceptAvailability[] };
      const activities = repo.listActivities(studentId).map((row) => ActivitySpecSchema.parse(parseJson(row.specification_json, {}))).filter((activity) => registry.activityMatchesActiveRevision(activity));
      return { student: rowStudent(student), activities: filterAvailableActivities(activities, learningPath.availability).map((activity) => toChildActivitySpec(activity)), learningPath, roadmaps: service.getLearningRoadmaps(studentId, false), progress: service.getProgress(studentId), timeline: repo.timeline(studentId) };
    },
    generateActivity(input) {
      let identifier = input.conceptId ?? input.generator;
      let representationStage = input.representationStage;
      if (!identifier && input.studentId && repo.getStudent(input.studentId)) {
        const path = service.getLearningPath(input.studentId) as { availability: ConceptAvailability[] };
        const candidates = path.availability.filter((concept) => concept.status !== "locked" && concept.status !== "deferred" && (!input.subject || concept.subject === input.subject)).sort((a, b) => b.priority - a.priority || availabilityStatusRank(a.status) - availabilityStatusRank(b.status) || a.conceptId.localeCompare(b.conceptId));
        const selected = candidates[0];
        if (selected) { identifier = selected.conceptId; representationStage = selected.currentStage; }
      }
      if (!identifier && input.subject) identifier = [...registry.concepts.values()].filter((concept) => concept.subject === input.subject).sort((a, b) => a.step - b.step)[0]?.id;
      if (!identifier) identifier = registry.concepts.has("math.counting-to-10") ? "math.counting-to-10" : registry.concepts.keys().next().value;
      if (!identifier) throw new Error("no active curriculum concepts are available");
      const concept = registry.concepts.get(identifier);
      const selectedStage = concept?.stages.find((stage) => stage.stage === representationStage) ?? concept?.stages[0];
      representationStage ??= selectedStage?.stage;
      const options = { ...input, ...(representationStage ? { representationStage } : {}), now: input.now ?? clock() };
      const generator = ACTIVITY_GENERATORS[identifier] ?? (selectedStage ? ACTIVITY_GENERATORS[selectedStage.generator] : undefined);
      const generated = generator ? generator(options) : generateFromTemplate(identifier, options);
      if (!concept || !selectedStage) return ActivitySpecSchema.parse(generated);
      const revision = registry.revisionForConcept(concept.id)!;
      const normalized = ActivitySpecSchema.parse({ ...generated, subject: concept.subject, conceptId: concept.id, representationStage: selectedStage.stage, deliveryMode: selectedStage.deliveryMode, evidencePurpose: selectedStage.evidencePurpose, curriculumVersion: revision.id, curriculumRef: { packId: revision.packId, revisionId: revision.id, nodeRevisionId: `${revision.id}:${concept.id}` }, difficultyLevel: input.difficultyLevel ?? generated.difficultyLevel, prerequisiteConceptIds: [...concept.prerequisites, ...concept.readinessConceptIds], comparabilityKey: "pending" });
      return { ...normalized, comparabilityKey: comparabilityKey(normalized) };
    },
    async validateAndStoreActivity(specInput) {
      const spec = ActivitySpecSchema.parse(specInput);
      validateAnswerConsistency(spec);
      if (spec.studentId === "unassigned") throw new Error("studentId must identify an existing student before storing an activity");
      if (!repo.getStudent(spec.studentId)) throw new Error(`student not found: ${spec.studentId}`);
      const path = service.getLearningPath(spec.studentId) as { availability: ConceptAvailability[] };
      const conceptAvailability = path.availability.find((entry) => entry.conceptId === spec.conceptId);
      if (!conceptAvailability) throw new Error(`activity concept is not registered in the runtime curriculum: ${spec.conceptId}`);
      const conceptDefinition = registry.concepts.get(spec.conceptId)!;
      if (spec.subject !== conceptDefinition.subject) throw new Error(`${spec.id} subject does not match curriculum concept ${spec.conceptId}`);
      if (spec.items.some((item) => item.conceptId !== spec.conceptId || !conceptDefinition.activityKinds.includes(item.kind))) throw new Error(`${spec.id} contains an item outside the configured concept activity kinds`);
      if (!registry.activityMatchesActiveRevision(spec)) throw new Error(`${spec.id} references a curriculum revision that is not active for ${spec.conceptId}`);
      if (spec.representationStage) {
        const stageDefinition = conceptDefinition.stages.find((stage) => stage.stage === spec.representationStage);
        if (!stageDefinition) throw new Error(`${spec.conceptId} does not define a ${spec.representationStage} stage`);
        if (spec.deliveryMode !== stageDefinition.deliveryMode || spec.evidencePurpose !== stageDefinition.evidencePurpose) throw new Error(`${spec.conceptId} ${spec.representationStage} activity does not match the curriculum delivery and evidence purpose`);
        if (stageDefinition.deliveryMode === "hands-on" && !spec.presentation) throw new Error("hands-on introductions require a presentation");
      }
      if (filterAvailableActivities([spec], path.availability).length === 0) throw new Error(`${spec.conceptId} at the ${spec.representationStage ?? "pictorial"} stage is not available: ${conceptAvailability.reason}`);
      const existing = db.prepare("SELECT specification_json, artifact_id FROM activities WHERE id = ?").get(spec.id) as { specification_json: string; artifact_id: string | null } | undefined;
      if (existing) {
        const existingSpec = ActivitySpecSchema.parse(JSON.parse(existing.specification_json));
        if (JSON.stringify(existingSpec) !== JSON.stringify(spec)) throw new Error(`activity id already belongs to a different specification: ${spec.id}`);
        const existingArtifact = existing.artifact_id ? await store.findById(existing.artifact_id) : undefined;
        if (!existingArtifact) throw new Error(`stored activity is missing its source artifact: ${spec.id}`);
        return { activity: existingSpec, artifact: existingArtifact, persisted: true, reused: true };
      }
      const artifact = await store.putText(JSON.stringify(spec), { source: spec.source === "generated" ? "deterministic-generator" : "claude-code-proposed", kind: "activity-spec", activityId: spec.id });
      const tx = db.transaction(() => {
        repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata });
        repo.saveActivity({ id: spec.id, studentId: spec.studentId, specification: spec, artifactId: artifact.id });
      });
      tx();
      return { activity: spec, artifact };
    },
    getActivity(activityId, adult = false) {
      const row = db.prepare("SELECT * FROM activities WHERE id = ?").get(activityId) as Record<string, unknown> | undefined;
      if (!row) throw new Error(`activity not found: ${activityId}`);
      if (!adult) {
        const specification = ActivitySpecSchema.parse(parseJson(row.specification_json, {}));
        const path = service.getLearningPath(specification.studentId) as { availability: ConceptAvailability[] };
        if (!registry.activityMatchesActiveRevision(specification) || filterAvailableActivities([specification], path.availability).length === 0) throw new Error(`activity is not currently available for this student: ${activityId}`);
      }
      const activity = rowActivity(row, adult);
      return adult ? activity : cleanUndefined(activity);
    },
    async storeActivityRender(input) {
      const activityRow = db.prepare("SELECT student_id, artifact_id FROM activities WHERE id = ?").get(input.activityId) as { student_id: string; artifact_id: string | null } | undefined;
      if (!activityRow) throw new Error(`activity not found: ${input.activityId}`);
      if (!activityRow.artifact_id) throw new Error("activity has no source artifact; refusing to store a rendered worksheet");
      const artifact = await store.put(input.bytes, { mediaType: input.mediaType, fileExtension: input.fileExtension, metadata: { source: "worksheet-renderer", kind: "worksheet", renderKind: input.renderKind, activityId: input.activityId, studentId: activityRow.student_id } });
      await store.addLineageEdge(activityRow.artifact_id, artifact.id, "generated-from");
      const tx = db.transaction(() => {
        repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata });
        repo.addArtifactEdge({ parentArtifactId: activityRow.artifact_id!, childArtifactId: artifact.id, relation: "generated-from" });
      });
      tx();
      return { activityId: input.activityId, sourceArtifactId: activityRow.artifact_id, artifact };
    },
    async recordDigitalSubmission(input) {
      const serviceOperationKey = input.operationKey ? `${input.operationKey}:service-result` : undefined;
      if (serviceOperationKey) {
        const prior = repo.operationResult(serviceOperationKey);
        if (prior) return prior;
      }
      if (db.prepare("SELECT 1 FROM submissions WHERE id = ?").get(input.id)) throw new Error(`submission already exists: ${input.id}`);
      const activityRow = db.prepare("SELECT * FROM activities WHERE id = ?").get(input.activityId) as Record<string, unknown> | undefined;
      if (!activityRow) throw new Error(`activity not found: ${input.activityId}`);
      const activity = ActivitySpecSchema.parse(parseJson(activityRow.specification_json, {}));
      if (activity.studentId !== input.studentId) throw new Error("submission student does not match activity student");
      const path = service.getLearningPath(input.studentId) as { availability: ConceptAvailability[] };
      if (!registry.activityMatchesActiveRevision(activity) || filterAvailableActivities([activity], path.availability).length === 0) throw new Error(`activity is not currently available for this student: ${input.activityId}`);
      const submission = SubmissionSchema.parse({ ...input, submittedAt: iso(input.submittedAt, service.repo.clock), responses: input.responses ?? [] });
      const activityItemIds = new Set(activity.items.map((item) => item.id));
      if (submission.responses.some((response) => !activityItemIds.has(response.itemId))) throw new Error("submission responses must reference items from the activity");
      const evaluation = scoreSubmission(activity, submission, { evaluationId: `evaluation-${submission.id}`, now: submission.submittedAt });
      const state = stateFromRow(submission.studentId, activity.conceptId, repo.getConceptState(submission.studentId, activity.conceptId), submission.submittedAt);
      const canProgress = evaluation.status === "final" && evaluation.items.every((item) => item.evidenceStatus === "confirmed");
      const event = canProgress ? progressEventsFromEvaluation(evaluation, activity, evaluation.evaluatedAt) : undefined;
      const events = canProgress ? repo.history(submission.studentId, activity.conceptId).map(rowProgressEvent) : [];
      const projection = event ? projectProgression(state, [...events, event]) : { step: state.step, status: state.status, decision: "no-change" as const, reason: "Subjective or ambiguous work requires adult review before progress changes." };
      let nextState = event ? projectStudentConceptState(state, [...events, event]) : state;
      const conceptDefinition = registry.concepts.get(activity.conceptId);
      if (event && conceptDefinition && conceptIsSecure(conceptDefinition, [nextState], [...events, event])) nextState = { ...nextState, status: "secure" };
      const artifact = await store.putText(JSON.stringify(submission), { source: "digital-submission", kind: "submission", submissionId: submission.id });
      const evaluationArtifact = await store.putText(JSON.stringify(evaluation), { source: "deterministic-scorer", kind: "evaluation", evaluationId: evaluation.id });
      const activityArtifactId = typeof activityRow.artifact_id === "string" ? activityRow.artifact_id : "";
      if (!activityArtifactId) throw new Error("activity has no source artifact; refusing to record submission lineage");
      await store.addLineageEdge(activityArtifactId, artifact.id, "submitted-from");
      await store.addLineageEdge(artifact.id, evaluationArtifact.id, "evaluated-from");
      const tx = db.transaction(() => {
        repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata });
        repo.recordArtifact({ id: evaluationArtifact.id, sha256: evaluationArtifact.sha256, mediaType: evaluationArtifact.mediaType, byteLength: evaluationArtifact.byteLength, relativePath: evaluationArtifact.relativePath, metadata: evaluationArtifact.metadata });
        if (activityRow.artifact_id) repo.addArtifactEdge({ parentArtifactId: String(activityRow.artifact_id), childArtifactId: artifact.id, relation: "submitted-from" });
        repo.addArtifactEdge({ parentArtifactId: artifact.id, childArtifactId: evaluationArtifact.id, relation: "evaluated-from" });
        repo.recordSubmission({ ...({ id: submission.id, studentId: submission.studentId, activityId: submission.activityId, responses: submission.responses, submittedAt: submission.submittedAt, artifactId: artifact.id } as const), ...(input.operationKey ? { operationKey: input.operationKey } : {}) });
        repo.recordEvaluation({ evaluation, ...(input.operationKey ? { operationKey: `${input.operationKey}:evaluation` } : {}) });
        for (const item of evaluation.items) repo.recordEvidence({ id: `evidence-${evaluation.id}-${item.itemId}`, evaluationId: evaluation.id, conceptId: evaluation.conceptId, evidenceType: item.evidenceStatus === "confirmed" ? "deterministic-score" : "review-required", value: item });
        if (event) {
          repo.appendProgressEvent({ event, previousState: { step: state.step, status: state.status }, newState: { step: nextState.step, status: nextState.status }, policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: projection.reason, ...(input.operationKey ? { operationKey: `${input.operationKey}:progress` } : {}) });
          repo.saveConceptState({ studentId: nextState.studentId, conceptId: nextState.conceptId, step: nextState.step, status: nextState.status, recentScores: nextState.recentScores, confidence: event.confidence, observationCount: nextState.recentScores.length, correctCount: nextState.recentScores.filter((score) => score >= 0.9).length, lastEventAt: nextState.lastEvidenceAt, mastery: nextState.recentScores.at(-1), state: { decision: projection.decision, reason: projection.reason } });
        }
      });
      tx();
      if (activity.activityType === "assessment") refreshBaselineStatus(submission.studentId);
      let unlockedActivity: Record<string, unknown> | undefined;
      let roadmapUpdate: Record<string, unknown> | undefined;
      if (event) {
        roadmapUpdate = await service.reconcileLearningRoadmaps(submission.studentId, "confirmed-evaluation", evaluation.id);
        const projected = service.getLearningRoadmaps(submission.studentId, true) as { roadmaps: LearnerRoadmap[] };
        const frontier = projected.roadmaps.flatMap((roadmap) => roadmap.nodes.filter((node) => roadmap.frontierNodeIds.includes(node.id) && node.branchKind !== "review"));
        const existingActivities = repo.listActivities(submission.studentId).map((row) => ActivitySpecSchema.parse(parseJson(row.specification_json, {})));
        const target = frontier.find((node) => !existingActivities.some((candidate) => registry.activityMatchesActiveRevision(candidate) && candidate.conceptId === node.conceptId && candidate.representationStage === node.stage));
        if (target) {
          try {
            const seed = Number.parseInt(createHash("sha256").update(`${evaluation.id}:${target.conceptId}:${target.stage}`).digest("hex").slice(0, 8), 16);
            unlockedActivity = await service.validateAndStoreActivity(service.generateActivity({ conceptId: target.conceptId, studentId: submission.studentId, seed, itemCount: 5, representationStage: target.stage, difficultyLevel: nextState.step, now: evaluation.evaluatedAt }));
          } catch (error) {
            roadmapUpdate = { ...roadmapUpdate, materializationIssue: error instanceof Error ? error.message : String(error) };
          }
        }
      }
      const result = { submission, evaluation, progress: { ...projection, state: nextState }, artifacts: [artifact, evaluationArtifact], ...(unlockedActivity ? { unlockedActivity } : {}), ...(roadmapUpdate ? { roadmapUpdate } : {}) };
      if (serviceOperationKey) repo.saveOperationResult(serviceOperationKey, "digital-submission-service", result as unknown as Record<string, unknown>);
      return result;
    },
    async proposeUploadedWorkEvaluation(input) {
      const submissionRow = db.prepare("SELECT * FROM submissions WHERE id = ?").get(input.submissionId) as Record<string, unknown> | undefined;
      if (!submissionRow) throw new Error(`submission not found: ${input.submissionId}`);
      const activityRow = db.prepare("SELECT * FROM activities WHERE id = ?").get(String(submissionRow.activity_id)) as Record<string, unknown> | undefined;
      if (!activityRow) throw new Error("activity for submission not found");
      const activity = ActivitySpecSchema.parse(parseJson(activityRow.specification_json, {}));
      if (input.conceptId && input.conceptId !== activity.conceptId) throw new Error("Uploaded evaluation concept must match the submission activity.");
      const proposedItems = input.items ?? activity.items.map((item) => ({ itemId: item.id, score: 0, mistakeTags: ["human-review-required"], evidenceStatus: "unconfirmed" as const, rationale: input.rationale ?? "Transcription requires adult review." }));
      const activityItemIds = new Set(activity.items.map((item) => item.id));
      const proposedItemIds = new Set(proposedItems.map((item) => item.itemId));
      if (proposedItemIds.size !== proposedItems.length || proposedItems.some((item) => !activityItemIds.has(item.itemId))) throw new Error("Uploaded evaluation items must uniquely reference items from the submission activity.");
      const items = proposedItems.map((item) => ({ ...item, evidenceStatus: item.evidenceStatus === "ambiguous" ? "ambiguous" as const : "unconfirmed" as const }));
      const computedScore = items.reduce((sum, item) => sum + item.score, 0) / items.length;
      if (input.score !== undefined && Math.abs(input.score - computedScore) > 0.000001) throw new Error("Uploaded evaluation score must equal the average proposed item score.");
      const evaluation = EvaluationSchema.parse({ id: `evaluation-upload-${input.submissionId}-${randomUUID()}`, submissionId: input.submissionId, studentId: String(submissionRow.student_id), conceptId: activity.conceptId, score: computedScore, items, evidence: input.evidence, confidence: input.confidence, evaluatorType: "claude_code_assisted", status: "needs-human-review", version: "1.0", followUp: { required: true, reason: "Uploaded-work transcription always requires human review.", recommendedActivityIds: [] }, evaluatedAt: iso(input.now, service.repo.clock) });
      const submissionArtifactId = typeof submissionRow.artifact_id === "string" ? submissionRow.artifact_id : "";
      if (!submissionArtifactId) throw new Error("submission has no source artifact; refusing to store uploaded evaluation lineage");
      const artifact = await store.putText(JSON.stringify(evaluation), { source: "claude-code-assisted-transcription", kind: "evaluation", evaluationId: evaluation.id, requiresHumanReview: true });
      await store.addLineageEdge(submissionArtifactId, artifact.id, "evaluated-from");
      const tx = db.transaction(() => { repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata }); repo.addArtifactEdge({ parentArtifactId: submissionArtifactId, childArtifactId: artifact.id, relation: "evaluated-from" }); repo.recordEvaluation({ evaluation }); });
      tx();
      return { evaluation, artifact, requiresHumanReview: true };
    },
    async confirmEvaluation(input) {
      const originalRow = db.prepare("SELECT evaluation_json FROM evaluations WHERE id = ?").get(input.evaluationId) as { evaluation_json: string } | undefined;
      if (!originalRow) throw new Error(`evaluation not found: ${input.evaluationId}`);
      const original = EvaluationSchema.parse(JSON.parse(originalRow.evaluation_json));
      requirePendingEvaluation(original);
      const proposalArtifact = await store.findById(`artifact-${requireShaForEvaluation(original)}`);
      if (!proposalArtifact) throw new Error("evaluation proposal artifact not found; cannot confirm without lineage");
      const submissionRow = db.prepare("SELECT * FROM submissions WHERE id = ?").get(original.submissionId) as Record<string, unknown> | undefined;
      if (!submissionRow) throw new Error(`submission not found: ${original.submissionId}`);
      const activityRow = db.prepare("SELECT * FROM activities WHERE id = ?").get(String(submissionRow.activity_id)) as Record<string, unknown> | undefined;
      if (!activityRow) throw new Error("activity for evaluation submission not found");
      const activity = ActivitySpecSchema.parse(parseJson(activityRow.specification_json, {}));
      const at = iso(input.now, service.repo.clock);
      const confirmed = EvaluationSchema.parse({
        ...original,
        id: `${original.id}:confirmed:${input.reviewerId}`,
        evaluatorType: "human",
        status: "final",
        score: input.score,
        confidence: 1,
        evidence: [...original.evidence, `adult-reviewer:${input.reviewerId}`],
        followUp: { required: false, recommendedActivityIds: [] },
        version: `${original.version}:confirmed`,
        supersedesEvaluationId: original.id,
        evaluatedAt: at,
        items: [{ itemId: "adult-reviewed-overall", score: input.score, mistakeTags: [], evidenceStatus: "confirmed", rationale: input.rationale }],
      });
      const event = progressEventsFromEvaluation(confirmed, activity, at);
      const state = stateFromRow(confirmed.studentId, confirmed.conceptId, repo.getConceptState(confirmed.studentId, confirmed.conceptId), at);
      const events = repo.history(confirmed.studentId, confirmed.conceptId).map(rowProgressEvent);
      const projection = projectProgression(state, [...events, event]);
      let nextState = projectStudentConceptState(state, [...events, event]);
      const conceptDefinition = registry.concepts.get(activity.conceptId);
      if (conceptDefinition && conceptIsSecure(conceptDefinition, [nextState], [...events, event])) nextState = { ...nextState, status: "secure" };
      const artifact = await store.putText(JSON.stringify(confirmed), { source: "human-confirmed-evaluation", kind: "evaluation", evaluationId: confirmed.id, confirmedFrom: original.id });
      await store.addLineageEdge(proposalArtifact.id, artifact.id, "corrected-from");
      const tx = db.transaction(() => {
        repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata });
        repo.addArtifactEdge({ parentArtifactId: proposalArtifact.id, childArtifactId: artifact.id, relation: "corrected-from" });
        repo.recordEvaluation({ evaluation: confirmed });
        for (const item of confirmed.items) repo.recordEvidence({ id: `evidence-${confirmed.id}-${item.itemId}`, evaluationId: confirmed.id, conceptId: confirmed.conceptId, evidenceType: "human-confirmed-review", value: item });
        repo.appendProgressEvent({ event, previousState: stateSnapshot(state), newState: stateSnapshot(nextState), policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: projection.reason, sourceType: "human-confirmation", sourceId: confirmed.id });
        repo.saveConceptState({ studentId: nextState.studentId, conceptId: nextState.conceptId, step: nextState.step, status: nextState.status, recentScores: nextState.recentScores, confidence: event.confidence, observationCount: nextState.recentScores.length, correctCount: nextState.recentScores.filter((score) => score >= 0.9).length, lastEventAt: nextState.lastEvidenceAt, mastery: nextState.recentScores.at(-1), state: { decision: projection.decision, reason: projection.reason, confirmedFrom: original.id } });
      });
      tx();
      if (activity.activityType === "assessment") refreshBaselineStatus(confirmed.studentId);
      const roadmapUpdate = await service.reconcileLearningRoadmaps(confirmed.studentId, "confirmed-human-review", confirmed.id);
      let unlockedActivity: Record<string, unknown> | undefined;
      const projected = service.getLearningRoadmaps(confirmed.studentId, true) as { roadmaps: LearnerRoadmap[] };
      const frontier = projected.roadmaps.flatMap((roadmap) => roadmap.nodes.filter((node) => roadmap.frontierNodeIds.includes(node.id) && node.branchKind !== "review"));
      const existingActivities = repo.listActivities(confirmed.studentId).map((row) => ActivitySpecSchema.parse(parseJson(row.specification_json, {})));
      const target = frontier.find((node) => !existingActivities.some((candidate) => registry.activityMatchesActiveRevision(candidate) && candidate.conceptId === node.conceptId && candidate.representationStage === node.stage));
      if (target) {
        try {
          const seed = Number.parseInt(createHash("sha256").update(`${confirmed.id}:${target.conceptId}:${target.stage}`).digest("hex").slice(0, 8), 16);
          unlockedActivity = await service.validateAndStoreActivity(service.generateActivity({ conceptId: target.conceptId, studentId: confirmed.studentId, seed, itemCount: 5, representationStage: target.stage, difficultyLevel: nextState.step, now: confirmed.evaluatedAt }));
        } catch { /* The roadmap remains visible even when a new template still needs adult authoring. */ }
      }
      return { originalEvaluationId: original.id, evaluation: confirmed, artifact, progress: { ...projection, state: nextState }, roadmapUpdate, ...(unlockedActivity ? { unlockedActivity } : {}) };
    },
    async rejectEvaluation(input) {
      const originalRow = db.prepare("SELECT evaluation_json FROM evaluations WHERE id = ?").get(input.evaluationId) as { evaluation_json: string } | undefined;
      if (!originalRow) throw new Error(`evaluation not found: ${input.evaluationId}`);
      const original = EvaluationSchema.parse(JSON.parse(originalRow.evaluation_json));
      requirePendingEvaluation(original);
      const proposalArtifact = await store.findById(`artifact-${requireShaForEvaluation(original)}`);
      if (!proposalArtifact) throw new Error("evaluation proposal artifact not found; cannot reject without lineage");
      const at = iso(input.now, service.repo.clock);
      const rejected = EvaluationSchema.parse({ ...original, id: `${original.id}:rejected:${input.reviewerId}`, evaluatorType: "human", status: "superseded", confidence: 1, supersedesEvaluationId: original.id, followUp: { required: true, reason: input.reason, recommendedActivityIds: [] }, version: `${original.version}:rejected`, evaluatedAt: at, items: original.items.map((item) => ({ ...item, evidenceStatus: "ambiguous", rationale: input.reason })) });
      const reviewEvent: ProgressEvent = { id: `progress-review-${rejected.id}`, studentId: original.studentId, conceptId: original.conceptId, eventType: "review", comparable: false, evidenceStatus: "confirmed", confidence: 1, reason: input.reason, occurredAt: at };
      const artifact = await store.putText(JSON.stringify({ rejectedEvaluation: rejected, reason: input.reason, reviewerId: input.reviewerId }), { source: "human-rejected-evaluation", kind: "evaluation-review", evaluationId: rejected.id, rejectedFrom: original.id });
      await store.addLineageEdge(proposalArtifact.id, artifact.id, "corrected-from");
      const tx = db.transaction(() => {
        repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata });
        repo.addArtifactEdge({ parentArtifactId: proposalArtifact.id, childArtifactId: artifact.id, relation: "corrected-from" });
        repo.recordEvaluation({ evaluation: rejected });
        repo.appendProgressEvent({ event: reviewEvent, policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: input.reason, sourceType: "human-rejection", sourceId: rejected.id });
      });
      tx();
      return { originalEvaluationId: original.id, evaluation: rejected, artifact, reviewEvent, originalUnchanged: true, gradedStateChanged: false };
    },
    getProgress(studentId, conceptId) {
      if (!repo.getStudent(studentId)) throw new Error(`student not found: ${studentId}`);
      const states = (conceptId ? [repo.getConceptState(studentId, conceptId)] : (db.prepare("SELECT * FROM student_concept_state WHERE student_id = ?").all(studentId) as Record<string, unknown>[])).filter(Boolean).map((row) => ({ studentId, conceptId: String(row!.concept_id), step: Number(row!.step), status: String(row!.status), recentScores: parseJson<number[]>(row!.recent_scores_json, []), updatedAt: String(row!.updated_at), lastEvidenceAt: row!.last_event_at ? String(row!.last_event_at) : undefined }));
      return { studentId, conceptId, states, history: repo.progressHistory(studentId, conceptId), policy: DEFAULT_PROGRESSION_POLICY };
    },
    getLearningPath(studentId) {
      const studentRow = repo.getStudent(studentId);
      if (!studentRow) throw new Error(`student not found: ${studentId}`);
      const student = rowStudent(studentRow);
      const progress = service.getProgress(studentId);
      const events = repo.progressHistory(studentId).map(rowProgressEvent);
      const directiveRows = db.prepare("SELECT * FROM human_overrides WHERE student_id = ? ORDER BY created_at, rowid").all(studentId) as Record<string, unknown>[];
      const now = clock();
      const directives = activeLearningDirectives(directiveRows, now);
      const availability = deriveConceptAvailability({ definitions: registry.definitions(), states: progress.states as StudentConceptState[], events, directives, now }).filter((concept) => student.selectedSubjects.length === 0 || student.selectedSubjects.includes(concept.subject));
      return { studentId, curriculumVersion: registry.revisions.map((revision) => revision.id).join("+"), availability, directives, gradeIsContextOnly: true };
    },
    listCurriculum() {
      return { activeRevisions: registry.revisions, subjects: [...registry.subjects.values()], proposals: repo.listCurriculumProposals() };
    },
    getCurriculumGraph(subject) {
      const concepts = [...registry.concepts.values()].filter((concept) => !subject || concept.subject === subject);
      const ids = new Set(concepts.map((concept) => concept.id));
      const edges = registry.revisions.flatMap((revision) => revision.edges).filter((edge) => ids.has(edge.from) && ids.has(edge.to));
      return { revisions: registry.revisions.map((revision) => ({ id: revision.id, packId: revision.packId, revision: revision.revision, title: revision.title })), subjects: [...registry.subjects.values()].filter((entry) => !subject || entry.id === subject), concepts, edges };
    },
    getLearningRoadmaps(studentId, adult = true) {
      const studentRow = repo.getStudent(studentId);
      if (!studentRow) throw new Error(`student not found: ${studentId}`);
      const student = rowStudent(studentRow);
      const progress = service.getProgress(studentId);
      const events = repo.progressHistory(studentId).map(rowProgressEvent);
      const directiveRows = db.prepare("SELECT * FROM human_overrides WHERE student_id = ? ORDER BY created_at, rowid").all(studentId) as Record<string, unknown>[];
      const now = clock();
      const roadmaps = projectLearnerRoadmaps({ studentId, registry, states: progress.states as StudentConceptState[], events, directives: activeLearningDirectives(directiveRows, now), now }).filter((roadmap) => student.selectedSubjects.length === 0 || student.selectedSubjects.includes(roadmap.subject));
      return { studentId, audience: adult ? "adult" : "child", roadmaps: adult ? roadmaps : roadmaps.map(toChildLearnerRoadmap) };
    },
    async reconcileLearningRoadmaps(studentId, triggerType = "manual", triggerId) {
      const projected = service.getLearningRoadmaps(studentId, true) as { roadmaps: LearnerRoadmap[] };
      const stored: LearnerRoadmap[] = [];
      for (const roadmap of projected.roadmaps) {
        const artifact = await store.put(JSON.stringify(roadmap), { mediaType: "application/json", fileExtension: ".json", metadata: { kind: "roadmap-revision", studentId, subject: roadmap.subject } });
        const tx = db.transaction(() => {
          repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata });
          repo.saveLearnerRoadmap(roadmap, { artifactId: artifact.id, source: triggerType, reason: `Roadmap reconciled after ${triggerType}.` });
        });
        tx();
        stored.push(roadmap);
      }
      repo.recordRoadmapReconciliation({ id: `reconcile-${studentId}-${randomUUID()}`, studentId, triggerType, ...(triggerId ? { triggerId } : {}), result: { roadmapIds: stored.map((roadmap) => roadmap.id) } });
      return { studentId, roadmaps: stored };
    },
    async proposeCurriculumRevision(input) {
      const at = iso(input.createdAt, clock);
      const revision = CurriculumPackRevisionSchema.parse({ ...input.revision, createdAt: input.revision.createdAt ?? at });
      const previous = registry.revisions.find((candidate) => candidate.packId === revision.packId);
      if (previous) {
        const nextIds = new Set(revision.concepts.map((concept) => concept.id));
        const removed = previous.concepts.filter((concept) => !nextIds.has(concept.id));
        if (removed.length > 0) throw new Error(`curriculum revisions cannot remove existing concepts: ${removed.map((concept) => concept.id).join(", ")}`);
        if (revision.revision <= previous.revision) throw new Error(`curriculum revision number must be greater than ${previous.revision}`);
      }
      new CurriculumRegistry([...registry.revisions.filter((candidate) => candidate.packId !== revision.packId), revision], registryOptions);
      const proposal = CurriculumRevisionProposalSchema.parse({ id: input.id ?? `curriculum-proposal-${randomUUID()}`, revision, rationale: input.rationale, basedOnRevisionIds: input.basedOnRevisionIds, affectedStudentIds: input.affectedStudentIds, createdBy: input.createdBy, createdAt: at });
      const revisionArtifact = await store.put(JSON.stringify(revision), { mediaType: "application/json", fileExtension: ".json", metadata: { kind: "curriculum-revision", revisionId: revision.id, packId: revision.packId } });
      const proposalArtifact = await store.put(JSON.stringify(proposal), { mediaType: "application/json", fileExtension: ".json", metadata: { kind: "curriculum-proposal", proposalId: proposal.id, revisionId: revision.id } });
      await store.addLineageEdge(revisionArtifact.id, proposalArtifact.id, "proposed-from");
      const tx = db.transaction(() => {
        for (const artifact of [revisionArtifact, proposalArtifact]) repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata });
        repo.addArtifactEdge({ parentArtifactId: revisionArtifact.id, childArtifactId: proposalArtifact.id, relation: "proposed-from" });
        repo.saveCurriculumRevision(revision, revisionArtifact.sha256, revisionArtifact.id);
        repo.saveCurriculumProposal(proposal, proposalArtifact.id);
      });
      tx();
      return { proposal, validation: { valid: true, addedConceptIds: revision.concepts.filter((concept) => !previous?.concepts.some((entry) => entry.id === concept.id)).map((concept) => concept.id), affectedStudentIds: proposal.affectedStudentIds }, artifacts: { revision: revisionArtifact, proposal: proposalArtifact } };
    },
    decideCurriculumRevision(input) {
      const proposal = repo.getCurriculumProposal(input.proposalId);
      if (!proposal) throw new Error(`curriculum proposal not found: ${input.proposalId}`);
      if (db.prepare("SELECT 1 FROM curriculum_decisions WHERE proposal_id = ? LIMIT 1").get(input.proposalId)) throw new Error("curriculum proposal has already been reviewed");
      const decision = CurriculumRevisionDecisionSchema.parse({ id: `curriculum-decision-${randomUUID()}`, proposalId: proposal.id, revisionId: proposal.revision.id, decision: input.decision, reviewerId: input.reviewerId, note: input.note, createdAt: iso(input.now, clock) });
      return repo.saveCurriculumDecision(decision);
    },
    async activateCurriculumRevision(input) {
      const action = input.action ?? "activate";
      let revision: CurriculumPackRevision;
      if (action === "rollback") {
        if (!input.revisionId) throw new Error("rollback requires the previously active revisionId to restore");
        const target = repo.getCurriculumRevision(input.revisionId);
        if (!target) throw new Error(`curriculum revision not found: ${input.revisionId}`);
        if (!db.prepare("SELECT 1 FROM curriculum_activations WHERE revision_id = ? LIMIT 1").get(target.id)) throw new Error("rollback can restore only a previously active revision");
        revision = target;
      } else {
        if (!input.proposalId) throw new Error("activation requires a curriculum proposalId");
        const proposal = repo.getCurriculumProposal(input.proposalId);
        if (!proposal) throw new Error(`curriculum proposal not found: ${input.proposalId}`);
        const decisionRow = db.prepare("SELECT decision_json FROM curriculum_decisions WHERE proposal_id = ? ORDER BY created_at DESC,rowid DESC LIMIT 1").get(proposal.id) as { decision_json: string } | undefined;
        const decision = decisionRow ? CurriculumRevisionDecisionSchema.parse(JSON.parse(decisionRow.decision_json)) : undefined;
        if (decision?.decision !== "approved") throw new Error("curriculum revision requires explicit adult approval before activation");
        revision = proposal.revision;
      }
      const activation = CurriculumActivationSchema.parse({ id: `curriculum-activation-${randomUUID()}`, packId: revision.packId, revisionId: revision.id, action, actorId: input.actorId, reason: input.reason, createdAt: iso(input.now, clock) });
      repo.saveCurriculumActivation(activation);
      reloadRegistry();
      const reconciled = [];
      for (const student of repo.listStudents()) reconciled.push(await service.reconcileLearningRoadmaps(String(student.id), "curriculum-activation", activation.id));
      return { activation, activeRevisionIds: registry.revisions.map((revision) => revision.id), reconciled };
    },
    async applyLearningDirective(input) {
      const serviceOperationKey = input.operationKey ? `${input.operationKey}:service-result` : undefined;
      if (serviceOperationKey) { const prior = repo.operationResult(serviceOperationKey); if (prior) return prior; }
      if (!repo.getStudent(input.studentId)) throw new Error(`student not found: ${input.studentId}`);
      const concept = registry.concepts.get(input.conceptId);
      if (!concept) throw new Error(`curriculum concept not found: ${input.conceptId}`);
      if (input.requestedStage && !concept.stages.some((stage) => stage.stage === input.requestedStage)) throw new Error(`${input.conceptId} does not define the requested ${input.requestedStage} stage`);
      const directive = LearningDirectiveSchema.parse({ ...input, createdAt: clock() });
      const tx = db.transaction(() => {
        const row = repo.saveOverride({ id: directive.id, studentId: directive.studentId, conceptId: directive.conceptId, targetType: "concept-plan", targetId: directive.conceptId, originalDecision: "preserved", decision: directive.action, reason: directive.reason, actor: directive.authorId, override: directive as unknown as Record<string, unknown>, ...(input.operationKey ? { operationKey: input.operationKey } : {}) });
        return { directive, row };
      });
      const saved = tx();
      const roadmapUpdate = await service.reconcileLearningRoadmaps(input.studentId, "learning-directive", directive.id);
      const result = { ...saved, learningPath: service.getLearningPath(input.studentId), roadmapUpdate };
      if (serviceOperationKey) repo.saveOperationResult(serviceOperationKey, "learning-directive-service", result);
      return result;
    },
    async recommendNextActivity(studentId, options = {}) {
      const recommendationNow = options.now ?? clock();
      const projected = service.getLearningRoadmaps(studentId, true) as { roadmaps: LearnerRoadmap[] };
      const roadmapCandidates = projected.roadmaps.filter((roadmap) => !options.preferredSubject || roadmap.subject === options.preferredSubject).flatMap((roadmap) => roadmap.nodes.filter((node) => roadmap.frontierNodeIds.includes(node.id) && node.status !== "locked" && node.status !== "deferred"));
      let rows = repo.listActivities(studentId).map((row) => ActivitySpecSchema.parse(parseJson(row.specification_json, {}))).filter((activity) => registry.activityMatchesActiveRevision(activity));
      for (const node of roadmapCandidates) {
        if (rows.some((activity) => activity.conceptId === node.conceptId && activity.representationStage === node.stage)) continue;
        try {
          const seed = Number.parseInt(createHash("sha256").update(`${studentId}:${node.conceptId}:${node.stage}:${recommendationNow}`).digest("hex").slice(0, 8), 16);
          const stored = await service.validateAndStoreActivity(service.generateActivity({ studentId, conceptId: node.conceptId, representationStage: node.stage, difficultyLevel: Number((service.getProgress(studentId, node.conceptId).states as Array<{ step: number }>)[0]?.step ?? 0), seed, itemCount: 5, now: recommendationNow }));
          rows = [...rows, stored.activity as ActivitySpec];
        } catch { /* Curriculum can expose a roadmap node before an adult supplies its first approved template. */ }
      }
      const progress = service.getProgress(studentId);
      const events = repo.progressHistory(studentId).map(rowProgressEvent);
      const directiveRows = db.prepare("SELECT * FROM human_overrides WHERE student_id = ? ORDER BY created_at, rowid").all(studentId) as Record<string, unknown>[];
      const directives = activeLearningDirectives(directiveRows, recommendationNow);
      const availability = deriveConceptAvailability({ definitions: registry.definitions(), states: progress.states as StudentConceptState[], events, directives, now: recommendationNow });
      const eligibleRows = filterAvailableActivities(rows, availability);
      const recentActivities = service.db.prepare(`SELECT a.id, a.subject, a.concept_id FROM submissions s JOIN activities a ON a.id = s.activity_id WHERE s.student_id = ? ORDER BY s.submitted_at DESC LIMIT 5`).all(studentId) as Array<{ id: string; subject: ActivitySpec["subject"]; concept_id: string }>;
      const overrides = activeHumanOverrides(directiveRows);
      const prioritizedConceptIds = directives.filter((directive) => directive.action === "prioritize" || directive.action === "assess").map((directive) => directive.conceptId);
      const adultGoalConceptIds = [...new Set([...(options.adultGoalConceptIds ?? []), ...prioritizedConceptIds])];
      const recommendation = rankRecommendations(eligibleRows, {
        studentId,
        recommendationId: `recommendation-${studentId}-${randomUUID()}`,
        now: recommendationNow,
        states: progress.states as never[],
        events,
        overrides,
        recentActivities: recentActivities.map((activity) => ({ id: activity.id, subject: activity.subject, conceptId: activity.concept_id })),
        ...(options.availableMinutes === undefined ? {} : { availableMinutes: options.availableMinutes }),
        ...(options.preferredSubject === undefined ? {} : { preferredSubject: options.preferredSubject }),
        ...(adultGoalConceptIds.length === 0 ? {} : { adultGoalConceptIds }),
      });
      const row = repo.saveRecommendation({ recommendation });
      return { recommendation, row, availability };
    },
    getTimeline: (studentId) => repo.timeline(studentId),
    async getArtifactLineage(artifactId) {
      const artifact = await store.findById(artifactId);
      if (!artifact) throw new Error(`artifact not found: ${artifactId}`);
      const parents = db.prepare("SELECT parent_artifact_id AS parentArtifactId, child_artifact_id AS childArtifactId, relation, created_at AS createdAt FROM artifact_edges WHERE child_artifact_id = ? ORDER BY created_at, parent_artifact_id").all(artifactId) as Record<string, unknown>[];
      const children = db.prepare("SELECT parent_artifact_id AS parentArtifactId, child_artifact_id AS childArtifactId, relation, created_at AS createdAt FROM artifact_edges WHERE parent_artifact_id = ? ORDER BY created_at, child_artifact_id").all(artifactId) as Record<string, unknown>[];
      return { artifact, parents, children, authoritativeSource: "sqlite" };
    },
    applyOverride(input) {
      const serviceOperationKey = input.operationKey ? `${input.operationKey}:service-result` : undefined;
      if (serviceOperationKey) {
        const prior = repo.operationResult(serviceOperationKey);
        if (prior) return prior;
      }
      const at = clock();
      HumanOverrideSchema.parse({ id: input.id, studentId: input.studentId, conceptId: input.conceptId, targetStep: input.targetStep, reason: input.reason, authorId: input.authorId, createdAt: at });
      const state = stateFromRow(input.studentId, input.conceptId, repo.getConceptState(input.studentId, input.conceptId), at);
      const nextState = { ...state, step: input.targetStep, updatedAt: at };
      const overrideRowInput = { id: input.id, studentId: input.studentId, conceptId: input.conceptId, targetStep: input.targetStep, targetType: "concept-state", targetId: input.targetId ?? input.conceptId, originalDecision: "preserved", decision: "applied", reason: input.reason, actor: input.authorId, override: { appendOnly: true, previousState: stateSnapshot(state), appliedState: stateSnapshot(nextState) }, ...(input.operationKey ? { operationKey: input.operationKey } : {}) };
      const event: ProgressEvent = { id: `progress-override-${input.id}`, studentId: input.studentId, conceptId: input.conceptId, eventType: "human-override", comparable: false, evidenceStatus: "confirmed", confidence: 1, previousState: stateSnapshot(state), newState: stateSnapshot(nextState), policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: input.reason, occurredAt: at };
      const tx = db.transaction(() => {
        const saved = repo.saveOverride(overrideRowInput);
        repo.appendProgressEvent({ event, previousState: stateSnapshot(state), newState: stateSnapshot(nextState), policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: input.reason, sourceType: "human-override", sourceId: input.id, ...(input.operationKey ? { operationKey: `${input.operationKey}:progress` } : {}) });
        repo.saveConceptState({ studentId: input.studentId, conceptId: input.conceptId, step: nextState.step, status: nextState.status, recentScores: nextState.recentScores, confidence: 1, observationCount: nextState.recentScores.length, correctCount: nextState.recentScores.filter((score) => score >= 0.9).length, lastEventAt: at, mastery: nextState.recentScores.at(-1), state: { overrideId: input.id, reason: input.reason } });
        const result = { ...saved, override: saved, event, previousState: stateSnapshot(state), newState: stateSnapshot(nextState) };
        if (serviceOperationKey) repo.saveOperationResult(serviceOperationKey, "human-override-service", result);
        return result;
      });
      return tx();
    },
    reverseOverride(input) {
      const serviceOperationKey = input.operationKey ? `${input.operationKey}:service-result` : undefined;
      if (serviceOperationKey) {
        const prior = repo.operationResult(serviceOperationKey);
        if (prior) return prior;
      }
      const original = db.prepare("SELECT * FROM human_overrides WHERE id = ?").get(input.targetId) as Record<string, unknown> | undefined;
      if (!original) throw new Error(`override not found: ${input.targetId}`);
      if (String(original.student_id) !== input.studentId || String(original.concept_id) !== input.conceptId) throw new Error("override student or concept does not match the original override");
      const originalPayload = parseJson<{ previousState?: { step: number; status: StudentConceptState["status"] } }>(original.override_json, {});
      const restored = originalPayload.previousState ?? { step: 0, status: "new" as const };
      const at = clock();
      const state = stateFromRow(input.studentId, input.conceptId, repo.getConceptState(input.studentId, input.conceptId), at);
      const event: ProgressEvent = { id: `progress-override-${input.id}`, studentId: input.studentId, conceptId: input.conceptId, eventType: "human-override", comparable: false, evidenceStatus: "confirmed", confidence: 1, previousState: stateSnapshot(state), newState: restored, policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: input.reason, occurredAt: at };
      const overrideRowInput = { id: input.id, studentId: input.studentId, conceptId: input.conceptId, targetType: "override", targetId: input.targetId, originalDecision: "applied", decision: "reversed", reason: input.reason, actor: input.authorId, override: { appendOnly: true, restoresOverrideId: input.targetId, restoredState: restored }, ...(input.operationKey ? { operationKey: input.operationKey } : {}) };
      const tx = db.transaction(() => {
        const saved = repo.saveOverride(overrideRowInput);
        repo.appendProgressEvent({ event, previousState: stateSnapshot(state), newState: restored, policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: input.reason, sourceType: "human-override-reversal", sourceId: input.id, ...(input.operationKey ? { operationKey: `${input.operationKey}:progress` } : {}) });
        repo.saveConceptState({ studentId: input.studentId, conceptId: input.conceptId, step: restored.step, status: restored.status, recentScores: state.recentScores, confidence: 1, observationCount: state.recentScores.length, lastEventAt: at, mastery: state.recentScores.at(-1), state: { reversedOverrideId: input.targetId, reason: input.reason } });
        const result = { ...saved, override: saved, event, previousState: stateSnapshot(state), newState: restored, restoresOverrideId: input.targetId };
        if (serviceOperationKey) repo.saveOperationResult(serviceOperationKey, "human-override-reversal-service", result);
        return result;
      });
      return tx();
    },
    async generateProgressReport(studentId, now) {
      const reportNow = iso(now, service.repo.clock);
      const progress = service.getProgress(studentId);
      const states = progress.states as ReportSnapshot["conceptStates"];
      const history = repo.progressHistory(studentId).map(rowProgressEvent);
      const evidence = states.map((state) => {
        const conceptEvents = history.filter((event) => event.conceptId === state.conceptId);
        const trend = recentTrend(conceptEvents);
        return { conceptId: state.conceptId, recentScores: state.recentScores, trend: trend.direction, evidenceCount: conceptEvents.filter((event) => event.eventType === "observation" && event.evidenceStatus === "confirmed").length };
      });
      const directiveRows = db.prepare("SELECT * FROM human_overrides WHERE student_id = ? ORDER BY created_at, rowid").all(studentId) as Record<string, unknown>[];
      const directives = activeLearningDirectives(directiveRows, reportNow);
      const availability = deriveConceptAvailability({ definitions: registry.definitions(), states, events: history, directives, now: reportNow });
      const roadmapUpdate = await service.reconcileLearningRoadmaps(studentId, "progress-report");
      const roadmapRevisionIds = (roadmapUpdate.roadmaps as LearnerRoadmap[]).map((roadmap) => roadmap.id);
      const strengths = availability.filter((concept) => concept.status === "secure").map((concept) => concept.conceptId);
      const needsPractice = states.filter((state) => {
        if (state.status === "revisit") return true;
        const recent = state.recentScores.slice(-3);
        return recent.length >= 2 && recent.reduce((sum, score) => sum + score, 0) / recent.length < 0.75;
      }).map((state) => state.conceptId);
      const activities = repo.listActivities(studentId).map((row) => ActivitySpecSchema.parse(parseJson(row.specification_json, {}))).filter((activity) => registry.activityMatchesActiveRevision(activity));
      const eligibleActivities = filterAvailableActivities(activities, availability);
      const recentActivityRows = db.prepare(`SELECT a.id, a.subject, a.concept_id FROM submissions s JOIN activities a ON a.id = s.activity_id WHERE s.student_id = ? ORDER BY s.submitted_at DESC LIMIT 5`).all(studentId) as Array<{ id: string; subject: ActivitySpec["subject"]; concept_id: string }>;
      const overrides = activeHumanOverrides(directiveRows);
      const prioritizedConceptIds = directives.filter((directive) => directive.action === "prioritize" || directive.action === "assess").map((directive) => directive.conceptId);
      const recommendation = rankRecommendations(eligibleActivities, { studentId, now: reportNow, states, events: history, overrides, adultGoalConceptIds: prioritizedConceptIds, recentActivities: recentActivityRows.map((activity) => ({ id: activity.id, subject: activity.subject, conceptId: activity.concept_id })) });
      const recommendedNextSteps = recommendation.selectedActivityId ? [recommendation.conciseReason] : [];
      const worksheetRows = db.prepare(`
        SELECT s.id AS submission_id, s.activity_id, s.submitted_at, a.title, a.subject, a.concept_id, a.specification_json,
          e.id AS evaluation_id, e.outcome, e.evaluation_json
        FROM submissions s
        JOIN activities a ON a.id = s.activity_id
        LEFT JOIN evaluations e ON e.id = (
          SELECT candidate.id FROM evaluations candidate
          WHERE candidate.submission_id = s.id
          ORDER BY CASE candidate.outcome WHEN 'final' THEN 0 WHEN 'needs-human-review' THEN 1 ELSE 2 END, candidate.evaluated_at DESC, candidate.id DESC
          LIMIT 1
        )
        WHERE s.student_id = ?
        ORDER BY s.submitted_at DESC, s.id DESC
        LIMIT 20
      `).all(studentId) as Record<string, unknown>[];
      const worksheetSummaries = worksheetRows.map((row) => {
        const activity = ActivitySpecSchema.parse(parseJson(row.specification_json, {}));
        const evaluationResult = row.evaluation_json ? EvaluationSchema.safeParse(parseJson(row.evaluation_json, {})) : undefined;
        const evaluation = evaluationResult?.success ? evaluationResult.data : undefined;
        return {
          submissionId: String(row.submission_id), activityId: String(row.activity_id), title: String(row.title), subject: activity.subject, conceptId: String(row.concept_id), submittedAt: String(row.submitted_at),
          ...(evaluation ? { evaluationId: evaluation.id, score: evaluation.score, correctItems: evaluation.items.filter((item) => item.evidenceStatus === "confirmed" && item.score === 1).length } : {}),
          status: evaluation?.status ?? "not-evaluated" as const,
          totalItems: activity.items.length,
        };
      });
      const summary = states.length === 0
        ? "No concept evidence has been recorded yet."
        : `${strengths.length} strength area${strengths.length === 1 ? "" : "s"}, ${needsPractice.length} area${needsPractice.length === 1 ? "" : "s"} needing practice. ${recommendation.conciseReason}`;
      const report = ReportSnapshotSchema.parse({ id: `report-${studentId}-${randomUUID()}`, studentId, asOf: iso(now, service.repo.clock), conceptStates: states, evidence, strengths, needsPractice, recommendedNextSteps, worksheetSummaries, learningPath: availability, roadmapRevisionIds, recommendation, summary });
      const artifact = await store.putText(JSON.stringify(report), { source: "local-progress-report", kind: "report-snapshot", studentId });
      const evaluationSupports = db.prepare(`SELECT a.id FROM artifacts a JOIN evaluations e ON json_extract(a.metadata_json, '$.evaluationId') = e.id JOIN submissions s ON s.id = e.submission_id WHERE s.student_id = ?`).all(studentId) as Array<{ id: string }>;
      const rawProgress = repo.progressHistory(studentId);
      const progressSupports = await Promise.all(rawProgress.map((row) => store.putText(JSON.stringify(row), { source: "progress-history", kind: "progress-event", studentId, progressEventId: row.id })));
      const overrideSupports = await Promise.all(directiveRows.map((row) => store.putText(JSON.stringify(row), { source: "adult-history", kind: "override", studentId, overrideId: row.id })));
      const roadmapSupports = roadmapRevisionIds.length > 0 ? db.prepare(`SELECT artifact_id AS id FROM learner_roadmap_revisions WHERE id IN (${roadmapRevisionIds.map(() => "?").join(",")}) AND artifact_id IS NOT NULL`).all(...roadmapRevisionIds) as Array<{ id: string }> : [];
      const supportingArtifacts = [...evaluationSupports.map((supporting) => supporting.id), ...progressSupports.map((supporting) => supporting.id), ...overrideSupports.map((supporting) => supporting.id), ...roadmapSupports.map((supporting) => supporting.id)];
      for (const supportingId of new Set(supportingArtifacts)) await store.addLineageEdge(supportingId, artifact.id, "supports");
      const tx = db.transaction(() => {
        repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata });
        for (const supporting of [...progressSupports, ...overrideSupports]) repo.recordArtifact({ id: supporting.id, sha256: supporting.sha256, mediaType: supporting.mediaType, byteLength: supporting.byteLength, relativePath: supporting.relativePath, metadata: supporting.metadata });
        for (const supportingId of new Set(supportingArtifacts)) repo.addArtifactEdge({ parentArtifactId: supportingId, childArtifactId: artifact.id, relation: "supports" });
        repo.saveReportSnapshot({ report: { ...report, artifactId: artifact.id }, artifactId: artifact.id });
      });
      tx();
      return { report: { ...report, artifactId: artifact.id }, artifact, recommendation };
    },
    async composeVisualAsset(input) {
      const width = boundedInt(input.width ?? 640, 1, 2000); const height = boundedInt(input.height ?? 480, 1, 2000);
      const shapes = input.shapes.map((shape, index) => semanticSvgShape(shape, index, width, height));
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Original local learning visual</title>${shapes.join("")}</svg>`;
      const artifact = await store.put(svg, { ...(input.id ? { id: input.id } : {}), mediaType: "image/svg+xml", fileExtension: ".svg", metadata: { ...(input.metadata ?? {}), source: "original-local-semantic-shapes", kind: "asset" } });
      const tx = db.transaction(() => repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata })); tx();
      return artifact;
    },
  };
  return service;
}

function boundedInt(value: number, min: number, max: number): number { if (!Number.isInteger(value) || value < min || value > max) throw new Error(`value must be an integer between ${min} and ${max}`); return value; }
function esc(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[char] ?? char); }
function semanticSvgShape(shape: Record<string, unknown>, index: number, width: number, height: number): string {
  const kind = shape.kind;
  const x = boundedInt(Number(shape.x ?? 0), 0, width); const y = boundedInt(Number(shape.y ?? 0), 0, height);
  const fill = /^[#a-zA-Z0-9(),.% -]+$/.test(String(shape.fill ?? "#2563eb")) ? String(shape.fill ?? "#2563eb") : "#2563eb";
  if (kind === "circle") return `<circle data-semantic="circle-${index}" cx="${x}" cy="${y}" r="${boundedInt(Number(shape.radius ?? 24), 1, 500)}" fill="${esc(fill)}"/>`;
  if (kind === "rectangle") return `<rect data-semantic="rectangle-${index}" x="${x}" y="${y}" width="${boundedInt(Number(shape.width ?? 48), 1, width)}" height="${boundedInt(Number(shape.height ?? 48), 1, height)}" rx="${boundedInt(Number(shape.radius ?? 0), 0, 100)}" fill="${esc(fill)}"/>`;
  if (kind === "text") return `<text data-semantic="text-${index}" x="${x}" y="${y}" font-family="sans-serif" font-size="${boundedInt(Number(shape.fontSize ?? 24), 8, 100)}" fill="${esc(fill)}">${esc(shape.text)}</text>`;
  if (kind === "line") return `<line data-semantic="line-${index}" x1="${x}" y1="${y}" x2="${boundedInt(Number(shape.x2 ?? x), 0, width)}" y2="${boundedInt(Number(shape.y2 ?? y), 0, height)}" stroke="${esc(fill)}" stroke-width="${boundedInt(Number(shape.strokeWidth ?? 3), 1, 30)}"/>`;
  throw new Error(`unsupported semantic shape kind: ${String(kind)}`);
}
