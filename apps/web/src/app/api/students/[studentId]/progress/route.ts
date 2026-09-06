import { NextResponse } from "next/server";
import { getStudentProgressRows } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getStudentProgressRows(studentId);
  if (!data.student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json({ states: data.states });
}
