import type { ActivitySpec, HumanOverride, Recommendation, StudentConceptState } from "@child-learning/contracts";
import { reviewSchedule, recentTrend } from "./progression.js";
import type { ProgressEvent } from "@child-learning/contracts";

export interface RecommendationContext {
  studentId: string;
  now: Date | string;
  states: readonly StudentConceptState[];
  events?: readonly ProgressEvent[];
  overrides?: readonly HumanOverride[];
  availableMinutes?: number;
  preferredSubject?: ActivitySpec["subject"];
  adultGoalConceptIds?: readonly string[];
  recentActivities?: readonly Pick<ActivitySpec, "id" | "subject" | "conceptId">[];
  recommendationId?: string;
}

export function rankRecommendations(activities: readonly ActivitySpec[], context: RecommendationContext): Recommendation {
  const now = new Date(context.now);
  const stateByConcept = new Map(context.states.map((state) => [state.conceptId, state]));
  const eventsByConcept = new Map<string, ProgressEvent[]>();
  for (const event of context.events ?? []) {
    const list = eventsByConcept.get(event.conceptId) ?? []; list.push(event); eventsByConcept.set(event.conceptId, list);
  }
  const overrideByConcept = new Map((context.overrides ?? []).filter((override) => !override.expiresAt || Date.parse(override.expiresAt) >= now.getTime()).map((override) => [override.conceptId, override]));
  const recentActivities = context.recentActivities ?? [];
  const recentConceptCounts = new Map<string, number>();
  const recentSubjectCounts = new Map<ActivitySpec["subject"], number>();
  for (const activity of recentActivities) {
    recentConceptCounts.set(activity.conceptId, (recentConceptCounts.get(activity.conceptId) ?? 0) + 1);
    recentSubjectCounts.set(activity.subject, (recentSubjectCounts.get(activity.subject) ?? 0) + 1);
  }
  const mostRepeatedSubject = [...recentSubjectCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const candidates = activities.map((activity) => {
    const state = stateByConcept.get(activity.conceptId);
    const events = eventsByConcept.get(activity.conceptId) ?? [];
    const reasons: Recommendation["candidates"][number]["reasons"] = [];
    let score = 0;
    if (!state) { score += 45; reasons.push({ code: "next-step", message: "This concept has no recorded work yet, so it is a gentle starting point.", weight: 45 }); }
    else {
      const reviews = reviewSchedule(state.lastReviewedAt ?? state.updatedAt, now);
      const due = reviews.filter((review) => review.due);
      if (due.length) { score += 40 + due.length; reasons.push({ code: "review-due", message: `Review is due at ${due[0]!.intervalDays}-day spacing.`, weight: 40 + due.length }); }
      if (state.status === "revisit") { score += 50; reasons.push({ code: "revisit", message: "Recent confirmed evidence suggests revisiting this concept.", weight: 50 }); }
      if (state.status === "learning") { score += 15; reasons.push({ code: "targeted-practice", message: "Targeted practice supports the current learning step.", weight: 15 }); }
      if (state.status === "secure") { score += 5; reasons.push({ code: "variety", message: "A short review maintains a secure concept.", weight: 5 }); }
      const trend = recentTrend(events);
      if (trend.direction === "down") { score += 20; reasons.push({ code: "targeted-practice", message: "The recent trend is down, so focused practice is prioritized.", weight: 20 }); }
    }
    if (context.availableMinutes !== undefined) {
      const fits = activity.estimatedMinutes <= context.availableMinutes;
      const weight = fits ? 12 : -35;
      score += weight;
      reasons.push({ code: "session-fit", message: fits ? `The activity fits the available ${context.availableMinutes}-minute session.` : `The activity needs about ${activity.estimatedMinutes} minutes, longer than the available session.`, weight });
    }
    if (context.preferredSubject === activity.subject) { score += 10; reasons.push({ code: "subject-balance", message: `The requested subject is ${activity.subject}.`, weight: 10 }); }
    if ((context.adultGoalConceptIds ?? []).includes(activity.conceptId)) { score += 60; reasons.push({ code: "adult-goal", message: "An adult selected this concept as a current goal.", weight: 60 }); }
    const repeated = recentConceptCounts.get(activity.conceptId) ?? 0;
    if (repeated > 0) { const weight = -Math.min(36, repeated * 12); score += weight; reasons.push({ code: "recent-repetition", message: "This concept appeared recently, so variety is preferred unless stronger evidence outweighs it.", weight }); }
    if (mostRepeatedSubject && mostRepeatedSubject[1] >= 2 && activity.subject !== mostRepeatedSubject[0]) { score += 8; reasons.push({ code: "subject-balance", message: `Recent work leaned toward ${mostRepeatedSubject[0]}, so another subject adds balance.`, weight: 8 }); }
    const override = overrideByConcept.get(activity.conceptId);
    if (override) { score += 100; reasons.push({ code: "adult-goal", message: `An adult override requests step ${override.targetStep}: ${override.reason}`, weight: 100 }); }
    const unmet = activity.prerequisiteConceptIds.filter((id) => { const prereq = stateByConcept.get(id); return !prereq || (prereq.status !== "secure" && prereq.step === 0); });
    if (unmet.length) { score -= 100; reasons.push({ code: "prerequisite", message: `Prerequisite work is not yet secure (${unmet.join(", ")}).`, weight: -100 }); }
    if (reasons.length === 0) reasons.push({ code: "variety", message: "This activity adds variety while respecting the curriculum.", weight: 0 });
    return { activityId: activity.id, conceptId: activity.conceptId, score, reasons };
  }).sort((a, b) => b.score - a.score || a.conceptId.localeCompare(b.conceptId) || a.activityId.localeCompare(b.activityId));
  const selected = candidates[0];
  const primaryReason = selected?.reasons.reduce((best, reason) => reason.weight > best.weight ? reason : best);
  return {
    id: context.recommendationId ?? `recommendation-${context.studentId}-${now.toISOString()}`,
    studentId: context.studentId,
    candidates,
    selectedActivityId: selected?.activityId,
    conciseReason: primaryReason?.message ?? "No eligible activity is currently available.",
    generatedAt: now.toISOString(), policyVersion: "1.0",
  };
}

export const recommendActivities = rankRecommendations;
