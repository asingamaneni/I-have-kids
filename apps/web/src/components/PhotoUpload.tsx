"use client";

import { useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhotoUpload({ studentId, activityId, dataScope = "household", retryOfSubmissionId }: { studentId: string; activityId: string; dataScope?: "household" | "demo"; retryOfSubmissionId?: string }) {
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/uploads", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json();
    setMessage(response.ok ? "Photo saved for adult review. No automatic handwriting reading was used." : String(result.error ?? "Photo could not be saved."));
    setBusy(false);
  }

  const inputId = `worksheet-photo-${activityId}`;
  return <form className="photo-upload" onSubmit={submit}>
    <div className="section-heading"><span>Finished on paper?</span><small>Keep the completed page in the adult archive</small></div>
    <input type="hidden" name="studentId" value={studentId} />
    <input type="hidden" name="activityId" value={activityId} />
    <input type="hidden" name="dataScope" value={dataScope} />
    {retryOfSubmissionId && <input type="hidden" name="retryOfSubmissionId" value={retryOfSubmissionId} />}
    <div className="photo-picker"><ImagePlus aria-hidden="true" /><div><strong>Add a worksheet photo</strong><span>{fileName || "PNG or JPEG, up to 8 MB"}</span></div><label className="photo-choose" htmlFor={inputId}>Choose photo</label><input className="sr-only" id={inputId} type="file" name="file" accept="image/png,image/jpeg" required onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div>
    <Button type="submit" disabled={busy || !fileName}><Upload />{busy ? "Saving…" : "Save to work history"}</Button>
    {message && <p className="success-note" role="status">{message}</p>}
  </form>;
}
