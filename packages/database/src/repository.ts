import { ActivitySpecSchema } from "@kindergarten/contracts";
import type { ActivitySpec, Evaluation, ProgressEvent, Recommendation, ReportSnapshot, Submission } from "@kindergarten/contracts";
import type { SqliteDatabase } from "./db.js";

export type JsonObject = Record<string, unknown>;
export type Clock = () => string;

export interface StudentInput {
  id: string;
  displayName: string;
  birthDate?: string;
  grade?: string;
  metadata?: JsonObject;
}

export interface ActivityInput {
  id: string;
  studentId: string;
  curriculumId?: string;
  subject?: ActivitySpec["subject"];
  conceptId?: string;
  title?: string;
  activityType?: string;
  specification: ActivitySpec;
  artifactId?: string;
}

export interface SubmissionInput {
  id: string;
  studentId: string;
  activityId: string;
  responses?: Submission["responses"];
  attemptNumber?: number;
  submittedAt?: string;
  artifactId?: string;
  payload?: JsonObject;
  operationKey?: string;
}

export interface EvaluationInput {
  evaluation: Evaluation;
  operationKey?: string;
}

export interface ProgressEventInput {
  event: ProgressEvent;
  previousState?: JsonObject;
  newState?: JsonObject;
  policyVersion?: string;
  reason?: string;
  sourceType?: string;
  sourceId?: string;
  value?: JsonObject;
  operationKey?: string;
}

export interface EvidenceInput {
  id: string;
  evaluationId: string;
  conceptId: string;
  evidenceType: string;
  value?: JsonObject;
}

export interface ConceptStateInput {
  studentId: string;
  conceptId: string;
  step?: number;
  status?: "new" | "learning" | "secure" | "revisit";
  recentScores?: number[];
  mastery?: number | undefined;
  confidence?: number | undefined;
  observationCount?: number | undefined;
  correctCount?: number | undefined;
  lastEventAt?: string | undefined;
  state?: JsonObject | undefined;
}

export interface RecommendationInput {
  recommendation: Recommendation;
  activityId?: string;
  reason?: string;
  rank?: number;
  expiresAt?: string;
  operationKey?: string;
}

export interface CandidateInput {
  id: string;
  recommendationId: string;
  activityId: string;
  rationale?: JsonObject;
}

export interface OverrideInput {
  id: string;
  studentId: string;
  conceptId?: string;
  targetStep?: number;
  targetType: string;
  targetId: string;
  originalDecision?: string;
  decision: string;
  reason: string;
  actor: string;
  override?: JsonObject;
  operationKey?: string;
}

export interface ReportSnapshotInput {
  report: ReportSnapshot;
  reportType?: string;
  artifactId?: string;
  content?: JsonObject;
  operationKey?: string;
}

export interface ArtifactRecordInput {
  id: string;
  sha256: string;
  mediaType: string;
  byteLength: number;
  relativePath: string;
  metadata?: JsonObject;
}

export interface ArtifactEdgeInput {
  parentArtifactId: string;
  childArtifactId: string;
  relation: string;
}

export interface TimelineEntry {
  kind: string;
  id: string;
  at: string;
  studentId: string;
  payload: JsonObject;
}

function json(value: JsonObject | undefined): string {
  return JSON.stringify(value ?? {});
}

function parse<T>(value: string): T {
  return JSON.parse(value) as T;
}

export class LearningRepository {
  readonly db: SqliteDatabase;
  readonly clock: Clock;

  constructor(db: SqliteDatabase, clock: Clock = () => new Date().toISOString()) {
    this.db = db;
    this.clock = clock;
  }

