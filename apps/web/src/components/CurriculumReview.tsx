"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Play, X } from "lucide-react";
import type { CurriculumRevisionDecision, CurriculumRevisionProposal } from "@child-learning/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProposalRow = { proposal: CurriculumRevisionProposal; decision?: CurriculumRevisionDecision };

export function CurriculumReview({ proposals }: { proposals: ProposalRow[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function decide(proposalId: string, decision: "approved" | "rejected") {
    const note = notes[proposalId]?.trim();
    if (!note) { setMessage("Add an adult review note first."); return; }
    setBusy(proposalId); setMessage("");
    const response = await fetch(`/api/curriculum/proposals/${encodeURIComponent(proposalId)}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision, note }) });
    const result = await response.json();
    setBusy(""); setMessage(response.ok ? `Proposal ${decision}.` : String(result.error ?? "Decision could not be saved."));
    if (response.ok) router.refresh();
  }

  async function activate(proposalId: string) {
    const reason = notes[proposalId]?.trim() || "Activate the adult-approved learning graph revision.";
    setBusy(proposalId); setMessage("");
    const response = await fetch(`/api/curriculum/proposals/${encodeURIComponent(proposalId)}/activate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
    const result = await response.json();
    setBusy(""); setMessage(response.ok ? "The approved roadmap extension is active." : String(result.error ?? "Revision could not be activated."));
    if (response.ok) router.refresh();
  }

  if (proposals.length === 0) return <Card><CardHeader><CardTitle>No roadmap proposals</CardTitle><CardDescription>When a subject reaches its current frontier, Claude can prepare a curriculum graph extension for an adult to review here.</CardDescription></CardHeader></Card>;

  return <div className="curriculum-review-list">{proposals.map(({ proposal, decision }) => <Card key={proposal.id}><CardHeader><div className="curriculum-review-heading"><div><CardDescription>{proposal.revision.packId} · revision {proposal.revision.revision}</CardDescription><CardTitle>{proposal.revision.title}</CardTitle></div><Badge variant={decision?.decision === "approved" ? "success" : decision?.decision === "rejected" ? "outline" : "secondary"}>{decision?.decision ?? "Needs review"}</Badge></div></CardHeader><CardContent className="grid gap-4"><p>{proposal.rationale}</p><div className="curriculum-diff-summary"><span><strong>{proposal.revision.subjects.length}</strong> new subject definitions</span><span><strong>{proposal.revision.concepts.length}</strong> concept nodes</span><span><strong>{proposal.revision.edges.length}</strong> roadmap edges</span></div><label className="path-note">Adult review note<textarea value={notes[proposal.id] ?? decision?.note ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [proposal.id]: event.target.value }))} rows={2} placeholder="Why is this appropriate for this learner now?" /></label>{!decision && <div className="path-actions"><Button onClick={() => decide(proposal.id, "approved")} disabled={busy === proposal.id}><Check />Approve</Button><Button variant="outline" onClick={() => decide(proposal.id, "rejected")} disabled={busy === proposal.id}><X />Reject</Button></div>}{decision?.decision === "approved" && <Button onClick={() => activate(proposal.id)} disabled={busy === proposal.id}><Play />Activate roadmap revision</Button>}</CardContent></Card>)}{message && <p className="path-message" role="status">{message}</p>}</div>;
}
