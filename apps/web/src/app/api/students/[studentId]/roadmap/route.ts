import { NextResponse } from "next/server";
import { getLearnerRoadmaps } from "@/lib/data";

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params;
    return NextResponse.json(await getLearnerRoadmaps(studentId, false));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Learning roadmap could not be loaded" }, { status: 400 });
  }
}
