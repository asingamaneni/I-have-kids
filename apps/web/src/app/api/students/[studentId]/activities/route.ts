import { NextResponse } from "next/server";
import { getAvailableChildActivities } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getAvailableChildActivities(studentId);
  if (!data.student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json({ activities: data.activities, learningPathVersion: data.learningPathVersion });
}
