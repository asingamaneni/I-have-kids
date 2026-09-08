import type { ActivityLifecycleStatus, ActivitySpec, Evaluation, Recommendation, Submission } from "@child-learning/contracts";

export type ActivityLifecycleProjection = {
  activity: ActivitySpec;
  status: ActivityLifecycleStatus;
  submissions: readonly Submission[];
  latestSubmission?: Submission;
  activeEvaluation?: Evaluation;
};

function newest<T>(values: readonly T[], at: (value: T) => string, id: (value: T) => string): T | undefined {
  return [...values].sort((left, right) => at(right).localeCompare(at(left)) || id(right).localeCompare(id(left)))[0];
}

export function latestSubmissionForActivity(submissions: readonly Submission[], activityId: string): Submission | undefined {
  return newest(submissions.filter((submission) => submission.activityId === activityId), (submission) => submission.submittedAt, (submission) => submission.id);
}

export function resolveActiveEvaluation(evaluations: readonly Evaluation[], submissionId: string): Evaluation | undefined {
  const forSubmission = evaluations.filter((evaluation) => evaluation.submissionId === submissionId);
  const superseded = new Set(forSubmission.flatMap((evaluation) => evaluation.supersedesEvaluationId ? [evaluation.supersedesEvaluationId] : []));
  const leaves = forSubmission.filter((evaluation) => !superseded.has(evaluation.id));
  return newest(leaves.length > 0 ? leaves : forSubmission, (evaluation) => evaluation.evaluatedAt, (evaluation) => evaluation.id);
}

export function deriveActivityLifecycle(activity: ActivitySpec, submissions: readonly Submission[], evaluations: readonly Evaluation[]): ActivityLifecycleProjection {
  const attempts = submissions.filter((submission) => submission.activityId === activity.id).sort((left, right) => left.submittedAt.localeCompare(right.submittedAt) || left.id.localeCompare(right.id));
  const latestSubmission = latestSubmissionForActivity(attempts, activity.id);
  if (!latestSubmission) return { activity, status: "not-attempted", submissions: attempts };
  const activeEvaluation = resolveActiveEvaluation(evaluations, latestSubmission.id);
  if (!activeEvaluation || activeEvaluation.status === "draft" || activeEvaluation.status === "needs-human-review") return { activity, status: "awaiting-validation", submissions: attempts, latestSubmission, ...(activeEvaluation ? { activeEvaluation } : {}) };
  if (activeEvaluation.status === "superseded" || activeEvaluation.followUp.required) return { activity, status: "corrections-needed", submissions: attempts, latestSubmission, activeEvaluation };
  return { activity, status: "complete", submissions: attempts, latestSubmission, activeEvaluation };
}

export function projectActivityLifecycles(activities: readonly ActivitySpec[], submissions: readonly Submission[], evaluations: readonly Evaluation[]): ActivityLifecycleProjection[] {
  return activities.map((activity) => deriveActivityLifecycle(activity, submissions, evaluations));
}

export function orderActionableActivities(projections: readonly ActivityLifecycleProjection[], recommendation: Recommendation): ActivityLifecycleProjection[] {
  const candidateRank = new Map(recommendation.candidates.map((candidate, index) => [candidate.activityId, index]));
  const statusRank: Record<ActivityLifecycleStatus, number> = { "corrections-needed": 0, "not-attempted": 1, "awaiting-validation": 2, complete: 3 };
  return [...projections].sort((left, right) => statusRank[left.status] - statusRank[right.status]
    || (candidateRank.get(left.activity.id) ?? Number.MAX_SAFE_INTEGER) - (candidateRank.get(right.activity.id) ?? Number.MAX_SAFE_INTEGER)
    || right.activity.createdAt.localeCompare(left.activity.createdAt)
    || left.activity.id.localeCompare(right.activity.id));
}

export function childLifecycleLabels(status: ActivityLifecycleStatus): { statusLabel: string; actionLabel: string } {
  if (status === "awaiting-validation") return { statusLabel: "Waiting for a check", actionLabel: "Waiting" };
  if (status === "corrections-needed") return { statusLabel: "Corrections ready", actionLabel: "Fix and try again" };
  if (status === "complete") return { statusLabel: "Completed", actionLabel: "Practice again" };
  return { statusLabel: "Not started", actionLabel: "Start" };
}
