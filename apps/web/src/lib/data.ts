import { randomUUID } from "node:crypto";
import { ActivitySpecSchema, ChildActivitySpecSchema, SubmissionSchema, StudentSchema, toChildActivitySpec, type ActivitySpec, type CapabilityClaim, type ChildActivitySpec, type ConceptAvailability, type CurriculumRevisionProposal, type Student, type StudentCreateRequest, type Submission } from "@child-learning/contracts";
import { filterAvailableActivities } from "@child-learning/domain";
import { createLocalService, type LocalService } from "@child-learning/mcp-server";
import { normalizeImage } from "@child-learning/storage";

type ServiceWork<T> = (service: LocalService) => Promise<T> | T;

async function withService<T>(work: ServiceWork<T>): Promise<T> {
  const service = createLocalService();
  try { return await work(service); } finally { service.close(); }
}

function toStudent(row: Record<string, unknown> | undefined): Student | undefined {
  if (!row) return undefined;
  let metadata: { preferredLanguage?: string; accommodations?: string[]; interests?: string[]; learningGoals?: string[]; selectedSubjects?: string[]; reportedCapabilities?: CapabilityClaim[]; baselineNotes?: string; baselineStatus?: Student["baselineStatus"] } = {};
  try { metadata = JSON.parse(String(row.metadata_json ?? "{}")) as typeof metadata; } catch { metadata = {}; }
  return StudentSchema.parse({ id: row.id, displayName: row.display_name, birthDate: row.birth_date ?? undefined, gradeBand: row.grade ?? "school-age", preferredLanguage: metadata.preferredLanguage ?? "en", accommodations: metadata.accommodations ?? [], interests: metadata.interests ?? [], learningGoals: metadata.learningGoals ?? [], selectedSubjects: metadata.selectedSubjects ?? [], reportedCapabilities: metadata.reportedCapabilities ?? [], ...(metadata.baselineNotes ? { baselineNotes: metadata.baselineNotes } : {}), baselineStatus: metadata.baselineStatus ?? "awaiting-intake", dataScope: row.data_scope ?? "household", ...(row.source_dataset_id ? { sourceDatasetId: row.source_dataset_id } : {}), createdAt: row.created_at, updatedAt: row.updated_at });
}

function parseActivityRow(row: Record<string, unknown> | undefined): ActivitySpec | undefined {
  if (!row) return undefined;
  return ActivitySpecSchema.parse(JSON.parse(String(row.specification_json)));
}

export async function getStudent(studentId: string): Promise<Student | undefined> {
  return withService((service) => toStudent(service.repo.getStudent(studentId)));
}

export async function createStudentWithStarter(input: StudentCreateRequest) {
  return withService((service) => service.createLearnerWithIntake(input));
}

export async function getStudentProgressRows(studentId: string) {
  return withService((service) => ({ student: toStudent(service.repo.getStudent(studentId)), states: service.db.prepare("SELECT * FROM student_concept_state WHERE student_id = ? ORDER BY concept_id").all(studentId) as Record<string, unknown>[] }));
}

export async function getStudentTimeline(studentId: string) {
  return withService((service) => ({ student: toStudent(service.repo.getStudent(studentId)), timeline: service.repo.timeline(studentId) }));
}

export async function getAvailableChildActivities(studentId: string) {
  return withService((service) => {
    const student = toStudent(service.repo.getStudent(studentId));
    if (!student) return { student, activities: [] as ChildActivitySpec[], learningPathVersion: "capability-path-v1" };
    const activities = service.repo.listActivities(studentId).map(parseActivityRow).filter((value): value is ActivitySpec => Boolean(value));
    const learningPath = service.getLearningPath(studentId) as { availability: ConceptAvailability[]; curriculumVersion: string };
    return { student, activities: filterAvailableActivities(activities.filter((activity) => service.registry.activityMatchesActiveRevision(activity)), learningPath.availability).map(toChildActivitySpec), learningPathVersion: learningPath.curriculumVersion };
  });
}

