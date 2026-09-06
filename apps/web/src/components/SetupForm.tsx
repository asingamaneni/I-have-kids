"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const capabilityGroups = [
  { title: "Math", options: [
    ["math.counts-to-10", "Counts a group of objects to 10"],
    ["math.recognizes-teen-numbers", "Recognizes or builds numbers 11–20"],
    ["math.adds-with-objects", "Joins groups to add with objects or pictures"],
    ["math.adds-with-symbols", "Solves addition equations within 10"],
    ["math.subtracts-with-objects", "Takes away with objects or pictures"],
    ["math.subtracts-with-symbols", "Solves subtraction equations within 10"],
  ] },
  { title: "Language", options: [
    ["english.hears-beginning-sounds", "Hears beginning sounds in familiar words"],
    ["english.reads-short-text", "Reads a short sentence or passage"],
    ["english.writes-letters-words", "Writes familiar letters or words"],
  ] },
  { title: "Reasoning and science", options: [
    ["reasoning.continues-patterns", "Continues a simple pattern or sequence"],
    ["reasoning.sorts-and-explains", "Sorts objects and explains the group"],
    ["science.observes-and-describes", "Observes and describes visible features"],
  ] },
] as const;

export function SetupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/students", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: data.get("displayName"), schoolPlacement: data.get("schoolPlacement") || undefined, preferredLanguage: data.get("preferredLanguage") || "en", accommodations: String(data.get("accommodations") ?? "").split(",").map((value) => value.trim()).filter(Boolean), currentCapabilities: data.getAll("currentCapabilities"), baselineNotes: data.get("baselineNotes") || undefined }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(String(result.error ?? "Learner profile could not be created.")); return; }
    router.push(`/child/${encodeURIComponent(String(result.student.id))}`);
  }
  return <Card className="setup-card"><CardHeader><CardTitle>Create a local learner</CardTitle><CardDescription>Describe what the child can do today. Those statements choose a short starting assessment; they do not count as mastery until the child demonstrates them.</CardDescription></CardHeader><CardContent><form className="setup-form" onSubmit={submit}><div className="setup-profile-grid"><label>Child&apos;s display name<input name="displayName" autoComplete="off" required placeholder="e.g. Ava" /></label><label>School placement <small>optional, context only</small><input name="schoolPlacement" autoComplete="off" placeholder="e.g. Kindergarten" /></label><label>Preferred language<input name="preferredLanguage" defaultValue="en" minLength={2} required /></label><label>Helpful accommodations <small>optional, comma separated</small><input name="accommodations" placeholder="read directions aloud, larger print" /></label></div><fieldset className="capability-fieldset"><legend>What can they do today?</legend><p>Select anything you have seen them do comfortably. Leave everything blank to begin with a concrete counting exploration.</p>{capabilityGroups.map((group) => <div className="capability-group" key={group.title}><strong>{group.title}</strong><div>{group.options.map(([value, text]) => <label key={value}><input type="checkbox" name="currentCapabilities" value={value} /><span>{text}</span></label>)}</div></div>)}</fieldset><label>Current interests or a sample of what you notice <small>optional</small><textarea name="baselineNotes" rows={3} maxLength={1000} placeholder="For example: builds groups with blocks, reads signs, enjoys animal sorting…" /></label><Button size="lg" type="submit" disabled={busy}>{busy ? "Creating starting assessment…" : "Create learner and starting assessment"}<ArrowRight /></Button>{error && <p className="error-note" role="alert">{error}</p>}</form></CardContent></Card>;
}
