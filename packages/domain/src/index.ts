export * from "./generators.js";
export * from "./scoring.js";
export * from "./progression.js";
export * from "./recommendations.js";
export * from "./curriculum.js";
export * from "./registry.js";
export * from "./roadmap.js";
export * from "./sample-packs.js";

import type { ActivitySpec, CurriculumDefinition, StudentConceptState } from "@child-learning/contracts";

export function hasSecuredEvidence(state: StudentConceptState): boolean {
  const recent = state.recentScores.slice(-3);
  return state.status === "secure" || (recent.length === 3 && recent.every((score) => score >= 0.9));
}

export function isConceptReady(conceptId: string, curriculum: CurriculumDefinition, states: readonly StudentConceptState[]): boolean {
  const concept = curriculum.concepts.find((candidate) => candidate.id === conceptId);
  if (!concept) return false;
  const secure = new Set(states.filter(hasSecuredEvidence).map((state) => state.conceptId));
  return concept.prerequisites.every((id) => secure.has(id)) && concept.readinessConceptIds.every((id) => secure.has(id));
}

export function filterReadyActivities(activities: readonly ActivitySpec[], curriculum: CurriculumDefinition, states: readonly StudentConceptState[]): ActivitySpec[] {
  return activities.filter((activity) => isConceptReady(activity.conceptId, curriculum, states) && activity.prerequisiteConceptIds.every((id) => states.some((state) => state.conceptId === id && hasSecuredEvidence(state))));
}
