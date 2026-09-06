import { NextResponse } from "next/server";
import { confirmEvaluation } from "@/lib/data";

export async function POST(request: Request, { params }: { params: Promise<{ evaluationId: string }> }) {
  try {
    const { evaluationId } = await params;
    const body = await request.json() as { reviewerId?: string; score?: number; rationale?: string };
    if (typeof body.score !== "number" || body.score < 0 || body.score > 1) throw new Error("Enter a reviewed score from 0 to 100 percent.");
    if (!body.rationale?.trim()) throw new Error("Describe what the adult verified.");
    const result = await confirmEvaluation(evaluationId, body.reviewerId ?? "adult-local", body.score, body.rationale.trim());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Evaluation could not be confirmed" }, { status: 400 });
  }
}
