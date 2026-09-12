// Seed data for skill evals. Every fixture goes through the public LocalService API so it exercises
// the same code path the MCP tools use. The test-only demo seed in packages/mcp-server/tests is
// deliberately not imported here (see docs/decisions/0010-skill-evals.md).
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ActivitySpec, Submission } from "../packages/contracts/src/index.ts";
import { createLocalService, type LocalService } from "../packages/mcp-server/src/service.ts";

export const FIXTURE_CLOCK = "2026-02-01T00:00:00.000Z";
const STUDENT_ID = "student-eval";

export interface Fixture {
  description: string;
  /** Placeholder keys the fixture guarantees to return. */
  provides: readonly string[];
  seed(service: LocalService): Promise<Record<string, string>>;
}

type Values = Record<string, string>;

function answerFor(spec: ActivitySpec, itemId: string, correct: boolean): unknown {
  const answer = spec.answerSpecs[itemId];
  if (!answer) return null;
  switch (answer.type) {
    case "integer": case "number": return correct ? answer.expected : answer.expected + 1;
    case "text": case "choice": return correct ? answer.expected : "wrong";
    case "sequence": return correct ? answer.expected : [...answer.expected].reverse();
    default: return "review";
  }
}

function responsesFor(spec: ActivitySpec, correctCount: number, capturedAt: string): Submission["responses"] {
  return spec.items.map((item, index) => ({ itemId: item.id, value: answerFor(spec, item.id, index < correctCount), capturedAt }));
}

function adultSpec(service: LocalService, activityId: string): ActivitySpec {
  return service.getActivity(activityId, true) as unknown as ActivitySpec;
}

function daysAfter(base: string, days: number): string {
  return new Date(new Date(base).getTime() + days * 86_400_000).toISOString();
}

async function seedAwaitingIntake(service: LocalService): Promise<Values> {
  await service.createLearnerWithIntake({ id: STUDENT_ID, displayName: "Eval Learner", selectedSubjects: ["math", "english"] });
  return { studentId: STUDENT_ID };
}

async function seedWithPath(service: LocalService): Promise<Values> {
  const result = await service.createLearnerWithIntake({ id: STUDENT_ID, displayName: "Eval Learner", selectedSubjects: ["math", "english"], currentCapabilities: ["math.adds-with-symbols"] }) as { starters: Array<{ activity: ActivitySpec }> };
  const starter = result.starters[0]?.activity;
  if (!starter) throw new Error("fixture learner-with-path: intake produced no starter activity");
  return { studentId: STUDENT_ID, starterActivityId: starter.id, conceptId: starter.conceptId };
}

async function seedWithSubmission(service: LocalService): Promise<Values> {
  const values = await seedWithPath(service);
  const spec = adultSpec(service, values.starterActivityId!);
  const submissionId = "submission-eval-1";
  const result = await service.recordDigitalSubmission({ id: submissionId, activityId: spec.id, studentId: STUDENT_ID, responses: responsesFor(spec, spec.items.length, FIXTURE_CLOCK) }) as { evaluation: { id: string }; unlockedActivity?: { activity: ActivitySpec } };
  return {
    ...values,
    activityId: spec.id,
    submissionId,
    evaluationId: result.evaluation.id,
    unlockedActivityId: result.unlockedActivity?.activity.id ?? ""
  };
}

async function seedWithPendingReview(service: LocalService): Promise<Values> {
  const values = await seedWithSubmission(service);
  const proposal = await service.proposeUploadedWorkEvaluation({ submissionId: values.submissionId!, evidence: ["Adult uploaded a photo of the worksheet; two answers are hard to read."], confidence: 0.4, rationale: "Handwriting is ambiguous on two items." }) as { evaluation: { id: string } };
  return { ...values, pendingEvaluationId: proposal.evaluation.id };
}

async function seedWithHistory(service: LocalService): Promise<Values> {
  const values = await seedWithSubmission(service);
  const plan = [
    { seed: 11, correct: 3, day: 2 },
    { seed: 12, correct: 4, day: 5 },
    { seed: 13, correct: 5, day: 9 }
  ];
  const activityIds: string[] = [];
  for (const [index, step] of plan.entries()) {
    const generated = service.generateActivity({ conceptId: values.conceptId!, studentId: STUDENT_ID, seed: step.seed, itemCount: 5, now: daysAfter(FIXTURE_CLOCK, step.day) });
    const stored = await service.validateAndStoreActivity(generated) as { activity: ActivitySpec };
    const submittedAt = daysAfter(FIXTURE_CLOCK, step.day);
    await service.recordDigitalSubmission({ id: `submission-eval-history-${index + 1}`, activityId: stored.activity.id, studentId: STUDENT_ID, responses: responsesFor(stored.activity, step.correct, submittedAt), submittedAt });
    activityIds.push(stored.activity.id);
  }
  return { ...values, historyActivityId: activityIds[0]!, historyEvaluationId: "evaluation-submission-eval-history-1", latestActivityId: activityIds.at(-1)!, latestSubmissionId: `submission-eval-history-${plan.length}`, reportDate: daysAfter(FIXTURE_CLOCK, 10).slice(0, 10) };
}

export const FIXTURES: Record<string, Fixture> = {
  "empty": { description: "Fresh store with no learner.", provides: [], seed: async () => ({}) },
  "learner-awaiting-intake": { description: "Learner profile exists but intake is incomplete; no activities may be generated.", provides: ["studentId"], seed: seedAwaitingIntake },
  "learner-with-path": { description: "Learner with an adult-reported capability, a starter diagnostic, and a reconciled roadmap.", provides: ["studentId", "starterActivityId", "conceptId"], seed: seedWithPath },
  "learner-with-submission": { description: "Learner who completed the starter diagnostic correctly; evaluation is final and confirmed.", provides: ["studentId", "starterActivityId", "conceptId", "activityId", "submissionId", "evaluationId", "unlockedActivityId"], seed: seedWithSubmission },
  "learner-with-pending-review": { description: "As learner-with-submission plus an uploaded-work evaluation awaiting adult review.", provides: ["studentId", "starterActivityId", "conceptId", "activityId", "submissionId", "evaluationId", "unlockedActivityId", "pendingEvaluationId"], seed: seedWithPendingReview },
  "learner-with-history": { description: "Learner with several scored submissions over ten days for reports, reviews, and recommendations.", provides: ["studentId", "starterActivityId", "conceptId", "activityId", "submissionId", "evaluationId", "unlockedActivityId", "historyActivityId", "historyEvaluationId", "latestActivityId", "latestSubmissionId", "reportDate"], seed: seedWithHistory }
};

export interface SeededStore { databasePath: string; artifactsDir: string; values: Record<string, string>; }

/** Seed a fixture into `<dataDir>` and close the service so the headless Claude process owns the database. */
export async function seedFixture(name: string, dataDir: string, projectRoot: string): Promise<SeededStore> {
  const fixture = FIXTURES[name];
  if (!fixture) throw new Error(`unknown fixture "${name}" (known: ${Object.keys(FIXTURES).join(", ")})`);
  await mkdir(dataDir, { recursive: true });
  const databasePath = join(dataDir, "learning.db");
  const artifactsDir = join(dataDir, "artifacts");
  const service = createLocalService({ projectRoot, databasePath, artifactsDir, clock: () => FIXTURE_CLOCK });
  try {
    const values = await fixture.seed(service);
    for (const key of fixture.provides) if (!(key in values)) throw new Error(`fixture ${name} promised ${key} but did not provide it`);
    return { databasePath, artifactsDir, values };
  } finally {
    service.close();
  }
}
