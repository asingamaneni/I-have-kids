import { NextResponse } from "next/server";
import { decideCurriculumProposal } from "@/lib/data";

export async function POST(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await params;
    const body = await request.json() as { decision: "approved" | "rejected"; reviewerId?: string; note: string };
    return NextResponse.json({ ok: true, decision: await decideCurriculumProposal({ proposalId, decision: body.decision, reviewerId: body.reviewerId ?? "local-adult", note: body.note }) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Curriculum decision could not be saved" }, { status: 400 }); }
}
