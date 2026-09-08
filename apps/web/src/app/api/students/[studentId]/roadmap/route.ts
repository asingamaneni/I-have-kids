import { NextResponse } from "next/server";
import { getLearnerRoadmaps } from "@/lib/data";

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params;
    const scope = new URL(request.url).searchParams.get("scope") === "demo" ? "demo" : "household";
    return NextResponse.json(await getLearnerRoadmaps(studentId, false, scope));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Learning roadmap could not be loaded" }, { status: 400 });
  }
}
