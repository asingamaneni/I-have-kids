"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PackageOpen } from "lucide-react";
import type { WorksheetActivity } from "@kindergarten/rendering";
import { WorksheetRenderer } from "@kindergarten/rendering";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivityForm({ activity }: { activity: WorksheetActivity }) {
  const handsOn = activity.deliveryMode === "hands-on" && activity.presentation;
  const [showWorksheet, setShowWorksheet] = useState(!handsOn);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("saving"); setError("");
    const form = new FormData(event.currentTarget); const now = new Date().toISOString();
    const payload = { id: `submission-${activity.id}-${Date.now()}`, activityId: activity.id, studentId: activity.studentId, submittedAt: now, responses: activity.items.map((item) => ({ itemId: item.id, value: form.get(`response-${item.id}`) ?? "", capturedAt: now })) };
    try { const result = await fetch("/api/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); if (!result.ok) throw new Error((await result.json()).error ?? "Could not save work"); setStatus("saved"); router.push(`/child/${activity.studentId}/complete`); } catch (cause) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Could not save work"); }
  }

  return <form onSubmit={submit} className="activity-form">
    {handsOn && <Card className="hands-on-card"><CardHeader><div className="hands-on-heading"><span><PackageOpen /></span><div><CardDescription>Meet the idea with real materials</CardDescription><CardTitle>{activity.title}</CardTitle></div></div></CardHeader><CardContent className="grid gap-5"><p className="hands-on-invitation">{activity.presentation!.childInvitation}</p><div className="materials-list"><strong>Gather</strong>{activity.presentation!.materials.map((material) => <span key={material}>{material}</span>)}</div><ol className="hands-on-steps">{activity.presentation!.steps.map((step) => <li key={step}>{step}</li>)}</ol>{!showWorksheet && <Button size="lg" type="button" onClick={() => setShowWorksheet(true)}>Continue to picture practice<ArrowRight /></Button>}</CardContent></Card>}
    {showWorksheet && <><WorksheetRenderer activity={activity} options={{ mode: "digital" }} /><div className="response-capture"><Button size="lg" disabled={status === "saving"} type="submit">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Finish activity"}</Button>{status === "saved" && <p className="success-note" role="status">Your work is saved. An adult can review it from the evidence trail.</p>}{status === "error" && <p className="error-note" role="alert">{error}</p>}</div></>}
  </form>;
}
