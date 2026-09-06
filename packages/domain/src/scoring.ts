import type { ActivitySpec, Evaluation, Submission } from "@kindergarten/contracts";

export interface ScoreResult { score: number; mistakeTags: string[]; rationale: string; }
export interface ScoreSubmissionOptions { evaluationId?: string; now?: Date | string; evaluatorType?: "deterministic" | "review_gated_precheck" | "human" | "hybrid" | "claude_code_assisted"; }
const normalize = (value: unknown): string => String(value ?? "").trim().toLocaleLowerCase();
const numericValue = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const numbers = (value: unknown): number[] => {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value !== "string") return [];
  return value.split(/[\s,>→-]+/).filter(Boolean).map(Number);
};

export function scoreResponse(activity: ActivitySpec, itemId: string, value: unknown): ScoreResult {
  const spec = activity.answerSpecs[itemId];
  if (!spec) return { score: 0, mistakeTags: ["unknown-item"], rationale: "No answer specification was found." };
  switch (spec.type) {
    case "integer": {
      const actual = numericValue(value);
      return Number.isInteger(actual) && actual === spec.expected
        ? { score: 1, mistakeTags: [], rationale: "The answer matches the expected number." }
        : { score: 0, mistakeTags: ["number-counting-error"], rationale: "The answer does not match the expected number." };
    }
    case "number": {
      const actual = numericValue(value);
      return actual !== undefined && actual === spec.expected
        ? { score: 1, mistakeTags: [], rationale: "The answer matches the expected value." }
        : { score: 0, mistakeTags: ["number-fact-error"], rationale: "The answer does not match the expected value." };
    }
    case "choice":
      return normalize(value) === normalize(spec.expected)
        ? { score: 1, mistakeTags: [], rationale: "The selected choice is correct." }
        : { score: 0, mistakeTags: ["choice-selection-error"], rationale: "The selected choice is not the expected choice." };
    case "text": {
      const actual = spec.normalize === "exact" ? String(value ?? "") : normalize(value);
      const expected = spec.normalize === "exact" ? spec.expected : normalize(spec.expected);
      return actual === expected
        ? { score: 1, mistakeTags: [], rationale: "The response matches the expected text." }
        : { score: 0, mistakeTags: ["text-or-sound-error"], rationale: "The response does not match the expected text." };
    }
    case "sequence": {
      const actual = numbers(value);
      const correct = actual.length === spec.expected.length && actual.every((entry, i) => entry === spec.expected[i]);
      return correct ? { score: 1, mistakeTags: [], rationale: "The sequence is in the expected order." } : { score: 0, mistakeTags: ["sequence-order-error"], rationale: "The sequence order differs from the expected order." };
    }
    case "rubric":
      return { score: 0, mistakeTags: ["human-review-required"], rationale: "This response requires human rubric review." };
    case "observation":
      return { score: 0, mistakeTags: ["human-review-required"], rationale: "This observation requires human review." };
  }
}

export function scoreSubmission(activity: ActivitySpec, submission: Submission, options: ScoreSubmissionOptions = {}): Evaluation {
  const responseByItem = new Map(submission.responses.map((response) => [response.itemId, response]));
  const itemResults = activity.items.map((item) => {
    const response = responseByItem.get(item.id);
    const result = scoreResponse(activity, item.id, response?.value);
    return { itemId: item.id, score: result.score, mistakeTags: result.mistakeTags, evidenceStatus: result.mistakeTags.includes("human-review-required") ? "unconfirmed" as const : "confirmed" as const, rationale: result.rationale };
  });
  const score = itemResults.length === 0 ? 0 : itemResults.reduce((sum, item) => sum + item.score, 0) / itemResults.length;
  const needsReview = itemResults.some((item) => item.evidenceStatus !== "confirmed");
  return {
    id: options.evaluationId ?? `evaluation-${submission.id}`, submissionId: submission.id, studentId: submission.studentId,
    conceptId: activity.conceptId, score, items: itemResults,
    evidence: itemResults.map((item) => `${item.itemId}:${item.score}`), confidence: needsReview ? 0.4 : 1,
    evaluatorType: options.evaluatorType ?? (needsReview ? "review_gated_precheck" : "deterministic"),
    status: needsReview ? "needs-human-review" : "final", version: "1.0", followUp: needsReview ? { required: true, reason: "Human review is needed for subjective evidence.", recommendedActivityIds: [] } : { required: false, recommendedActivityIds: [] },
    evaluatedAt: new Date(options.now ?? submission.submittedAt).toISOString(),
  };
}

export function recurringMistakeTags(evaluations: readonly Evaluation[], minimumOccurrences = 2): string[] {
  const counts = new Map<string, number>();
  for (const evaluation of evaluations) for (const item of evaluation.items) for (const tag of item.mistakeTags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count >= minimumOccurrences).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
}

export const scoreActivity = scoreSubmission;
export const getRecurringMistakeTags = recurringMistakeTags;
