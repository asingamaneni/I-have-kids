import type { ActivitySpec, Evaluation, ProgressEvent, ProgressionPolicy, StudentConceptState } from "@child-learning/contracts";

export const DEFAULT_PROGRESSION_POLICY: ProgressionPolicy = {
  schemaVersion: "1.0", consecutiveToAdvance: 3, advanceThreshold: 0.9, maintainMin: 0.75,
  targetedPracticeMin: 0.6, evidenceMinForRevisit: 0.7, maxStepChange: 1,
};

type ComparableActivity = Pick<ActivitySpec, "subject" | "conceptId" | "items"> & Partial<Pick<ActivitySpec, "difficultyLevel" | "activityType" | "visualSupport" | "representationStage" | "evidencePurpose">>;
export function comparabilityKey(activity: ComparableActivity): string {
  const kinds = [...new Set(activity.items.map((item) => item.kind))].sort().join(",");
  const support = typeof activity.visualSupport === "boolean" ? activity.visualSupport : activity.visualSupport?.enabled ?? false;
  return `${activity.subject}|${activity.conceptId}|stage:${activity.representationStage ?? "pictorial"}|purpose:${activity.evidencePurpose ?? "formative"}|difficulty:${activity.difficultyLevel ?? 0}|activity:${activity.activityType ?? "practice"}|items:${activity.items.length}|support:${support ? "on" : "off"}|kinds:${kinds}`;
}

export function progressEventsFromEvaluation(evaluation: Evaluation, activity: ActivitySpec, occurredAt = evaluation.evaluatedAt): ProgressEvent {
  const confirmedEvidence = evaluation.items.every((item) => item.evidenceStatus === "confirmed");
  const comparable = confirmedEvidence && activity.evidencePurpose !== "exploration";
  return { id: `progress-${evaluation.id}`, studentId: evaluation.studentId, conceptId: evaluation.conceptId, evaluationId: evaluation.id, score: evaluation.score, eventType: confirmedEvidence ? "observation" : "review", comparable, evidenceStatus: confirmedEvidence ? "confirmed" : "unconfirmed", confidence: evaluation.confidence, comparabilityKey: activity.comparabilityKey, occurredAt };
}

function confirmed(event: ProgressEvent): boolean { return event.evidenceStatus === "confirmed"; }
function scoredObservation(event: ProgressEvent): boolean {
  return event.eventType === "observation" && confirmed(event) && typeof event.score === "number" && event.comparable !== false;
}
function sortedObservations(events: readonly ProgressEvent[]): ProgressEvent[] {
  return [...events].filter(scoredObservation).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
}
function latestComparableGroup(events: readonly ProgressEvent[]): ProgressEvent[] {
  const observations = sortedObservations(events);
  const latestKey = observations.at(-1)?.comparabilityKey;
  if (!latestKey) return observations.filter((event) => !event.comparabilityKey);
  return observations.filter((event) => event.comparabilityKey === latestKey);
}
function isFreshDifficultyWindow(state: StudentConceptState, events: readonly ProgressEvent[]): boolean {
  const observations = sortedObservations(events);
  const latest = observations.at(-1);
  const group = latestComparableGroup(events);
  if (!latest?.comparabilityKey || !state.lastEvidenceAt || latest.occurredAt <= state.lastEvidenceAt || group.length > state.recentScores.length) return false;
  let groupStart = observations.length - 1;
  while (groupStart > 0 && observations[groupStart - 1]?.comparabilityKey === latest.comparabilityKey) groupStart -= 1;
  return groupStart > 0 && observations[groupStart - 1]?.comparabilityKey !== latest.comparabilityKey;
}
function currentStepObservations(state: StudentConceptState, events: readonly ProgressEvent[], advanceThreshold: number): ProgressEvent[] {
  const group = latestComparableGroup(events);
  // A state whose latest qualifying window is all high represents work already
  // consumed by an earlier advance. A mixed window is still eligible to complete.
  const consumedWindow = state.recentScores.length >= 3 && state.recentScores.slice(-3).every((score) => score >= advanceThreshold);
  const baseline = consumedWindow && !isFreshDifficultyWindow(state, events) ? Math.min(state.recentScores.length, group.length) : 0;
  return group.slice(baseline);
}

export type ProgressionDecision = "advance" | "maintain" | "targeted-practice" | "revisit" | "no-change";
export interface ProgressionProjection { step: number; status: StudentConceptState["status"]; decision: ProgressionDecision; reason: string; }

