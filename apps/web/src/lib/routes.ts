export type LearnerRouteScope = "household" | "demo";

export function encodeLearnerSegment(studentId: string): string {
  return encodeURIComponent(studentId);
}

function learnerBase(scope: LearnerRouteScope): string {
  return scope === "demo" ? "/demo" : "";
}

export function childHomeRoute(studentId: string, scope: LearnerRouteScope = "household"): string {
  return `${learnerBase(scope)}/child/${encodeLearnerSegment(studentId)}`;
}

export function childHistoryRoute(studentId: string, scope: LearnerRouteScope = "household"): string {
  return `${childHomeRoute(studentId, scope)}/history`;
}

export function childRoadmapRoute(studentId: string, scope: LearnerRouteScope = "household"): string {
  return `${childHomeRoute(studentId, scope)}/roadmap`;
}

export function childActivityRoute(studentId: string, activityId: string, scope: LearnerRouteScope = "household"): string {
  return `${childHomeRoute(studentId, scope)}/activity/${encodeURIComponent(activityId)}`;
}

export function childHowToRoute(studentId: string, activityId: string, scope: LearnerRouteScope = "household"): string {
  return `${childActivityRoute(studentId, activityId, scope)}/how-to`;
}

export function adultHomeRoute(studentId: string, scope: LearnerRouteScope = "household"): string {
  return `${learnerBase(scope)}/adult/${encodeLearnerSegment(studentId)}`;
}

export function sanitizeAdultReturnPath(value: string | null | undefined): string {
  const hasControlCharacter = value ? Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) : false;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || hasControlCharacter) return "/";
  let parsed: URL;
  try {
    parsed = new URL(value, "http://local.invalid");
  } catch {
    return "/";
  }
  if (parsed.origin !== "http://local.invalid") return "/";
  const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  if (parsed.pathname === "/setup" || parsed.pathname.startsWith("/adult/") || parsed.pathname.startsWith("/demo/adult/") || parsed.pathname.startsWith("/print/")) return path;
  return "/";
}