export async function getStudentBundle(studentId: string) {
  return withService((service) => {
    const student = toStudent(service.repo.getStudent(studentId));
    const activities = service.repo.listActivities(studentId).map(parseActivityRow).filter((value): value is ActivitySpec => Boolean(value));
    const learningPath = student ? service.getLearningPath(studentId) as { availability: ConceptAvailability[]; directives: Record<string, unknown>[]; curriculumVersion: string; gradeIsContextOnly: boolean } : { availability: [], directives: [], curriculumVersion: "capability-path-v1", gradeIsContextOnly: true };
    const availableActivities = filterAvailableActivities(activities.filter((activity) => service.registry.activityMatchesActiveRevision(activity)), learningPath.availability);
    const roadmaps = student ? service.getLearningRoadmaps(studentId, true) : { studentId, audience: "adult", roadmaps: [] };
    const states = service.db.prepare("SELECT * FROM student_concept_state WHERE student_id = ? ORDER BY concept_id").all(studentId) as Record<string, unknown>[];
    const submissions = service.repo.listSubmissions(studentId);
    const evaluations = service.repo.listEvaluations(studentId);
    const pendingEvaluations = service.repo.listPendingEvaluations(studentId);
    const timeline = service.repo.timeline(studentId);
    const reports = service.db.prepare("SELECT * FROM report_snapshots WHERE student_id = ? ORDER BY created_at DESC").all(studentId) as Record<string, unknown>[];
    const recommendations = service.db.prepare("SELECT * FROM recommendations WHERE student_id = ? ORDER BY created_at DESC").all(studentId) as Record<string, unknown>[];
    const learnerWork = student ? service.projectLearnerWork(studentId) : { current: [], history: [], recommendation: undefined };
    return { student, activities, availableActivities, learnerWork, learningPath, roadmaps, states, submissions, evaluations, pendingEvaluations, timeline, reports, recommendations };
  });
}

export async function getLearnerRoadmaps(studentId: string, adult = false) {
  return withService((service) => service.getLearningRoadmaps(studentId, adult));
}

export async function getCurriculumOverview() {
  return withService((service) => service.listCurriculum());
}

export async function decideCurriculumProposal(input: { proposalId: string; decision: "approved" | "rejected"; reviewerId: string; note: string }) {
  return withService((service) => service.decideCurriculumRevision(input));
}

export async function activateCurriculumProposal(input: { proposalId: string; actorId: string; reason: string }) {
  return withService((service) => service.activateCurriculumRevision(input));
}

export async function proposeCurriculum(input: Omit<CurriculumRevisionProposal, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
  return withService((service) => service.proposeCurriculumRevision(input));
}

export async function getWorksheetArchive(studentId: string): Promise<Record<string, unknown>[]> {
  return withService((service) => service.db.prepare(`
    SELECT s.*, a.title AS activity_title, a.subject, a.concept_id, a.specification_json,
      e.id AS evaluation_id, e.score, e.outcome, e.evaluation_json,
      artifact.media_type AS submission_media_type
    FROM submissions s
    JOIN activities a ON a.id = s.activity_id
    LEFT JOIN evaluations e ON e.id = (
      SELECT candidate.id FROM evaluations candidate
      WHERE candidate.submission_id = s.id
      ORDER BY CASE candidate.outcome WHEN 'final' THEN 0 WHEN 'needs-human-review' THEN 1 ELSE 2 END, candidate.evaluated_at DESC, candidate.id DESC
      LIMIT 1
    )
    LEFT JOIN artifacts artifact ON artifact.id = s.artifact_id
    WHERE s.student_id = ?
    ORDER BY s.submitted_at DESC, s.id DESC
  `).all(studentId) as Record<string, unknown>[]);
}

export async function getWorksheetReview(studentId: string, submissionId: string): Promise<Record<string, unknown> | undefined> {
  return withService((service) => service.db.prepare(`
    SELECT s.*, a.title AS activity_title, a.subject, a.concept_id, a.specification_json,
      e.id AS evaluation_id, e.score, e.outcome, e.evaluation_json,
      artifact.media_type AS submission_media_type
    FROM submissions s
    JOIN activities a ON a.id = s.activity_id
    LEFT JOIN evaluations e ON e.id = (
      SELECT candidate.id FROM evaluations candidate
      WHERE candidate.submission_id = s.id
      ORDER BY CASE candidate.outcome WHEN 'final' THEN 0 WHEN 'needs-human-review' THEN 1 ELSE 2 END, candidate.evaluated_at DESC, candidate.id DESC
      LIMIT 1
    )
    LEFT JOIN artifacts artifact ON artifact.id = s.artifact_id
    WHERE s.student_id = ? AND s.id = ?
  `).get(studentId, submissionId) as Record<string, unknown> | undefined);
}

export async function getAdultActivity(activityId: string): Promise<ActivitySpec | undefined> {
  return withService((service) => {
    try { return ActivitySpecSchema.parse(service.getActivity(activityId, true)); } catch { return undefined; }
  });
}

export async function getChildActivity(activityId: string): Promise<ChildActivitySpec | undefined> {
  return withService((service) => {
    try {
      const adultActivity = ActivitySpecSchema.parse(service.getActivity(activityId, true));
      const learningPath = service.getLearningPath(adultActivity.studentId) as { availability: ConceptAvailability[] };
      if (!service.registry.activityMatchesActiveRevision(adultActivity) || filterAvailableActivities([adultActivity], learningPath.availability).length === 0) return undefined;
      return ChildActivitySpecSchema.parse(service.getActivity(activityId, false));
    } catch { return undefined; }
  });
}

