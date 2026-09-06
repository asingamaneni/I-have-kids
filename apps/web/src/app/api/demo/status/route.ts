import { NextResponse } from "next/server";
import { getStudentBundle } from "@/lib/data";
export async function GET() { const data = await getStudentBundle("student-demo-ava"); return NextResponse.json({ ready: Boolean(data.student), studentId: data.student?.id, activities: data.activities.length, submissions: data.submissions.length }); }
