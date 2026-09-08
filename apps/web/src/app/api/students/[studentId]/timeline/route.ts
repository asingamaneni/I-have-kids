import { NextResponse } from "next/server";
import { getStudentTimeline } from "@/lib/data";

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const scope = new URL(request.url).searchParams.get("scope") === "demo" ? "demo" : "household";
  const data = await getStudentTimeline(studentId, scope);
  if (!data.student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json({ timeline: data.timeline });
}
