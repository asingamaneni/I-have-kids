// Test-only fixture: builds a fully worked learner history (activities, submissions,
// evaluations, progress events, reports) so service tests have realistic evidence to
// assert against. This is NOT shipped: the product has no demo mode, and nothing
// outside packages/mcp-server/tests may import it.
import { resolve } from "node:path";
import { closeDatabase, LearningRepository, migrateDatabase, openDatabase } from "@child-learning/database";
import { deriveConceptAvailability, generateAdditionWithinTen, generateEnglishBeginningSounds, generateSubtractionWithinTen, generateEqualGroups, generateFairSharing, generateHandwritingWriting, generateReadingForDetail, generateReasoning, generateScienceObservation, projectProgression, projectStudentConceptState, progressEventsFromEvaluation, rankRecommendations, DEFAULT_PROGRESSION_POLICY, scoreSubmission } from "@child-learning/domain";
import { ActivitySpecSchema } from "@child-learning/contracts";
import type { ActivitySpec, ProgressEvent, Recommendation, ReportSnapshot, StudentConceptState, Submission } from "@child-learning/contracts";
import { ArtifactStore, type StoredArtifact } from "@child-learning/storage";

export interface DemoSeedOptions { databasePath?: string; artifactsDir?: string; now?: string; }
export interface DemoSeedResult { studentId: string; activityIds: string[]; observationScores: number[]; finalStep: number; finalDecision: string; artifacts: StoredArtifact[]; }

const DEMO_DATASET_ID = "child-learning-demo-v2";
const DEMO_DATASET_VERSION = "2";
const IDS = {
  student: "student-fixture-ava", mathCurriculum: "curriculum-addition-within-10", englishCurriculum: "curriculum-letter-sounds",
  mathActivities: ["activity-addition-01", "activity-addition-02", "activity-addition-03", "activity-addition-04"], nextMathActivity: "activity-addition-next",
  englishActivity: "activity-english-letter-sounds", concept: "math.addition-within-10", englishConcept: "english.beginning-sounds"

} as const;

function answerFor(spec: ActivitySpec, itemId: string, correct: boolean): unknown {
  const answer = spec.answerSpecs[itemId];
  if (!answer) return null;
  if (answer.type === "integer" || answer.type === "number") return correct ? answer.expected : answer.expected + 1;
  if (answer.type === "text") return correct ? answer.expected : "wrong";
  if (answer.type === "choice") return correct ? answer.expected : "wrong";
  if (answer.type === "sequence") return correct ? answer.expected : [...answer.expected].reverse();
  return "review";
}

function makeSubmission(spec: ActivitySpec, id: string, correctCount: number, now: string): Submission {
  return {
    id, activityId: spec.id, studentId: spec.studentId, submittedAt: now,
    responses: spec.items.map((item, index) => ({ itemId: item.id, value: answerFor(spec, item.id, index < correctCount), capturedAt: now }))
  };
}

function stateSnapshot(state: StudentConceptState): Record<string, unknown> {
  return { step: state.step, status: state.status };
}

function initialState(studentId: string, conceptId: string, now: string): StudentConceptState {
  return { studentId, conceptId, step: 0, status: "new", recentScores: [], updatedAt: now };
}

