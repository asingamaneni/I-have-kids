import { describe, expect, it } from "vitest";
import { EvaluationSchema, SubmissionSchema, type Evaluation, type Submission } from "@child-learning/contracts";
import { generateAdditionWithinTen } from "./generators.js";
import { deriveActivityLifecycle, orderActionableActivities, resolveActiveEvaluation } from "./activity-projection.js";
import { rankRecommendations } from "./recommendations.js";

const at = "2026-01-01T00:00:00.000Z";
const activity = generateAdditionWithinTen({ seed: 7, studentId: "s", itemCount: 2, now: at });
function submission(id: string, submittedAt = at): Submission { return SubmissionSchema.parse({ id, activityId: activity.id, studentId: "s", responses: [], submittedAt }); }
function evaluation(id: string, submissionId: string, status: Evaluation["status"], extra: Partial<Evaluation> = {}): Evaluation {
  return EvaluationSchema.parse({ id, submissionId, studentId: "s", conceptId: activity.conceptId, score: .5, items: [{ itemId: activity.items[0]!.id, score: .5, mistakeTags: [], evidenceStatus: status === "final" ? "confirmed" : "unconfirmed", rationale: "Evidence." }], evidence: [], confidence: status === "final" ? 1 : .2, evaluatorType: status === "final" ? "deterministic" : "human", status, followUp: { required: false, recommendedActivityIds: [] }, evaluatedAt: at, ...extra });
}

describe("activity lifecycle projection", () => {
  it("distinguishes untouched, pending, final, and corrections", () => {
    expect(deriveActivityLifecycle(activity, [], []).status).toBe("not-attempted");
    const attempt = submission("sub");
    expect(deriveActivityLifecycle(activity, [attempt], []).status).toBe("awaiting-validation");
    expect(deriveActivityLifecycle(activity, [attempt], [evaluation("pending", "sub", "needs-human-review")]).status).toBe("awaiting-validation");
    expect(deriveActivityLifecycle(activity, [attempt], [evaluation("final", "sub", "final")]).status).toBe("complete");
  });

  it("resolves the active append-only evaluation leaf", () => {
    const proposed = evaluation("proposal", "sub", "needs-human-review");
    const rejected = evaluation("rejected", "sub", "superseded", { supersedesEvaluationId: proposed.id, followUp: { required: true, reason: "Try again.", recommendedActivityIds: [] }, evaluatedAt: "2026-01-02T00:00:00.000Z" });
    expect(resolveActiveEvaluation([proposed, rejected], "sub")?.id).toBe("rejected");
    expect(deriveActivityLifecycle(activity, [submission("sub")], [proposed, rejected]).status).toBe("corrections-needed");
  });

  it("does not infer corrections from a low final score", () => {
    expect(deriveActivityLifecycle(activity, [submission("sub")], [evaluation("final", "sub", "final")]).status).toBe("complete");
  });

  it("places explicit corrections before ranked new work", () => {
    const second = { ...activity, id: `${activity.id}-2`, createdAt: "2026-01-02T00:00:00.000Z" };
    const recommendation = rankRecommendations([activity, second], { studentId: "s", now: at, states: [] });
    const correction = deriveActivityLifecycle(activity, [submission("sub")], [evaluation("retry", "sub", "final", { followUp: { required: true, reason: "Correct it.", recommendedActivityIds: [] } })]);
    const ordered = orderActionableActivities([deriveActivityLifecycle(second, [], []), correction], recommendation);
    expect(ordered[0]?.status).toBe("corrections-needed");
  });
});
