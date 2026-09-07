import { NextResponse } from "next/server";
import { activateCurriculumProposal } from "@/lib/data";

export async function POST(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await params;
    const body = await request.json() as { actorId?: string; reason: string };
    return NextResponse.json({ ok: true, ...(await activateCurriculumProposal({ proposalId, actorId: body.actorId ?? "local-adult", reason: body.reason })) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Curriculum revision could not be activated" }, { status: 400 }); }
}
