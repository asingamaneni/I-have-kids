export function encodeLearnerSegment(studentId: string): string {
  return encodeURIComponent(studentId);
}

export function childHomeRoute(studentId: string): string {
  return `/child/${encodeLearnerSegment(studentId)}`;
}

export function childHistoryRoute(studentId: string): string {
  return `${childHomeRoute(studentId)}/history`;
}

export function childRoadmapRoute(studentId: string): string {
  return `${childHomeRoute(studentId)}/roadmap`;
}

export function childActivityRoute(studentId: string, activityId: string): string {
  return `${childHomeRoute(studentId)}/activity/${encodeURIComponent(activityId)}`;
}

export function childHowToRoute(studentId: string, activityId: string): string {
  return `${childActivityRoute(studentId, activityId)}/how-to`;
}

export function adultHomeRoute(studentId: string): string {
  return `/adult/${encodeLearnerSegment(studentId)}`;
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
  if (parsed.pathname === "/setup" || parsed.pathname.startsWith("/adult/") || parsed.pathname.startsWith("/print/")) return path;
  return "/";
}
