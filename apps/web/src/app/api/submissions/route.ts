import { NextResponse } from "next/server";
import { SubmissionSchema } from "@child-learning/contracts";
import { saveDigitalSubmission } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const submissionInput = { ...body };
    delete submissionInput.dataScope;
    const parsed = SubmissionSchema.parse(submissionInput);
    const result = await saveDigitalSubmission(parsed);
    const submission = result.submission as { id: string };
    const evaluation = result.evaluation as { id: string; status: string };
    return NextResponse.json({ ok: true, submissionId: submission.id, evaluationId: evaluation.id, lifecycle: evaluation.status === "needs-human-review" ? "awaiting-validation" : "complete" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Submission was not saved" }, { status: 400 });
  }
}