export async function seedFixture(options: DemoSeedOptions = {}): Promise<DemoSeedResult> {
  const now = options.now ?? "2026-01-15T12:00:00.000Z";
  const databasePath = options.databasePath ?? resolve(process.cwd(), ".data/demo/learning-worktable.db");
  const artifactsDir = options.artifactsDir ?? resolve(process.cwd(), ".data/demo/artifacts");
  const db = openDatabase({ filename: databasePath });
  const store = new ArtifactStore({ rootDir: artifactsDir, clock: () => now });
  try {
    migrateDatabase(db);
    const repo = new LearningRepository(db, () => now);
    const existingDataset = repo.getSyntheticDataset(DEMO_DATASET_ID);
    if (existingDataset) {
      const manifest = JSON.parse(String(existingDataset.manifest_json)) as Omit<DemoSeedResult, "artifacts"> & { artifactIds: string[] };
      const artifacts = (await Promise.all(manifest.artifactIds.map((id) => store.findById(id)))).filter((artifact): artifact is StoredArtifact => Boolean(artifact));
      return { studentId: manifest.studentId, activityIds: manifest.activityIds, observationScores: manifest.observationScores, finalStep: manifest.finalStep, finalDecision: manifest.finalDecision, artifacts };
    }
    if (repo.getStudent(IDS.student)) throw new Error("The isolated demo store contains an unmanifested demo learner; refusing to overwrite it.");
    repo.saveStudent({ id: IDS.student, displayName: "Fixture Learner", grade: "School-age, mixed level", dataScope: "household", sourceDatasetId: DEMO_DATASET_ID, metadata: { baselineStatus: "established", selectedSubjects: ["math", "english", "reasoning", "science"] } });
    repo.saveCurriculumMetadata({ id: IDS.mathCurriculum, subject: "math", conceptId: IDS.concept, title: "Addition within 10", metadata: { demo: true } });
    repo.saveCurriculumMetadata({ id: IDS.englishCurriculum, subject: "english", conceptId: IDS.englishConcept, title: "Beginning letter sounds", metadata: { demo: true } });
    const artifacts: StoredArtifact[] = [];
    const saveArtifact = async (value: unknown, metadata: Record<string, unknown>): Promise<StoredArtifact> => {
      const artifact = await store.putText(JSON.stringify(value), metadata);
      artifacts.push(artifact);
      repo.recordArtifact({ id: artifact.id, sha256: artifact.sha256, mediaType: artifact.mediaType, byteLength: artifact.byteLength, relativePath: artifact.relativePath, metadata: artifact.metadata });
      return artifact;
    };
    const persistActivity = async (spec: ActivitySpec, curriculumId?: string): Promise<ActivitySpec> => {
      const existing = db.prepare("SELECT specification_json FROM activities WHERE id = ?").get(spec.id) as { specification_json: string } | undefined;
      if (existing) return ActivitySpecSchema.parse(JSON.parse(existing.specification_json));
      const artifact = await saveArtifact(spec, { source: "domain-generator", kind: "activity-spec", activityId: spec.id, pack: spec.generator?.name });
      repo.saveActivity({ id: spec.id, studentId: IDS.student, ...(curriculumId ? { curriculumId } : {}), specification: spec, artifactId: artifact.id });
      return spec;
    };

    const additionActivities: ActivitySpec[] = [];
    let comparableKey = generateAdditionWithinTen({ seed: 101, studentId: IDS.student, now, itemCount: 10 }).comparabilityKey;
    for (const [index, activityId] of IDS.mathActivities.entries()) {
      const generated = generateAdditionWithinTen({ seed: 101 + index, studentId: IDS.student, now, itemCount: 10 });
      const persisted = await persistActivity({ ...generated, id: activityId, comparabilityKey: comparableKey }, IDS.mathCurriculum);
      if (index === 0) comparableKey = persisted.comparabilityKey;
      additionActivities.push(persisted);
    }
    const nextMathActivity = await persistActivity({ ...generateAdditionWithinTen({ seed: 105, studentId: IDS.student, now, itemCount: 20 }), id: IDS.nextMathActivity }, IDS.mathCurriculum);
    const englishSpec = generateEnglishBeginningSounds({ seed: 201, studentId: IDS.student, now, itemCount: 5 });
    const englishActivity = await persistActivity({ ...englishSpec, id: IDS.englishActivity }, IDS.englishCurriculum);
    const englishActivityRow = db.prepare("SELECT artifact_id FROM activities WHERE id = ?").get(IDS.englishActivity) as { artifact_id: string };
    const englishArtifact = await store.findById(englishActivityRow.artifact_id);
    if (!englishArtifact) throw new Error("demo English activity artifact is missing");

    // Keep the canonical four-addition progression untouched while making every broader pack discoverable on the shelf.
    const broaderActivities: Array<{ id: string; spec: ActivitySpec }> = [
      { id: "activity-subtraction-01", spec: generateSubtractionWithinTen({ seed: 301, studentId: IDS.student, now, itemCount: 4 }) },
      { id: "activity-equal-groups-01", spec: generateEqualGroups({ seed: 302, studentId: IDS.student, now, itemCount: 4 }) },
      { id: "activity-fair-sharing-01", spec: generateFairSharing({ seed: 303, studentId: IDS.student, now, itemCount: 4 }) },
      { id: "activity-handwriting-01", spec: generateHandwritingWriting({ seed: 304, studentId: IDS.student, now, itemCount: 4 }) },
      { id: "activity-reading-detail-01", spec: generateReadingForDetail({ seed: 305, studentId: IDS.student, now, itemCount: 4 }) },
      { id: "activity-reasoning-01", spec: generateReasoning({ seed: 306, studentId: IDS.student, now, itemCount: 4 }) },
      { id: "activity-science-observation-01", spec: generateScienceObservation({ seed: 307, studentId: IDS.student, now, itemCount: 4 }) },
    ];
    for (const { id, spec: generated } of broaderActivities) await persistActivity({ ...generated, id });

    const scores: number[] = [];
    const mathEvents: ProgressEvent[] = [];
    const mathEvaluationArtifacts: StoredArtifact[] = [];
    let mathState = initialState(IDS.student, IDS.concept, now);
    let finalDecision = "no-change";
    for (const [index, spec] of additionActivities.entries()) {
      const submission = makeSubmission(spec, `submission-fixture-addition-${index + 1}`, index === 0 ? 7 : 9, now);
      const evaluation = scoreSubmission(spec, submission, { evaluationId: `evaluation-demo-addition-${index + 1}`, now });
      const specArtifactId = (db.prepare("SELECT artifact_id FROM activities WHERE id = ?").get(spec.id) as { artifact_id: string }).artifact_id;
      const specArtifact = artifacts.find((artifact) => artifact.id === specArtifactId) ?? await store.findById(specArtifactId);
      if (!specArtifact) throw new Error(`demo activity artifact is missing: ${spec.id}`);
      const submissionArtifact = await saveArtifact(submission, { source: "demo-submission", kind: "submission", submissionId: submission.id });
      await store.addLineageEdge(specArtifact.id, submissionArtifact.id, "submitted-from");
      repo.addArtifactEdge({ parentArtifactId: specArtifact.id, childArtifactId: submissionArtifact.id, relation: "submitted-from" });
      repo.recordSubmission({ id: submission.id, studentId: submission.studentId, activityId: submission.activityId, responses: submission.responses, submittedAt: submission.submittedAt, artifactId: submissionArtifact.id, operationKey: `demo:addition:${index + 1}:submission` });
      const evaluationArtifact = await saveArtifact(evaluation, { source: "domain-scorer", kind: "evaluation", evaluationId: evaluation.id });
      mathEvaluationArtifacts.push(evaluationArtifact);
      await store.addLineageEdge(submissionArtifact.id, evaluationArtifact.id, "evaluated-from");
      repo.addArtifactEdge({ parentArtifactId: submissionArtifact.id, childArtifactId: evaluationArtifact.id, relation: "evaluated-from" });
      repo.recordEvaluation({ evaluation, operationKey: `demo:addition:${index + 1}:evaluation` });
      for (const item of evaluation.items) repo.recordEvidence({ id: `evidence-${evaluation.id}-${item.itemId}`, evaluationId: evaluation.id, conceptId: evaluation.conceptId, evidenceType: "deterministic-score", value: item });
      const event = progressEventsFromEvaluation(evaluation, spec);
      mathEvents.push(event);
      const projection = projectProgression(mathState, mathEvents, DEFAULT_PROGRESSION_POLICY);
      const nextState = projectStudentConceptState(mathState, mathEvents, DEFAULT_PROGRESSION_POLICY);
      finalDecision = projection.decision;
      repo.appendProgressEvent({ event, previousState: stateSnapshot(mathState), newState: stateSnapshot(nextState), policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: projection.reason, operationKey: `demo:addition:${index + 1}:progress` });
      repo.saveConceptState({ studentId: nextState.studentId, conceptId: nextState.conceptId, step: nextState.step, status: nextState.status, recentScores: nextState.recentScores, confidence: event.confidence, observationCount: mathEvents.length, correctCount: mathEvents.filter((entry) => (entry.score ?? 0) >= 0.9).length, lastEventAt: nextState.lastEvidenceAt, mastery: nextState.recentScores.at(-1), state: { policy: DEFAULT_PROGRESSION_POLICY, decision: projection.decision, reason: projection.reason } });
      mathState = nextState;
      scores.push(evaluation.score);
    }

    const englishSubmission = makeSubmission(englishActivity, "submission-fixture-english", englishActivity.items.length, now);
    const englishEvaluation = scoreSubmission(englishActivity, englishSubmission, { evaluationId: "evaluation-demo-english", now });
    const englishSubmissionArtifact = await saveArtifact(englishSubmission, { source: "demo-submission", kind: "submission", submissionId: englishSubmission.id });
    await store.addLineageEdge(englishArtifact.id, englishSubmissionArtifact.id, "submitted-from");
    repo.addArtifactEdge({ parentArtifactId: englishArtifact.id, childArtifactId: englishSubmissionArtifact.id, relation: "submitted-from" });
    repo.recordSubmission({ id: englishSubmission.id, studentId: englishSubmission.studentId, activityId: englishSubmission.activityId, responses: englishSubmission.responses, submittedAt: englishSubmission.submittedAt, artifactId: englishSubmissionArtifact.id, operationKey: "demo:english:submission" });
    const englishEvaluationArtifact = await saveArtifact(englishEvaluation, { source: "domain-scorer", kind: "evaluation", evaluationId: englishEvaluation.id });
    await store.addLineageEdge(englishSubmissionArtifact.id, englishEvaluationArtifact.id, "evaluated-from");
    repo.addArtifactEdge({ parentArtifactId: englishSubmissionArtifact.id, childArtifactId: englishEvaluationArtifact.id, relation: "evaluated-from" });
    repo.recordEvaluation({ evaluation: englishEvaluation, operationKey: "demo:english:evaluation" });
    const englishEvent = progressEventsFromEvaluation(englishEvaluation, englishActivity);
    const englishState = projectStudentConceptState(initialState(IDS.student, IDS.englishConcept, now), [englishEvent], DEFAULT_PROGRESSION_POLICY);
    repo.appendProgressEvent({ event: englishEvent, previousState: stateSnapshot(initialState(IDS.student, IDS.englishConcept, now)), newState: stateSnapshot(englishState), policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: "English beginning-sound observation scored through the domain scorer.", operationKey: "demo:english:progress" });
    repo.saveConceptState({ studentId: englishState.studentId, conceptId: englishState.conceptId, step: englishState.step, status: englishState.status, recentScores: englishState.recentScores, confidence: englishEvent.confidence, observationCount: 1, correctCount: 1, lastEventAt: englishState.lastEvidenceAt, mastery: englishEvaluation.score, state: { policy: DEFAULT_PROGRESSION_POLICY } });

    const recommendation: Recommendation = rankRecommendations([...additionActivities, nextMathActivity, englishActivity], { studentId: IDS.student, now, states: [repo.getConceptState(IDS.student, IDS.concept), repo.getConceptState(IDS.student, IDS.englishConcept)].filter(Boolean).map((row) => ({ studentId: String(row!.student_id), conceptId: String(row!.concept_id), step: Number(row!.step), status: row!.status as StudentConceptState["status"], recentScores: JSON.parse(String(row!.recent_scores_json)), updatedAt: String(row!.updated_at) })), events: mathEvents, recommendationId: "recommendation-demo-1" });
    repo.saveRecommendation({ recommendation, operationKey: "demo:recommendation:1" });

    const originalDecision = recommendation.candidates[0]?.reasons[0]?.code ?? "variety";
    repo.saveOverride({ id: "override-demo-1", studentId: IDS.student, conceptId: IDS.concept, targetStep: mathState.step, targetType: "recommendation", targetId: recommendation.id, originalDecision, decision: "accepted", reason: "Adult kept the domain recommendation.", actor: "demo-adult", override: { originalDecision }, operationKey: "demo:override:1" });
    const overrideEvent: ProgressEvent = { id: "progress-demo-override", studentId: IDS.student, conceptId: IDS.concept, eventType: "human-override", comparable: false, evidenceStatus: "confirmed", confidence: 1, occurredAt: now, reason: "Adult accepted the recommendation without changing graded state." };
    repo.appendProgressEvent({ event: overrideEvent, previousState: stateSnapshot(mathState), newState: stateSnapshot(mathState), policyVersion: DEFAULT_PROGRESSION_POLICY.schemaVersion, reason: "Original recommendation decision preserved; adult override appended as history.", value: { originalDecision, overriddenDecision: "accepted" }, operationKey: "demo:override:progress" });

    const learningPath = deriveConceptAvailability({ states: [mathState, englishState], events: [...mathEvents, englishEvent], now });
    const worksheetSummaries: ReportSnapshot["worksheetSummaries"] = [
      ...additionActivities.map((activity, index) => ({ submissionId: `submission-fixture-addition-${index + 1}`, activityId: activity.id, title: activity.title, subject: activity.subject, conceptId: activity.conceptId, submittedAt: now, evaluationId: `evaluation-demo-addition-${index + 1}`, score: scores[index]!, status: "final" as const, correctItems: Math.round(scores[index]! * activity.items.length), totalItems: activity.items.length })),
      { submissionId: englishSubmission.id, activityId: englishActivity.id, title: englishActivity.title, subject: englishActivity.subject, conceptId: englishActivity.conceptId, submittedAt: now, evaluationId: englishEvaluation.id, score: englishEvaluation.score, status: englishEvaluation.status, correctItems: englishEvaluation.items.filter((item) => item.score === 1).length, totalItems: englishActivity.items.length },
    ];
    if (!db.prepare("SELECT 1 FROM report_snapshots WHERE id = ?").get("report-demo-1")) {
      const report: ReportSnapshot = { id: "report-demo-1", studentId: IDS.student, asOf: now, kind: "current", conceptStates: [mathState, englishState], evidence: [{ conceptId: IDS.concept, recentScores: scores, trend: "up", evidenceCount: 4 }, { conceptId: IDS.englishConcept, recentScores: englishState.recentScores, trend: "insufficient-data", evidenceCount: 1 }], strengths: learningPath.filter((concept) => concept.status === "secure").map((concept) => concept.conceptId), needsPractice: [], recommendedNextSteps: [recommendation.conciseReason], worksheetSummaries, learningPath, roadmapRevisionIds: [], recommendation, summary: `Addition observations: ${scores.map((score) => score.toFixed(2)).join(", ")}. The final comparable streak advances one step. ${recommendation.conciseReason}` };
      const reportArtifact = await saveArtifact(report, { source: "demo-report", kind: "report-snapshot" });
      for (const evaluationArtifact of [...mathEvaluationArtifacts, englishEvaluationArtifact]) {
        await store.addLineageEdge(evaluationArtifact.id, reportArtifact.id, "supports");
        repo.addArtifactEdge({ parentArtifactId: evaluationArtifact.id, childArtifactId: reportArtifact.id, relation: "supports" });
      }
      repo.saveReportSnapshot({ report: { ...report, artifactId: reportArtifact.id }, artifactId: reportArtifact.id, operationKey: "demo:report:1" });
    }
    const result = { studentId: IDS.student, activityIds: [...IDS.mathActivities, IDS.nextMathActivity, IDS.englishActivity, ...broaderActivities.map(({ id }) => id)], observationScores: scores, finalStep: mathState.step, finalDecision };
    repo.recordSyntheticDataset({ id: DEMO_DATASET_ID, version: DEMO_DATASET_VERSION, studentId: IDS.student, seededAt: now, manifest: { ...result, artifactIds: artifacts.map((artifact) => artifact.id), databasePath, artifactsDir } });
    return { ...result, artifacts };
  } finally { closeDatabase(db); }
}

if (import.meta.url === `file://${process.argv[1]}`) seedDemo().then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)).catch((error: unknown) => { process.stderr.write(`${String(error)}\n`); process.exitCode = 1; });