export async function getHistoricalChildActivity(activityId: string, studentId: string): Promise<ChildActivitySpec | undefined> {
  return withService((service) => {
    try {
      const activity = ActivitySpecSchema.parse(service.getActivity(activityId, true));
      if (activity.studentId !== studentId) return undefined;
      return toChildActivitySpec(activity);
    } catch { return undefined; }
  });
}

export async function isValidRetrySource(studentId: string, activityId: string, submissionId: string): Promise<boolean> {
  return withService((service) => Boolean(service.db.prepare("SELECT 1 FROM submissions WHERE id = ? AND student_id = ? AND activity_id = ?").get(submissionId, studentId, activityId)));
}

export async function saveGeneratedActivity(specInput: unknown) {
  return withService((service) => service.validateAndStoreActivity(specInput));
}

export async function generateAndStoreActivity(input: { subject?: string; conceptId?: string; generator?: string; seed: number; studentId: string; itemCount?: number; representationStage?: string }) {
  return withService(async (service) => {
    const activity = service.generateActivity(input);
    return service.validateAndStoreActivity(activity);
  });
}

export async function saveDigitalSubmission(input: Submission): Promise<Record<string, unknown>> {
  const parsed = SubmissionSchema.parse(input);
  return withService((service) => service.recordDigitalSubmission(parsed));
}

export async function savePhotoSubmission(studentId: string, activityId: string, file: File, retryOfSubmissionId?: string) {
  if (!studentId || !activityId) throw new Error("studentId and activityId are required.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image must be 8 MB or smaller.");
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  const normalized = normalizeImage(originalBytes);
  return withService(async (service) => {
    const activityRow = service.db.prepare("SELECT * FROM activities WHERE id = ? AND student_id = ?").get(activityId, studentId) as Record<string, unknown> | undefined;
    if (!activityRow) throw new Error("Activity is not assigned to this student.");
    const activity = ActivitySpecSchema.parse(JSON.parse(String(activityRow.specification_json)));
    const learningPath = service.getLearningPath(studentId) as { availability: ConceptAvailability[] };
    if (!service.registry.activityMatchesActiveRevision(activity) || filterAvailableActivities([activity], learningPath.availability).length === 0) throw new Error("Activity is not currently available for this student.");
    const activityArtifactId = typeof activityRow.artifact_id === "string" ? activityRow.artifact_id : "";
    if (!activityArtifactId) throw new Error("Activity has no source artifact.");
    const retryRow = retryOfSubmissionId ? service.db.prepare("SELECT student_id,activity_id,artifact_id FROM submissions WHERE id = ?").get(retryOfSubmissionId) as { student_id: string; activity_id: string; artifact_id: string | null } | undefined : undefined;
    if (retryOfSubmissionId && (!retryRow || retryRow.student_id !== studentId || retryRow.activity_id !== activityId)) throw new Error("Retry source must be a prior submission for the same learner and activity.");
    const commonMetadata = { studentId, activityId, kind: "submission-photo", needsReview: true, originalName: file.name, declaredMime: file.type || undefined, ...(retryOfSubmissionId ? { retryOfSubmissionId } : {}) };
    const originalArtifact = await service.store.put(originalBytes, { mediaType: normalized.mediaType, fileExtension: normalized.extension, metadata: { ...commonMetadata, artifactRole: "original-upload" } });
    const unchanged = originalBytes.byteLength === normalized.bytes.byteLength && originalBytes.every((value, index) => value === normalized.bytes[index]);
    // The SQLite artifacts table enforces one row per SHA-256. A clean image is already normalized,
    // so retain that immutable artifact rather than creating a duplicate row that the schema cannot represent.
    const normalizedArtifact = unchanged
      ? originalArtifact
      : await service.store.put(normalized.bytes, { mediaType: normalized.mediaType, fileExtension: normalized.extension, metadata: { ...commonMetadata, artifactRole: "normalized-review-upload", normalizedFrom: originalArtifact.id } });
    const now = new Date().toISOString();
    const submission = SubmissionSchema.parse({ id: `submission-photo-${randomUUID()}`, activityId, studentId, responses: [], submittedAt: now, artifactId: normalizedArtifact.id, ...(retryOfSubmissionId ? { retryOfSubmissionId } : {}) });
    await service.store.addLineageEdge(activityArtifactId, originalArtifact.id, "submitted-from");
    if (retryRow?.artifact_id) await service.store.addLineageEdge(retryRow.artifact_id, originalArtifact.id, "retry-of");
    if (!unchanged) await service.store.addLineageEdge(originalArtifact.id, normalizedArtifact.id, "normalized-from");
    const tx = service.db.transaction(() => {
      service.repo.recordArtifact({ id: originalArtifact.id, sha256: originalArtifact.sha256, mediaType: originalArtifact.mediaType, byteLength: originalArtifact.byteLength, relativePath: originalArtifact.relativePath, metadata: originalArtifact.metadata });
      if (!unchanged) service.repo.recordArtifact({ id: normalizedArtifact.id, sha256: normalizedArtifact.sha256, mediaType: normalizedArtifact.mediaType, byteLength: normalizedArtifact.byteLength, relativePath: normalizedArtifact.relativePath, metadata: normalizedArtifact.metadata });
      service.repo.addArtifactEdge({ parentArtifactId: activityArtifactId, childArtifactId: originalArtifact.id, relation: "submitted-from" });
      if (retryRow?.artifact_id) service.repo.addArtifactEdge({ parentArtifactId: retryRow.artifact_id, childArtifactId: originalArtifact.id, relation: "retry-of" });
      if (!unchanged) service.repo.addArtifactEdge({ parentArtifactId: originalArtifact.id, childArtifactId: normalizedArtifact.id, relation: "normalized-from" });
      service.repo.recordSubmission({ id: submission.id, studentId, activityId, submittedAt: now, responses: [], artifactId: normalizedArtifact.id, ...(retryOfSubmissionId ? { retryOfSubmissionId } : {}), operationKey: `web:photo:${submission.id}` });
    });
    tx();
    const proposal = await service.proposeUploadedWorkEvaluation({ submissionId: submission.id, evidence: ["photo-upload-requires-adult-review"], confidence: 0.1, rationale: "A local photo was submitted. An adult must inspect the work; no OCR was performed." });
    return {
      artifact: normalizedArtifact,
      originalArtifact,
      normalizedArtifact,
      originalArtifactId: originalArtifact.id,
      normalizedArtifactId: normalizedArtifact.id,
      submission,
      evaluation: proposal.evaluation,
      needsReview: true,
    };
  });
}

