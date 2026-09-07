import { NextResponse, type NextRequest } from "next/server";

async function pinToken(pin: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`learning-worktable:${pin}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function proxy(request: NextRequest) {
  const pin = process.env.LEARNING_ADULT_PIN;
  if (!pin || request.nextUrl.pathname === "/adult/unlock") return NextResponse.next();
  const current = request.cookies.get("learning-adult-access")?.value;
  if (current === await pinToken(pin)) return NextResponse.next();
  const unlock = new URL("/adult/unlock", request.url);
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Adult PIN required.", unlockUrl: unlock.pathname }, { status: 401 });
  unlock.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(unlock);
}

export const config = {
  matcher: [
    "/adult/:path*",
    "/setup",
    "/print/:path*",
    "/api/activities/generate",
    "/api/adult/students/:studentId/roadmap",
    "/api/artifacts/:path*",
    "/api/curriculum/:path*",
    "/api/learning-directives",
    "/api/overrides",
    "/api/reports",
    "/api/reviews/:path*",
    "/api/students",
    "/api/students/:studentId/progress",
    "/api/students/:studentId/timeline"
  ]
};
