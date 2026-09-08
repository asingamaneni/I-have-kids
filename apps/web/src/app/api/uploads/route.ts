import { NextResponse } from "next/server";
import { savePhotoSubmission } from "@/lib/data";
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const studentId = String(form.get("studentId") ?? "");
    const activityId = String(form.get("activityId") ?? "");
    const dataScope = form.get("dataScope") === "demo" ? "demo" : "household";
    const retryOfSubmissionId = String(form.get("retryOfSubmissionId") ?? "") || undefined;
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Choose a PNG or JPEG image first.");
    const result = await savePhotoSubmission(studentId, activityId, file, dataScope, retryOfSubmissionId);
    const evaluation = result.evaluation as { id: string };
    return NextResponse.json({
      ok: true,
      artifact: { id: result.normalizedArtifact.id, mediaType: result.normalizedArtifact.mediaType, byteLength: result.normalizedArtifact.byteLength, needsReview: true },
      originalArtifactId: result.originalArtifactId,
      normalizedArtifactId: result.normalizedArtifactId,
      submissionId: result.submission.id,
      evaluationId: evaluation.id,
      needsReview: true,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