export async function confirmEvaluation(evaluationId: string, reviewerId: string, score: number, rationale: string) { return withService((service) => service.confirmEvaluation({ evaluationId, reviewerId, score, rationale })); }
export async function rejectEvaluation(evaluationId: string, reviewerId: string, reason: string) { return withService((service) => service.rejectEvaluation({ evaluationId, reviewerId, reason })); }
export async function applyOverride(input: { id: string; studentId: string; conceptId: string; targetStep: number; reason: string; authorId: string; targetId?: string }) { return withService((service) => service.applyOverride(input)); }
export async function applyLearningDirective(input: { id: string; studentId: string; conceptId: string; action: "introduce" | "assess" | "prioritize" | "defer" | "clear"; reason: string; authorId: string; requestedStage?: string; priority?: number; expiresAt?: string }) {
  return withService(async (service) => {
    const result = await service.applyLearningDirective(input);
    if (input.action !== "introduce" && input.action !== "prioritize") return result;
    const learningPath = service.getLearningPath(input.studentId) as { availability: ConceptAvailability[] };
    const concept = learningPath.availability.find((entry) => entry.conceptId === input.conceptId);
    if (!concept || concept.status === "locked" || concept.status === "deferred") return result;
    const representationStage = input.action === "introduce" ? input.requestedStage ?? concept.stageOrder[0]! : concept.currentStage;
    const activity = service.generateActivity({ conceptId: input.conceptId, studentId: input.studentId, seed: Date.now(), itemCount: representationStage === "concrete" ? 3 : 5, representationStage });
    const materializedActivity = await service.validateAndStoreActivity(activity);
    return { ...result, materializedActivity };
  });
}
export async function generateProgressReport(studentId: string, options?: { kind?: "current" | "monthly" | "quarterly"; selectedDate?: string; timeZone?: string; asOf?: string }) { return withService((service) => service.generateProgressReport(studentId, options ?? {})); }
export async function listProgressReports(studentId: string, kind?: "current" | "monthly" | "quarterly") { return withService((service) => service.repo.listReportSnapshots(studentId, kind)); }
export async function getProgressReportAtOrBefore(studentId: string, asOf: string, kind?: "current" | "monthly" | "quarterly") { return withService((service) => service.repo.getReportAtOrBefore(studentId, asOf, kind)); }
export async function getReport(reportId: string) { return withService((service) => service.db.prepare("SELECT * FROM report_snapshots WHERE id = ?").get(reportId) as Record<string, unknown> | undefined); }

export async function getArtifactContent(artifactId: string) {
  return withService(async (service) => {
    const artifact = await service.store.findById(artifactId);
    if (!artifact) return undefined;
    const bytes = await service.store.read(artifact);
    return { artifact, bytes };
  });
}
