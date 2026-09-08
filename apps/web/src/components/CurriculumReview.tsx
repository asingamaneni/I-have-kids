"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Play, X } from "lucide-react";
import type { CurriculumRevisionDecision, CurriculumRevisionProposal } from "@child-learning/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProposalRow = { proposal: CurriculumRevisionProposal; decision?: CurriculumRevisionDecision; active?: boolean };
type Notice = { tone: "success" | "error"; text: string };

export function CurriculumReview({ proposals }: { proposals: ProposalRow[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [messages, setMessages] = useState<Record<string, Notice>>({});

  function clearMessage(proposalId: string) {
    setMessages((current) => {
      const next = { ...current };
      delete next[proposalId];
      return next;
    });
  }

  async function decide(proposalId: string, decision: "approved" | "rejected") {
    const note = notes[proposalId]?.trim();
    if (!note) {
      setMessages((current) => ({ ...current, [proposalId]: { tone: "error", text: "Add an adult review note first." } }));
      return;
    }
    setBusy(proposalId);
    clearMessage(proposalId);
    try {
      const response = await fetch(`/api/curriculum/proposals/${encodeURIComponent(proposalId)}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision, note }) });
      const result = await response.json() as { error?: string };
      setMessages((current) => ({ ...current, [proposalId]: { tone: response.ok ? "success" : "error", text: response.ok ? `Proposal ${decision}.` : String(result.error ?? "Decision could not be saved.") } }));
      if (response.ok) router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function activate(proposalId: string) {
    const reason = notes[proposalId]?.trim() || "Activate the adult-approved learning graph revision.";
    setBusy(proposalId);
    clearMessage(proposalId);
    try {
      const response = await fetch(`/api/curriculum/proposals/${encodeURIComponent(proposalId)}/activate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
      const result = await response.json() as { error?: string; alreadyActive?: boolean };
      const text = response.ok ? (result.alreadyActive ? "This roadmap revision is already active." : "The approved roadmap revision is now active.") : String(result.error ?? "Revision could not be activated.");
      setMessages((current) => ({ ...current, [proposalId]: { tone: response.ok ? "success" : "error", text } }));
      if (response.ok) router.refresh();
    } finally {
      setBusy("");
    }
  }

  if (proposals.length === 0) return <Card><CardHeader><CardTitle>No roadmap proposals</CardTitle><CardDescription>When a subject reaches its current frontier, Claude can prepare a curriculum graph extension for an adult to review here.</CardDescription></CardHeader></Card>;

  return <div className="curriculum-review-list">{proposals.map(({ proposal, decision, active }) => {
    const notice = messages[proposal.id];
    const status = active ? "Active" : decision?.decision ?? "Needs review";
    return <Card key={proposal.id}><CardHeader><div className="curriculum-review-heading"><div><CardDescription>{proposal.revision.packId} · revision {proposal.revision.revision}</CardDescription><CardTitle>{proposal.revision.title}</CardTitle></div><Badge variant={active || decision?.decision === "approved" ? "success" : decision?.decision === "rejected" ? "outline" : "secondary"}>{status}</Badge></div></CardHeader><CardContent className="grid gap-4"><p>{proposal.rationale}</p><div className="curriculum-diff-summary"><span><strong>{proposal.revision.subjects.length}</strong> subject definitions</span><span><strong>{proposal.revision.concepts.length}</strong> concept nodes</span><span><strong>{proposal.revision.edges.length}</strong> roadmap edges</span></div><details className="curriculum-map-preview"><summary>View the complete proposed subject map</summary>{proposal.revision.subjects.map((subject) => <section key={subject.id}><h3>{subject.title}</h3><ol>{proposal.revision.concepts.filter((concept) => concept.subject === subject.id).sort((left, right) => left.step - right.step || left.title.localeCompare(right.title)).map((concept) => <li key={concept.id}><span>{concept.step + 1}</span><div><strong>{concept.title}</strong><small>{concept.description}</small>{concept.prerequisites.length > 0 && <em>After: {concept.prerequisites.map((id) => proposal.revision.concepts.find((candidate) => candidate.id === id)?.title ?? id).join(", ")}</em>}</div></li>)}</ol></section>)}</details><label className="path-note">Adult review note<textarea value={notes[proposal.id] ?? decision?.note ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [proposal.id]: event.target.value }))} rows={2} placeholder="Why is this appropriate for this learner now?" /></label>{!decision && <div className="path-actions"><Button onClick={() => decide(proposal.id, "approved")} disabled={busy === proposal.id}><Check />Approve</Button><Button variant="outline" onClick={() => decide(proposal.id, "rejected")} disabled={busy === proposal.id}><X />Reject</Button></div>}{decision?.decision === "approved" && !active && <Button onClick={() => activate(proposal.id)} disabled={busy === proposal.id}><Play />{busy === proposal.id ? "Activating…" : "Activate roadmap revision"}</Button>}{active && <p className="success-note" role="status">This revision is active in learner roadmaps.</p>}{notice && <p className={notice.tone === "error" ? "error-note" : "success-note"} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}</CardContent></Card>;
  })}</div>;
}
