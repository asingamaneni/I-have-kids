"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ReviewConceptOption = { conceptId: string; title: string; subject: string };

export function ReviewForm({ studentId, concepts }: { studentId: string; concepts: ReviewConceptOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const subjects = useMemo(() => [...new Set(concepts.map((concept) => concept.subject))].sort(), [concepts]);
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const visibleConcepts = concepts.filter((concept) => !subject || concept.subject === subject);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/overrides", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId, conceptId: data.get("conceptId"), targetStep: Number(data.get("targetStep")), reason: data.get("reason") }) });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Override saved with its prior and new state." : String(result.error ?? "Override could not be saved."));
    if (response.ok) { form.reset(); router.refresh(); }
  }

  return <form className="review-form" onSubmit={submit}><div className="section-heading"><span>Apply an adult override</span><small>Changes the current step; history stays append-only</small></div><div className="form-grid"><label>Subject<select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((entry) => <option key={entry} value={entry}>{entry.replaceAll("-", " ")}</option>)}</select></label><label>Concept<select name="conceptId" required defaultValue=""><option value="" disabled>Choose a concept</option>{visibleConcepts.map((concept) => <option key={concept.conceptId} value={concept.conceptId}>{concept.title}</option>)}</select></label><label>New difficulty step<select name="targetStep" defaultValue="" required><option value="" disabled>Choose a step</option><option value="0">Step 0 · foundation</option><option value="1">Step 1</option><option value="2">Step 2</option><option value="3">Step 3</option></select></label><label className="wide-field">Why is this override needed?<textarea name="reason" required rows={3} placeholder="Describe the evidence an adult reviewed." /></label></div><button className="button button-primary" type="submit">Apply override</button>{message && <p className="success-note" role="status">{message}</p>}</form>;
}
