import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { rejectEvaluation } from "@/lib/data";

export async function POST(request: Request, { params }: { params: Promise<{ evaluationId: string }> }) {
  try {
    const { evaluationId } = await params;
    const body = await request.json().catch(() => ({})) as { reviewerId?: string; reason?: string };
    if (!body.reason?.trim()) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
    const result = await rejectEvaluation(evaluationId, body.reviewerId ?? "adult-local", body.reason);
    const studentId = (result.evaluation as { studentId?: string } | undefined)?.studentId;
    if (studentId) revalidatePath(`/adult/${encodeURIComponent(studentId)}`, "layout");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Evaluation could not be rejected" }, { status: 400 });
  }
}
