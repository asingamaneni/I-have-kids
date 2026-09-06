"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewForm({ studentId, conceptId = "math.addition-within-10" }: { studentId: string; conceptId?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/overrides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, conceptId: data.get("conceptId"), targetStep: Number(data.get("targetStep")), reason: data.get("reason") }),
    });
    const json = await response.json();
    setMessage(response.ok ? "Override saved with its prior and new state." : String(json.error ?? "Override could not be saved."));
    if (response.ok) { form.reset(); router.refresh(); }
  }

  return <form className="review-form" onSubmit={submit}>
    <div className="section-heading"><span>Apply an adult override</span><small>Changes the current step; history stays append-only</small></div>
    <div className="form-grid">
      <label>Concept<input name="conceptId" defaultValue={conceptId} required /></label>
      <label>New difficulty step<select name="targetStep" defaultValue="" required><option value="" disabled>Choose a step</option><option value="0">Step 0 · foundation</option><option value="1">Step 1</option><option value="2">Step 2</option><option value="3">Step 3</option></select></label>
      <label className="wide-field">Why is this override needed?<textarea name="reason" required rows={3} placeholder="Describe the evidence an adult reviewed." /></label>
    </div>
    <button className="button button-primary" type="submit">Apply override</button>
    {message && <p className="success-note" role="status">{message}</p>}
  </form>;
}
