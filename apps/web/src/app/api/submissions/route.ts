import { NextResponse } from "next/server";
import { SubmissionSchema } from "@kindergarten/contracts";
import { saveDigitalSubmission } from "@/lib/data";
export async function POST(request: Request) { try { const parsed = SubmissionSchema.parse(await request.json()); const result = await saveDigitalSubmission(parsed); const submission = result.submission as { id: string }; const evaluation = result.evaluation as { id: string; score: number }; return NextResponse.json({ ok: true, submissionId: submission.id, evaluationId: evaluation.id, score: evaluation.score }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Submission was not saved" }, { status: 400 }); } }