  getStudent(id: string): Record<string, unknown> | undefined {
    return this.db.prepare("SELECT * FROM students WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  }

  listStudents(): Record<string, unknown>[] {
    return this.db.prepare("SELECT * FROM students ORDER BY created_at, id").all() as Record<string, unknown>[];
  }

  saveStudent(input: StudentInput): Record<string, unknown> {
    const now = this.clock();
    this.db.prepare(`INSERT INTO students (id, display_name, birth_date, grade, created_at, updated_at, metadata_json)
      VALUES (@id, @displayName, @birthDate, @grade, @now, @now, @metadata)
      ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name, birth_date=excluded.birth_date,
        grade=excluded.grade, updated_at=excluded.updated_at, metadata_json=excluded.metadata_json`).run({
      id: input.id, displayName: input.displayName, birthDate: input.birthDate ?? null,
      grade: input.grade ?? null, now, metadata: json(input.metadata)
    });
    return this.getStudent(input.id) as Record<string, unknown>;
  }

  saveCurriculumMetadata(input: { id: string; subject: string; conceptId?: string; title: string; version?: string; metadata?: JsonObject }): void {
    const now = this.clock();
    this.db.prepare(`INSERT INTO curriculum_metadata (id, subject, concept_id, title, version, metadata_json, created_at, updated_at)
      VALUES (@id,@subject,@conceptId,@title,@version,@metadata,@now,@now)
      ON CONFLICT(id) DO UPDATE SET subject=excluded.subject, concept_id=excluded.concept_id, title=excluded.title,
      version=excluded.version, metadata_json=excluded.metadata_json, updated_at=excluded.updated_at`).run({
      ...input, conceptId: input.conceptId ?? null, version: input.version ?? "1", metadata: json(input.metadata), now
    });
  }

  listActivities(studentId?: string): Record<string, unknown>[] {
    if (!studentId) return this.db.prepare("SELECT * FROM activities ORDER BY created_at, id").all() as Record<string, unknown>[];
    return this.db.prepare("SELECT * FROM activities WHERE student_id = ? ORDER BY created_at, id").all(studentId) as Record<string, unknown>[];
  }

  saveActivity(input: ActivityInput): void {
    const specification = ActivitySpecSchema.parse(input.specification);
    if (specification.id !== input.id) throw new Error("activity id must match ActivitySpec.id");
    if (specification.studentId !== input.studentId) throw new Error("activity student_id must match ActivitySpec.studentId");
    const specificationJson = JSON.stringify(specification);
    const artifactId = input.artifactId ?? null;
    const result = this.db.prepare(`INSERT INTO activities (id,student_id,curriculum_id,subject,concept_id,title,activity_type,specification_json,artifact_id,created_at)
      VALUES (@id,@studentId,@curriculumId,@subject,@conceptId,@title,@activityType,@specification,@artifactId,@now)
      ON CONFLICT(id) DO NOTHING`).run({
      id: input.id, studentId: input.studentId, curriculumId: input.curriculumId ?? null,
      subject: specification.subject, conceptId: specification.conceptId, title: specification.title,
      activityType: specification.activityType, specification: specificationJson, artifactId, now: this.clock()
    });
    if (result.changes === 0) {
      const existing = this.db.prepare("SELECT student_id, specification_json, artifact_id FROM activities WHERE id = ?").get(input.id) as { student_id: string; specification_json: string; artifact_id: string | null } | undefined;
      if (!existing || existing.student_id !== input.studentId || existing.specification_json !== specificationJson || existing.artifact_id !== artifactId) throw new Error(`activity id conflicts with a different stored activity: ${input.id}`);
    }
  }

  recordArtifact(input: ArtifactRecordInput): void {
    this.db.prepare(`INSERT INTO artifacts (id,sha256,media_type,byte_length,relative_path,metadata_json,created_at)
      VALUES (@id,@sha256,@mediaType,@byteLength,@relativePath,@metadata,@now)
      ON CONFLICT(id) DO NOTHING`).run({ ...input, metadata: json(input.metadata), now: this.clock() });
  }

  addArtifactEdge(input: ArtifactEdgeInput): void {
    if (input.parentArtifactId === input.childArtifactId) throw new Error("artifact lineage cannot contain a self-edge");
    const reachable = this.db.prepare(`WITH RECURSIVE descendants(id) AS (
      SELECT child_artifact_id FROM artifact_edges WHERE parent_artifact_id = ?
      UNION
      SELECT e.child_artifact_id FROM artifact_edges e JOIN descendants d ON e.parent_artifact_id = d.id
    ) SELECT 1 FROM descendants WHERE id = ? LIMIT 1`).get(input.childArtifactId, input.parentArtifactId);
    if (reachable) throw new Error("artifact lineage edge would create a cycle");
    this.db.prepare(`INSERT OR IGNORE INTO artifact_edges (parent_artifact_id,child_artifact_id,relation,created_at)
      VALUES (@parentArtifactId,@childArtifactId,@relation,@now)`).run({ ...input, now: this.clock() });
  }

  recordSubmission(input: SubmissionInput): Record<string, unknown> {
    if (input.operationKey) {
      const prior = this.operationResult(input.operationKey);
      if (prior) return prior;
    }
    const payload = input.payload ?? (input.responses ? { responses: input.responses } : {});
    const row = this.db.prepare(`INSERT INTO submissions (id,student_id,activity_id,attempt_number,submitted_at,artifact_id,payload_json,operation_key)
      VALUES (@id,@studentId,@activityId,@attemptNumber,@submittedAt,@artifactId,@payload,@operationKey) RETURNING *`).get({
      ...input, attemptNumber: input.attemptNumber ?? 1, submittedAt: input.submittedAt ?? this.clock(),
      artifactId: input.artifactId ?? null, payload: json(payload), operationKey: input.operationKey ?? null
    }) as Record<string, unknown>;
    for (const response of input.responses ?? []) {
      this.recordResponse({ id: `${input.id}:${response.itemId}`, submissionId: input.id, itemKey: response.itemId, response: { value: response.value, capturedAt: response.capturedAt } });
    }
    this.saveOperation(input.operationKey, "submission", row);
    return row;
  }

  recordResponse(input: { id: string; submissionId: string; itemKey: string; response: JsonObject; createdAt?: string }): void {
    this.db.prepare(`INSERT OR IGNORE INTO responses (id,submission_id,item_key,response_json,created_at) VALUES (?,?,?,?,?)`).run(
      input.id, input.submissionId, input.itemKey, json(input.response), input.createdAt ?? this.clock());
  }

  listSubmissions(studentId: string): Record<string, unknown>[] {
    return this.db.prepare("SELECT * FROM submissions WHERE student_id = ? ORDER BY submitted_at, id").all(studentId) as Record<string, unknown>[];
  }

  listEvaluations(studentId: string): Record<string, unknown>[] {
    return this.db.prepare(`SELECT e.* FROM evaluations e JOIN submissions s ON s.id = e.submission_id WHERE s.student_id = ? ORDER BY e.evaluated_at, e.id`).all(studentId) as Record<string, unknown>[];
  }

  listPendingEvaluations(studentId: string): Record<string, unknown>[] {
    return this.db.prepare(`SELECT e.*, s.activity_id, s.artifact_id AS submission_artifact_id, submission_artifact.media_type AS submission_media_type, a.title AS activity_title FROM evaluations e JOIN submissions s ON s.id = e.submission_id JOIN activities a ON a.id = s.activity_id LEFT JOIN artifacts submission_artifact ON submission_artifact.id = s.artifact_id WHERE s.student_id = ? AND e.outcome = 'needs-human-review' AND NOT EXISTS (SELECT 1 FROM evaluations resolution WHERE resolution.supersedes_evaluation_id = e.id) ORDER BY e.evaluated_at, e.id`).all(studentId) as Record<string, unknown>[];
  }

  recordEvaluation(input: EvaluationInput): Record<string, unknown> {
    if (input.operationKey) { const prior = this.operationResult(input.operationKey); if (prior) return prior; }
    const evaluation = input.evaluation;
    const rationale = evaluation.items.map((item) => item.rationale).join(" ");
    const row = this.db.prepare(`INSERT INTO evaluations (id,submission_id,evaluator_type,score,outcome,evaluated_at,rationale,evaluation_json,supersedes_evaluation_id,operation_key)
      VALUES (@id,@submissionId,@evaluatorType,@score,@outcome,@evaluatedAt,@rationale,@evaluationJson,@supersedesEvaluationId,@operationKey) RETURNING *`).get({
      id: evaluation.id, submissionId: evaluation.submissionId, evaluatorType: evaluation.evaluatorType,
      score: evaluation.score, outcome: evaluation.status, evaluatedAt: evaluation.evaluatedAt,
      rationale, evaluationJson: JSON.stringify(evaluation), supersedesEvaluationId: evaluation.supersedesEvaluationId ?? null, operationKey: input.operationKey ?? null
    }) as Record<string, unknown>;
    this.saveOperation(input.operationKey, "evaluation", row);
    return row;
  }

  recordEvidence(input: EvidenceInput): void {
    this.db.prepare(`INSERT OR IGNORE INTO evidence (id,evaluation_id,concept_id,evidence_type,value_json,created_at) VALUES (?,?,?,?,?,?)`).run(
      input.id, input.evaluationId, input.conceptId, input.evidenceType, json(input.value), this.clock());
  }

  appendProgressEvent(input: ProgressEventInput): Record<string, unknown> {
    if (input.operationKey) { const prior = this.operationResult(input.operationKey); if (prior) return prior; }
    const event = input.event;
    const row = this.db.prepare(`INSERT INTO progress_events (id,student_id,concept_id,evaluation_id,score,event_type,comparable,evidence_status,confidence,comparability_key,previous_state_json,new_state_json,policy_version,reason,value_json,occurred_at,source_type,source_id,operation_key)
      VALUES (@id,@studentId,@conceptId,@evaluationId,@score,@eventType,@comparable,@evidenceStatus,@confidence,@comparabilityKey,@previousState,@newState,@policyVersion,@reason,@value,@occurredAt,@sourceType,@sourceId,@operationKey) RETURNING *`).get({
      id: event.id, studentId: event.studentId, conceptId: event.conceptId, evaluationId: event.evaluationId ?? null,
      score: event.score ?? null, eventType: event.eventType, comparable: event.comparable ? 1 : 0,
      evidenceStatus: event.evidenceStatus, confidence: event.confidence ?? null, comparabilityKey: event.comparabilityKey ?? null,
      previousState: input.previousState ? json(input.previousState) : null, newState: input.newState ? json(input.newState) : null,
      policyVersion: input.policyVersion ?? null, reason: input.reason ?? null, value: json(input.value),
      occurredAt: event.occurredAt, sourceType: input.sourceType ?? (event.evaluationId ? "evaluation" : "system"), sourceId: input.sourceId ?? event.evaluationId ?? null,
      operationKey: input.operationKey ?? null
    }) as Record<string, unknown>;
    this.saveOperation(input.operationKey, "progress_event", row);
    return row;
  }

  saveConceptState(input: ConceptStateInput): void {
    this.upsertConceptState(input);
  }

  upsertConceptState(input: ConceptStateInput): void {
    this.db.prepare(`INSERT INTO student_concept_state (student_id,concept_id,step,status,recent_scores_json,mastery,confidence,observation_count,correct_count,last_event_at,updated_at,state_json)
      VALUES (@studentId,@conceptId,@step,@status,@recentScores,@mastery,@confidence,@observationCount,@correctCount,@lastEventAt,@updatedAt,@state)
      ON CONFLICT(student_id,concept_id) DO UPDATE SET step=excluded.step, status=excluded.status, recent_scores_json=excluded.recent_scores_json,
      mastery=excluded.mastery, confidence=excluded.confidence, observation_count=excluded.observation_count, correct_count=excluded.correct_count,
      last_event_at=excluded.last_event_at, updated_at=excluded.updated_at, state_json=excluded.state_json`).run({
      ...input, step: input.step ?? 0, status: input.status ?? "new", recentScores: JSON.stringify(input.recentScores ?? []),
      mastery: input.mastery ?? null, confidence: input.confidence ?? null, observationCount: input.observationCount ?? 0,
      correctCount: input.correctCount ?? 0, lastEventAt: input.lastEventAt ?? null, updatedAt: this.clock(), state: json(input.state)
    });
  }

  getConceptState(studentId: string, conceptId: string): Record<string, unknown> | undefined {
    return this.db.prepare("SELECT * FROM student_concept_state WHERE student_id = ? AND concept_id = ?").get(studentId, conceptId) as Record<string, unknown> | undefined;
  }

  saveRecommendation(input: RecommendationInput): Record<string, unknown> {
    if (input.operationKey) { const prior = this.operationResult(input.operationKey); if (prior) return prior; }
    const recommendation = input.recommendation;
    const first = recommendation.candidates[0];
    const row = this.db.prepare(`INSERT INTO recommendations (id,student_id,activity_id,reason,rank,generated_at,policy_version,recommendation_json,created_at,expires_at,operation_key)
      VALUES (@id,@studentId,@activityId,@reason,@rank,@generatedAt,@policyVersion,@recommendationJson,@createdAt,@expiresAt,@operationKey) RETURNING *`).get({
      id: recommendation.id, studentId: recommendation.studentId, activityId: input.activityId ?? first?.activityId ?? null,
      reason: input.reason ?? first?.reasons[0]?.message ?? "Selected by the recommendation policy.", rank: input.rank ?? 1,
      generatedAt: recommendation.generatedAt, policyVersion: recommendation.policyVersion, recommendationJson: JSON.stringify(recommendation),
      createdAt: this.clock(), expiresAt: input.expiresAt ?? null, operationKey: input.operationKey ?? null
    }) as Record<string, unknown>;
    for (const [index, candidate] of recommendation.candidates.entries()) {
      this.saveCandidate({ id: `${recommendation.id}:candidate:${index + 1}`, recommendationId: recommendation.id, activityId: candidate.activityId, rationale: candidate as unknown as JsonObject });
    }
    this.saveOperation(input.operationKey, "recommendation", row);
    return row;
  }

  saveCandidate(input: CandidateInput): void {
    this.db.prepare(`INSERT OR IGNORE INTO recommendation_candidates (id,recommendation_id,activity_id,rationale_json,created_at) VALUES (?,?,?,?,?)`).run(
      input.id, input.recommendationId, input.activityId, json(input.rationale), this.clock());
  }

  saveOverride(input: OverrideInput): Record<string, unknown> {
    if (input.operationKey) { const prior = this.operationResult(input.operationKey); if (prior) return prior; }
    const row = this.db.prepare(`INSERT INTO human_overrides (id,student_id,concept_id,target_step,target_type,target_id,original_decision,decision,reason,created_at,actor,override_json,operation_key)
      VALUES (@id,@studentId,@conceptId,@targetStep,@targetType,@targetId,@originalDecision,@decision,@reason,@createdAt,@actor,@overrideJson,@operationKey) RETURNING *`).get({
      ...input, conceptId: input.conceptId ?? null, targetStep: input.targetStep ?? null, originalDecision: input.originalDecision ?? null,
      overrideJson: json(input.override), createdAt: this.clock(), operationKey: input.operationKey ?? null
    }) as Record<string, unknown>;
    this.saveOperation(input.operationKey, "human_override", row);
    return row;
  }

  saveReportSnapshot(input: ReportSnapshotInput): Record<string, unknown> {
    if (input.operationKey) { const prior = this.operationResult(input.operationKey); if (prior) return prior; }
    const report = input.report;
    const row = this.db.prepare(`INSERT INTO report_snapshots (id,student_id,report_type,as_of,artifact_id,report_json,content_json,created_at,operation_key)
      VALUES (@id,@studentId,@reportType,@asOf,@artifactId,@reportJson,@content,@createdAt,@operationKey) RETURNING *`).get({
      id: report.id, studentId: report.studentId, reportType: input.reportType ?? "progress-summary", asOf: report.asOf,
      artifactId: input.artifactId ?? report.artifactId ?? null, reportJson: JSON.stringify(report), content: json(input.content ?? { summary: report.summary }), createdAt: this.clock(), operationKey: input.operationKey ?? null
    }) as Record<string, unknown>;
    this.saveOperation(input.operationKey, "report_snapshot", row);
    return row;
  }

  operationResult(operationKey: string): Record<string, unknown> | undefined {
    const row = this.db.prepare("SELECT result_json FROM operation_runs WHERE operation_key = ?").get(operationKey) as { result_json: string } | undefined;
    return row ? parse<Record<string, unknown>>(row.result_json) : undefined;
  }

  saveOperationResult(operationKey: string, operationType: string, result: Record<string, unknown>): void {
    this.saveOperation(operationKey, operationType, result);
  }

  getOperationRun(operationKey: string): Record<string, unknown> | undefined {
    const row = this.db.prepare("SELECT * FROM operation_runs WHERE operation_key = ?").get(operationKey) as Record<string, unknown> | undefined;
    return row;
  }

  private saveOperation(operationKey: string | undefined, operationType: string, result: Record<string, unknown>): void {
    if (!operationKey) return;
    this.db.prepare("INSERT OR IGNORE INTO operation_runs (operation_key,operation_type,result_json,created_at) VALUES (?,?,?,?)")
      .run(operationKey, operationType, JSON.stringify(result), this.clock());
  }

  timeline(studentId: string): TimelineEntry[] {
    const entries: TimelineEntry[] = [];
    const queries: [string, string, string][] = [
      ["submission", "SELECT id, submitted_at AS at, student_id, payload_json AS payload FROM submissions WHERE student_id = ?", "submitted_at"],
      ["progress_event", "SELECT id, occurred_at AS at, student_id, value_json AS payload FROM progress_events WHERE student_id = ?", "occurred_at"],
      ["recommendation", "SELECT id, created_at AS at, student_id, reason AS payload FROM recommendations WHERE student_id = ?", "created_at"],
      ["override", "SELECT id, created_at AS at, student_id, reason AS payload FROM human_overrides WHERE student_id = ?", "created_at"],
      ["report_snapshot", "SELECT id, created_at AS at, student_id, content_json AS payload FROM report_snapshots WHERE student_id = ?", "created_at"]
    ];
    for (const [kind, sql] of queries) {
      for (const row of this.db.prepare(sql).all(studentId) as { id: string; at: string; student_id: string; payload: string }[]) {
        let payload: JsonObject;
        try { payload = parse<JsonObject>(row.payload); } catch { payload = { value: row.payload }; }
        entries.push({ kind, id: row.id, at: row.at, studentId: row.student_id, payload });
      }
    }
    return entries.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  }

  progressHistory(studentId: string, conceptId?: string): Record<string, unknown>[] {
    return this.history(studentId, conceptId);
  }

  history(studentId: string, conceptId?: string): Record<string, unknown>[] {
    const sql = conceptId ? "SELECT * FROM progress_events WHERE student_id = ? AND concept_id = ? ORDER BY occurred_at, id" : "SELECT * FROM progress_events WHERE student_id = ? ORDER BY occurred_at, id";
    return (conceptId ? this.db.prepare(sql).all(studentId, conceptId) : this.db.prepare(sql).all(studentId)) as Record<string, unknown>[];
  }
}
