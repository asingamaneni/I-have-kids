"use client";

import { useMemo, useState } from "react";
import { Check, CircleDot, Flag, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import type { ChildLearnerRoadmap, LearnerRoadmap, RoadmapNode } from "@child-learning/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type GraphRoadmap = LearnerRoadmap | ChildLearnerRoadmap;
type GraphNode = GraphRoadmap["nodes"][number];

function label(value: string): string {
  return value.replaceAll(".", " · ").replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function nodeIcon(node: GraphNode) {
  if (node.status === "completed") return <Check aria-hidden="true" />;
  if (node.branchKind === "extra-practice" || node.branchKind === "review") return <RotateCcw aria-hidden="true" />;
  if (node.status === "current") return <CircleDot aria-hidden="true" />;
  if (node.status === "locked") return <LockKeyhole aria-hidden="true" />;
  if (node.branchKind === "extension" || node.branchKind === "interest") return <Sparkles aria-hidden="true" />;
  return <Flag aria-hidden="true" />;
}

function nodeMessage(node: GraphNode): string {
  if ("message" in node) return node.message;
  return (node as RoadmapNode).reason;
}

export function LearningGraph({ roadmaps, audience = "adult" }: { roadmaps: GraphRoadmap[]; audience?: "adult" | "child" }) {
  const [subject, setSubject] = useState(roadmaps[0]?.subject ?? "");
  const [selectedId, setSelectedId] = useState("");
  const roadmap = roadmaps.find((entry) => entry.subject === subject) ?? roadmaps[0];
  const levels = useMemo(() => {
    if (!roadmap) return [] as Array<{ depth: number; nodes: GraphNode[] }>;
    const grouped = new Map<number, GraphNode[]>();
    for (const node of roadmap.nodes) grouped.set(node.depth, [...(grouped.get(node.depth) ?? []), node]);
    return [...grouped.entries()].sort(([a], [b]) => a - b).map(([depth, nodes]) => ({ depth, nodes: nodes.sort((a, b) => a.branchKind.localeCompare(b.branchKind) || a.title.localeCompare(b.title)) }));
  }, [roadmap]);
  const selected = roadmap?.nodes.find((node) => node.id === selectedId);

  if (!roadmap) return <Card><CardHeader><CardTitle>No roadmap yet</CardTitle><CardDescription>Choose a subject during learner setup to create the first assessment and roadmap.</CardDescription></CardHeader></Card>;

  return <section className={`learning-graph learning-graph-${audience}`} aria-label={`${roadmap.title} learning roadmap`}>
    <div className="graph-toolbar"><div><strong>{audience === "child" ? "My learning map" : "Learning roadmap"}</strong><span>{audience === "child" ? "See what you finished and what comes next." : `${roadmap.nodes.length} roadmap stops · ${roadmap.completedNodeIds.length} completed`}</span></div><Select value={roadmap.subject} onValueChange={(value) => { setSubject(value); setSelectedId(""); }}><SelectTrigger aria-label="Choose roadmap subject"><SelectValue /></SelectTrigger><SelectContent>{roadmaps.map((entry) => <SelectItem key={entry.subject} value={entry.subject}>{entry.title}</SelectItem>)}</SelectContent></Select></div>
    <div className="graph-scroll" tabIndex={0} aria-label="Scrollable learning graph">
      <div className="graph-track" style={{ gridTemplateColumns: `repeat(${Math.max(1, levels.length)}, minmax(12rem, 1fr))` }}>
        {levels.map((level, levelIndex) => <div className="graph-level" data-depth={level.depth} key={level.depth}><div className="graph-level-label">{audience === "child" ? levelIndex === 0 ? "Start" : levelIndex === levels.length - 1 ? "Later" : "Next" : `Step ${levelIndex + 1}`}</div><div className="graph-node-stack">{level.nodes.map((node) => <button type="button" className={`graph-node graph-node-${node.status} graph-branch-${node.branchKind}${selectedId === node.id ? " graph-node-selected" : ""}`} onClick={() => setSelectedId(node.id)} key={node.id} aria-label={`${node.title}: ${nodeMessage(node)}`}><span className="graph-node-icon">{nodeIcon(node)}</span><span className="graph-node-copy"><strong>{node.title}</strong><small>{nodeMessage(node)}</small></span>{node.reviewDue && <Badge variant="secondary">Review</Badge>}</button>)}</div></div>)}
      </div>
    </div>
    <ol className="sr-only" aria-label="Learning roadmap in reading order">{roadmap.nodes.slice().sort((a, b) => a.depth - b.depth).map((node) => <li key={node.id}>{node.title}: {nodeMessage(node)}</li>)}</ol>
    {audience === "adult" && selected && <Card className="graph-detail"><CardHeader><CardDescription>{label(selected.subject)} · {label(selected.stage)} · {label(selected.branchKind)}</CardDescription><CardTitle>{selected.title}</CardTitle></CardHeader><CardContent><p>{nodeMessage(selected)}</p>{"evidenceCount" in selected && <div className="graph-detail-stats"><span><strong>{selected.evidenceCount}</strong> confirmed observations</span><span><strong>{selected.recentScore === undefined ? "—" : `${Math.round(selected.recentScore * 100)}%`}</strong> latest score</span><span><strong>{label(selected.status)}</strong> roadmap status</span></div>}</CardContent></Card>}
    {roadmap.expansionNeeded && <div className="graph-expansion"><Sparkles aria-hidden="true" /><div><strong>{audience === "child" ? "Your map can keep growing." : "This subject is ready to expand."}</strong><p>{audience === "child" ? "An adult can add the next learning stops." : ("expansionReason" in roadmap ? roadmap.expansionReason : undefined)}</p></div></div>}
  </section>;
}
