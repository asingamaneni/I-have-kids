"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PackageOpen } from "lucide-react";
import type { WorksheetActivity } from "@child-learning/rendering";
import { WorksheetRenderer } from "@child-learning/rendering";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { childHomeRoute } from "@/lib/routes";

export function ActivityForm({ activity, retryOfSubmissionId }: { activity: WorksheetActivity; retryOfSubmissionId?: string }) {
  const handsOn = activity.deliveryMode === "hands-on" && activity.presentation;
  const [showWorksheet, setShowWorksheet] = useState(!handsOn);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");
    const form = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const payload = {
      id: `submission-${activity.id}-${Date.now()}`,
      activityId: activity.id,
      studentId: activity.studentId,
      submittedAt: now,
      ...(retryOfSubmissionId ? { retryOfSubmissionId } : {}),
      responses: activity.items.map((item) => ({ itemId: item.id, value: form.get(`response-${item.id}`) ?? "", capturedAt: now })),
    };
    try {
      const response = await fetch("/api/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { submissionId?: string; error?: string };
      if (!response.ok) throw new Error(String(result.error ?? "Could not save work"));
      setStatus("saved");
      const submissionId = encodeURIComponent(String(result.submissionId ?? payload.id));
      router.push(`${childHomeRoute(activity.studentId)}/complete?submissionId=${submissionId}`);
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Could not save work");
    }
  }

  return <form onSubmit={submit} className="activity-form">
    {handsOn && <Card className="hands-on-card"><CardHeader><div className="hands-on-heading"><span><PackageOpen /></span><div><CardDescription>Learn with real objects</CardDescription><CardTitle>{activity.title}</CardTitle></div></div></CardHeader><CardContent className="grid gap-5"><p className="hands-on-invitation">{activity.presentation!.childInvitation}</p><div className="materials-list"><strong>You need</strong>{activity.presentation!.materials.map((material) => <span key={material}>{material}</span>)}</div><ol className="hands-on-steps">{activity.presentation!.steps.map((step) => <li key={step}>{step}</li>)}</ol>{!showWorksheet && <Button size="lg" type="button" onClick={() => setShowWorksheet(true)}>Next: try the picture page<ArrowRight /></Button>}</CardContent></Card>}
    {showWorksheet && <><WorksheetRenderer activity={activity} options={{ mode: "digital" }} /><div className="response-capture"><Button size="lg" disabled={status === "saving"} type="submit">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Finish activity"}</Button>{status === "saved" && <p className="success-note" role="status">Your work is saved.</p>}{status === "error" && <p className="error-note" role="alert">{error}</p>}</div></>}
  </form>;
}
