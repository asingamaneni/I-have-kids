import { NextResponse } from "next/server";
import { getCurriculumOverview, proposeCurriculum } from "@/lib/data";

export async function GET() {
  try { return NextResponse.json(await getCurriculumOverview()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Curriculum could not be loaded" }, { status: 400 }); }
}

export async function POST(request: Request) {
  try { return NextResponse.json({ ok: true, ...(await proposeCurriculum(await request.json())) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Curriculum proposal could not be saved" }, { status: 400 }); }
}
