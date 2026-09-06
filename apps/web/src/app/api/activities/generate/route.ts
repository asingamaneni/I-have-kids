import { NextResponse } from "next/server";
import { ActivityGenerationRequestSchema } from "@kindergarten/contracts";
import { generateAndStoreActivity } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const body = ActivityGenerationRequestSchema.parse(await request.json());
    const studentId = body.studentId ?? "student-demo-ava";
    const stored = await generateAndStoreActivity({ studentId, seed: body.seed ?? Date.now(), ...(body.subject === undefined ? {} : { subject: body.subject }), ...(body.conceptId === undefined ? {} : { conceptId: body.conceptId }), ...(body.generator === undefined ? {} : { generator: body.generator }), ...(body.itemCount === undefined ? {} : { itemCount: body.itemCount }), ...(body.representationStage === undefined ? {} : { representationStage: body.representationStage }) });
    return NextResponse.json({ ...stored, persisted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not generate activity" }, { status: 400 });
  }
}
