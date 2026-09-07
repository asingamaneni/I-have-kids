"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Eye, Pause, RotateCcw } from "lucide-react";
import type { ConceptAvailability, LearnerRoadmap } from "@child-learning/contracts";
import { LearningGraph } from "@/components/LearningGraph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function label(value: string): string { return value.replaceAll(".", " · ").replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase()); }

export function LearningPathView({ studentId, concepts, roadmaps }: { studentId: string; concepts: ConceptAvailability[]; roadmaps: LearnerRoadmap[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const subjects = useMemo(() => [...new Set(concepts.map((concept) => concept.subject))].sort(), [concepts]);
  const visible = subject === "all" ? concepts : concepts.filter((concept) => concept.subject === subject);

  async function apply(concept: ConceptAvailability, action: "introduce" | "prioritize" | "defer" | "clear") {
    const reason = notes[concept.conceptId]?.trim();
    if (!reason) { setMessage(`Add an adult note for ${concept.title} first.`); return; }
    setBusy(concept.conceptId); setMessage("");
    const response = await fetch("/api/learning-directives", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId, conceptId: concept.conceptId, action, reason, requestedStage: action === "introduce" ? concept.stageOrder[0] : undefined, priority: action === "prioritize" ? 4 : undefined }) });
    const result = await response.json();
    setBusy("");
    setMessage(response.ok ? `${concept.title} learning plan updated.` : String(result.error ?? "Learning plan could not be updated."));
    if (response.ok) { setNotes((current) => ({ ...current, [concept.conceptId]: "" })); router.refresh(); }
  }

  return <>
    <LearningGraph roadmaps={roadmaps} audience="adult" />
    <div className="path-controls-heading"><strong>Roadmap controls</strong><span>Adjust what appears next without erasing the evidence trail.</span></div>
    <div className="path-toolbar"><div><strong>{visible.length} concepts</strong><span>Grade is context only; readiness comes from the child&apos;s evidence.</span></div><Select value={subject} onValueChange={setSubject}><SelectTrigger aria-label="Filter learning path by subject"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem>{subjects.map((entry) => <SelectItem key={entry} value={entry}>{label(entry)}</SelectItem>)}</SelectContent></Select></div>
    <div className="learning-path-grid">{visible.map((concept) => <Card key={concept.conceptId} className="path-card gap-4"><CardHeader><div className="path-card-title"><div><CardDescription>{label(concept.subject)} · {concept.currentStage} stage</CardDescription><CardTitle>{concept.title}</CardTitle></div><Badge variant={concept.status === "secure" ? "success" : concept.status === "active" || concept.status === "available" ? "secondary" : "outline"}>{concept.status}</Badge></div></CardHeader><CardContent className="grid gap-4"><p className="path-reason">{concept.reason}</p>{concept.unmetPrerequisiteIds.length > 0 && <p className="path-prerequisites"><strong>Readiness still developing:</strong> {concept.unmetPrerequisiteIds.map(label).join(", ")}</p>}<label className="path-note">Adult note<input value={notes[concept.conceptId] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [concept.conceptId]: event.target.value }))} placeholder="Why is this right for this child now?" /></label><div className="path-actions">{concept.status === "locked" && <Button size="sm" onClick={() => apply(concept, "introduce")} disabled={busy === concept.conceptId}><Eye />Introduce with objects</Button>}{concept.status === "deferred" ? <Button size="sm" onClick={() => apply(concept, "clear")} disabled={busy === concept.conceptId}><RotateCcw />Bring back</Button> : <><Button size="sm" variant="outline" onClick={() => apply(concept, "prioritize")} disabled={busy === concept.conceptId}><ArrowUp />Prioritize</Button><Button size="sm" variant="ghost" onClick={() => apply(concept, "defer")} disabled={busy === concept.conceptId}><Pause />Defer</Button></>}</div></CardContent></Card>)}</div>
    {message && <p className="path-message" role="status">{message}</p>}
  </>;
}
