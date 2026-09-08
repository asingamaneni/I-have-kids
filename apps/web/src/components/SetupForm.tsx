"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type SetupSubject = { id: string; title: string; description: string; capabilities: Array<{ id: string; title: string }> };

function list(value: FormDataEntryValue | null): string[] {
  return String(value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function SetupForm({ subjects }: { subjects: SetupSubject[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const currentCapabilities = data.getAll("currentCapabilities").map(String);
    const entrySubjects = data.getAll("entryDiagnostic").map(String);
    const intake = currentCapabilities.length > 0 || entrySubjects.length > 0 ? { observedCapabilities: currentCapabilities, questionnaireAnchors: entrySubjects.map((subject) => ({ subject, entryDiagnostic: true })), source: currentCapabilities.length > 0 && entrySubjects.length > 0 ? "combined" : currentCapabilities.length > 0 ? "adult-observation" : "questionnaire" } : undefined;
    const response = await fetch("/api/students", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: data.get("displayName"), birthDate: data.get("birthDate") || undefined, schoolPlacement: data.get("schoolPlacement") || undefined, preferredLanguage: data.get("preferredLanguage") || "en", accommodations: list(data.get("accommodations")), interests: list(data.get("interests")), learningGoals: list(data.get("learningGoals")), selectedSubjects: data.getAll("selectedSubjects"), currentCapabilities, intake, baselineNotes: data.get("baselineNotes") || undefined }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(String(result.error ?? "Learner profile could not be created.")); return; }
    router.push(`/child/${encodeURIComponent(String(result.student.id))}`);
  }
  return <Card className="setup-card"><CardHeader><CardTitle>Create a local learner</CardTitle><CardDescription>Choose subjects and describe what the child can do today. These statements place short starting assessments; only confirmed work changes the roadmap.</CardDescription></CardHeader><CardContent><form className="setup-form" onSubmit={submit}><div className="setup-profile-grid"><label>Child&apos;s display name<input name="displayName" autoComplete="off" required placeholder="e.g. Ava" /></label><label>Birth date <small>optional, used only for presentation</small><input name="birthDate" type="date" /></label><label>School placement <small>optional, context only</small><input name="schoolPlacement" autoComplete="off" placeholder="e.g. Grade 4, homeschool, mixed level" /></label><label>Preferred language<input name="preferredLanguage" defaultValue="en" minLength={2} required /></label><label>Helpful accommodations <small>optional, comma separated</small><input name="accommodations" placeholder="read directions aloud, larger print" /></label><label>Interests <small>optional, comma separated</small><input name="interests" placeholder="animals, building, space" /></label><label className="setup-wide">Learning goals <small>optional, comma separated</small><input name="learningGoals" placeholder="fractions, paragraph writing, ecosystems" /></label></div><fieldset className="capability-fieldset"><legend>Which subjects should appear?</legend><p>The roadmap can grow later. Age and grade never block a subject.</p><div className="subject-choice-grid">{subjects.map((subject) => <label key={subject.id}><input type="checkbox" name="selectedSubjects" value={subject.id} defaultChecked={subject.id === "math" || subject.id === "english"} /><span><strong>{subject.title}</strong><small>{subject.description}</small></span></label>)}</div></fieldset><fieldset className="capability-fieldset"><legend>What can they do today?</legend><p>Select anything you have seen them do comfortably. The app verifies each claim with a short starting activity.</p>{subjects.filter((subject) => subject.capabilities.length > 0).map((subject) => <div className="capability-group" key={subject.id}><strong>{subject.title}</strong><div>{subject.capabilities.map((capability) => <label key={capability.id}><input type="checkbox" name="currentCapabilities" value={capability.id} /><span>{capability.title}</span></label>)}<label><input type="checkbox" name="entryDiagnostic" value={subject.id} /><span>I am not sure yet—use this subject&apos;s entry check</span></label></div></div>)}</fieldset><label>Current interests or a sample of what you notice <small>optional</small><textarea name="baselineNotes" rows={3} maxLength={2000} placeholder="For example: explains animal habitats, reads chapter books, builds equal groups, enjoys maps…" /></label><Button size="lg" type="submit" disabled={busy}>{busy ? "Saving learner…" : "Create learner"}<ArrowRight /></Button><p className="privacy-note">No worksheet is created until you select an observed ability or explicitly request a subject entry check. Parent input chooses what to assess; only confirmed work changes progress.</p>{error && <p className="error-note" role="alert">{error}</p>}</form></CardContent></Card>;
}