export function projectProgression(state: StudentConceptState, events: readonly ProgressEvent[], policy: ProgressionPolicy = DEFAULT_PROGRESSION_POLICY): ProgressionProjection {
  const fresh = currentStepObservations(state, events, policy.advanceThreshold);
  const latest = fresh.at(-1) ?? latestComparableGroup(events).at(-1);
  if (!latest || latest.evidenceStatus !== "confirmed") return { step: state.step, status: state.status, decision: "no-change", reason: "Progress is unchanged because the latest comparable evidence is ambiguous or unconfirmed." };
  const score = latest.score ?? 0;
  const windowSize = policy.consecutiveToAdvance;
  const group = latestComparableGroup(events);
  const consumedWindow = state.recentScores.length >= windowSize && state.recentScores.slice(-windowSize).every((value) => value >= policy.advanceThreshold);
  const baselineAtSameDifficulty = consumedWindow
    && !isFreshDifficultyWindow(state, events)
    && group.length >= state.recentScores.length
    && group[state.recentScores.length - 1]?.comparabilityKey === latest.comparabilityKey;
  const highWindow = !baselineAtSameDifficulty && fresh.length >= windowSize && fresh.slice(-windowSize).every((event) => (event.score ?? 0) >= policy.advanceThreshold);
  if (highWindow) return { step: Math.min(10, state.step + 1), status: "learning", decision: "advance", reason: `Three consecutive comparable results were consumed for this controlled step at the current difficulty; the previous step is secure and difficulty advances by one controlled step.` };
  if (score >= policy.maintainMin) return { step: state.step, status: "learning", decision: "maintain", reason: score >= policy.advanceThreshold ? `A high result is promising, but three consecutive comparable results are required before advancing.` : "The result is in the maintain range (75–89%)." };
  if (score >= policy.targetedPracticeMin) return { step: state.step, status: "learning", decision: "targeted-practice", reason: "The result is in the targeted-practice range (60–74%)." };
  if ((latest.confidence ?? 1) < policy.evidenceMinForRevisit) return { step: state.step, status: state.status, decision: "no-change", reason: "Evidence confidence is insufficient to change progression." };
  return { step: Math.max(0, state.step - 1), status: "revisit", decision: "revisit", reason: "A confirmed result below 60% with sufficient evidence calls for a one-step revisit." };
}

export function recentTrend(events: readonly ProgressEvent[], windowSize = 5): { scores: number[]; direction: "up" | "down" | "flat" | "insufficient-data"; average: number } {
  const scores = latestComparableGroup(events).slice(-windowSize).map((event) => event.score ?? 0);
  if (scores.length < 2) return { scores, direction: "insufficient-data", average: scores[0] ?? 0 };
  const delta = scores.at(-1)! - scores[0]!;
  return { scores, direction: delta > 0.05 ? "up" : delta < -0.05 ? "down" : "flat", average: scores.reduce((sum, score) => sum + score, 0) / scores.length };
}

export function projectStudentConceptState(state: StudentConceptState, events: readonly ProgressEvent[], policy = DEFAULT_PROGRESSION_POLICY): StudentConceptState {
  const projection = projectProgression(state, events, policy);
  const latestGroup = latestComparableGroup(events);
  const latest = latestGroup.at(-1);
  return { ...state, step: projection.step, status: projection.status, recentScores: latestGroup.slice(-60).map((event) => event.score ?? 0), lastEvidenceAt: latest?.occurredAt ?? state.lastEvidenceAt, updatedAt: latest?.occurredAt ?? state.updatedAt };
}

export interface ReviewDue { intervalDays: 1 | 7 | 21 | 60; dueAt: string; due: boolean; }
export function reviewSchedule(lastReviewedAt: Date | string, now: Date | string): ReviewDue[] {
  const start = new Date(lastReviewedAt).getTime(); const current = new Date(now).getTime();
  return ([1, 7, 21, 60] as const).map((intervalDays) => { const dueAt = new Date(start + intervalDays * 86_400_000).toISOString(); return { intervalDays, dueAt, due: current >= Date.parse(dueAt) }; });
}

export function evaluationProgressEvent(evaluation: Evaluation, activity: ActivitySpec): ProgressEvent { return progressEventsFromEvaluation(evaluation, activity); }
export const getComparabilityKey = comparabilityKey;
export const projectRecentState = projectStudentConceptState;
export const getReviewSchedule = reviewSchedule;
