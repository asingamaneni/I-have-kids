"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewActions({ evaluationId }: { evaluationId: string }) {
  const router = useRouter();
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(kind: "confirm" | "reject") {
    const reviewedScore = Number(score);
    if (kind === "confirm" && (!score || !Number.isFinite(reviewedScore) || reviewedScore < 0 || reviewedScore > 100)) {
      setMessage("Enter a reviewed score from 0 to 100.");
      return;
    }
    if (!note.trim()) {
      setMessage(kind === "confirm" ? "Describe what you verified." : "Explain why the work needs another look.");
      return;
    }
    setBusy(true);
    setMessage("");
    const body = kind === "confirm"
      ? { reviewerId: "adult-local", score: reviewedScore / 100, rationale: note.trim() }
      : { reviewerId: "adult-local", reason: note.trim() };
    const response = await fetch(`/api/reviews/${encodeURIComponent(evaluationId)}/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setMessage(response.ok ? (kind === "confirm" ? "Confirmed with adult evidence." : "Sent back for another look.") : String(result.error ?? "Could not save"));
    if (response.ok) router.refresh();
    setBusy(false);
  }

  return <div className="review-actions">
    <label>Reviewed score<input aria-label={`Reviewed score for ${evaluationId}`} type="number" min="0" max="100" inputMode="numeric" value={score} onChange={(event) => setScore(event.target.value)} placeholder="0–100" /></label>
    <label>Adult evidence<textarea aria-label={`Adult evidence for ${evaluationId}`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What did you verify?" /></label>
    <span className="review-buttons"><button className="small-button" type="button" disabled={busy} onClick={() => act("confirm")}>Confirm reviewed score</button><button className="small-button review-reject" type="button" disabled={busy} onClick={() => act("reject")}>Reject evidence</button></span>
    {message && <span role="status">{message}</span>}
  </div>;
}
