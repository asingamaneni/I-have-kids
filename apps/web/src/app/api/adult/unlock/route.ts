import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function token(pin: string): string {
  return createHash("sha256").update(`learning-worktable:${pin}`).digest("hex");
}

export async function POST(request: Request) {
  const configured = process.env.LEARNING_ADULT_PIN;
  const form = await request.formData();
  const supplied = String(form.get("pin") ?? "");
  const nextParam = new URL(request.url).searchParams.get("next") ?? "/adult/student-demo-ava";
  const next = nextParam.startsWith("/adult/") || nextParam.startsWith("/print/") ? nextParam : "/adult/student-demo-ava";
  const suppliedToken = token(supplied);
  const configuredToken = configured ? token(configured) : "";
  if (!configured || !timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(configuredToken))) {
    const retry = new URL("/adult/unlock", request.url);
    retry.searchParams.set("next", next);
    retry.searchParams.set("error", "1");
    return NextResponse.redirect(retry, 303);
  }
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set("learning-adult-access", token(configured), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
