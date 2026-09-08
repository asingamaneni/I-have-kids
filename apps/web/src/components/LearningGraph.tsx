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

export function LearningGraph({ roadmaps, audience = "adult", onNodeSelect }: { roadmaps: GraphRoadmap[]; audience?: "adult" | "child"; onNodeSelect?: (nodeId: string) => void }) {
  const [subject, setSubject] = useState(roadmaps[0]?.subject ?? "");
  const [selectedId, setSelectedId] = useState("");
  const [showWholePath, setShowWholePath] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const roadmap = roadmaps.find((entry) => entry.subject === subject) ?? roadmaps[0];
  const displayNodes = useMemo(() => {
    if (!roadmap || audience === "adult" || showWholePath) return roadmap?.nodes ?? [];
    const completed = roadmap.nodes.filter((node) => node.status === "completed");
    const mainline = roadmap.nodes.filter((node) => node.status !== "completed" && (node.branchKind === "core" || node.branchKind === "extension")).sort((a, b) => a.depth - b.depth || a.title.localeCompare(b.title));
    const currentId = roadmap.currentNodeIds.find((id) => mainline.some((node) => node.id === id));
    const start = Math.max(0, currentId ? mainline.findIndex((node) => node.id === currentId) : 0);
    const window = mainline.slice(start, start + 6);
    const visibleIds = new Set(window.map((node) => node.id));
    const branches = roadmap.nodes.filter((node) => node.status !== "completed" && node.branchKind !== "core" && node.branchKind !== "extension" && ((node.parentConceptId && visibleIds.has(node.parentConceptId)) || (node.rejoinsConceptId && visibleIds.has(node.rejoinsConceptId))));
    return [...(showCompleted ? completed : []), ...window, ...branches];
  }, [audience, roadmap, showCompleted, showWholePath]);
  const levels = useMemo(() => {
    const grouped = new Map<number, GraphNode[]>();
    for (const node of displayNodes) grouped.set(node.depth, [...(grouped.get(node.depth) ?? []), node]);
    return [...grouped.entries()].sort(([a], [b]) => a - b).map(([depth, nodes]) => ({ depth, nodes: nodes.sort((a, b) => a.branchKind.localeCompare(b.branchKind) || a.title.localeCompare(b.title)) }));
  }, [displayNodes]);
  const selected = roadmap?.nodes.find((node) => node.id === selectedId);
  const completedCount = roadmap?.nodes.filter((node) => node.status === "completed").length ?? 0;

  if (!roadmap) return <Card><CardHeader><CardTitle>No roadmap yet</CardTitle><CardDescription>Choose a subject during learner setup to create the first assessment and roadmap.</CardDescription></CardHeader></Card>;

  return <section className={`learning-graph learning-graph-${audience}${audience === "adult" || showWholePath ? " learning-graph-full" : ""}`} aria-label={`${roadmap.title} learning roadmap`}>
    <div className="graph-toolbar"><div><strong>{audience === "child" ? "My learning map" : "Complete subject roadmap"}</strong><span>{audience === "child" ? (showWholePath ? "The whole subject path with your place marked." : "Your current place and the next five steps.") : `${roadmap.nodes.length} roadmap stops · ${roadmap.completedNodeIds.length} completed`}</span></div><div className="graph-toolbar-actions">{audience === "child" && <button type="button" className="small-button" onClick={() => setShowWholePath((value) => !value)} aria-pressed={showWholePath}>{showWholePath ? "Show my next steps" : "See the whole path"}</button>}<Select value={roadmap.subject} onValueChange={(value) => { setSubject(value); setSelectedId(""); setShowCompleted(false); }}><SelectTrigger aria-label="Choose roadmap subject"><SelectValue /></SelectTrigger><SelectContent>{roadmaps.map((entry) => <SelectItem key={entry.subject} value={entry.subject}>{entry.title}</SelectItem>)}</SelectContent></Select></div></div>
    {audience === "child" && !showWholePath && completedCount > 0 && <button type="button" className="completed-history-node" aria-expanded={showCompleted} onClick={() => setShowCompleted((value) => !value)}><Check aria-hidden="true" /><span><strong>{completedCount} completed step{completedCount === 1 ? "" : "s"}</strong><small>{showCompleted ? "Hide completed history" : "Open completed history"}</small></span></button>}
    <div className="graph-scroll" tabIndex={0} aria-label="Scrollable learning graph">
      <div className={`graph-track${audience === "adult" || showWholePath ? " graph-track-full" : ""}`} style={{ gridTemplateColumns: audience === "adult" || showWholePath ? "minmax(0, 1fr)" : `repeat(${Math.max(1, levels.length)}, minmax(12rem, 1fr))` }}>
        {levels.map((level, levelIndex) => <div className="graph-level" data-depth={level.depth} key={level.depth}><div className="graph-level-label">{audience === "child" ? levelIndex === 0 ? "Start" : levelIndex === levels.length - 1 ? "Later" : "Next" : `Step ${levelIndex + 1}`}</div><div className="graph-node-stack">{level.nodes.map((node) => <button type="button" className={`graph-node graph-node-${node.status} graph-branch-${node.branchKind}${selectedId === node.id ? " graph-node-selected" : ""}`} onClick={() => { setSelectedId(node.id); onNodeSelect?.(node.id); }} key={node.id} aria-label={`${node.title}: ${nodeMessage(node)}`}><span className="graph-node-icon">{nodeIcon(node)}</span><span className="graph-node-copy"><strong>{node.title}</strong><small>{nodeMessage(node)}</small></span>{audience === "child" && roadmap.currentNodeIds.includes(node.id) && <Badge variant="secondary">You are here</Badge>}{node.reviewDue && <Badge variant="secondary">Review</Badge>}</button>)}</div></div>)}
      </div>
    </div>
    <ol className="sr-only" aria-label="Learning roadmap in reading order">{displayNodes.slice().sort((a, b) => a.depth - b.depth).map((node) => <li key={node.id}>{node.title}: {nodeMessage(node)}</li>)}</ol>
    {audience === "adult" && selected && <Card className="graph-detail"><CardHeader><CardDescription>{label(selected.subject)} · {label(selected.stage)} · {label(selected.branchKind)}</CardDescription><CardTitle>{selected.title}</CardTitle></CardHeader><CardContent><p>{nodeMessage(selected)}</p>{"evidenceCount" in selected && <div className="graph-detail-stats"><span><strong>{selected.evidenceCount}</strong> confirmed observations</span><span><strong>{selected.recentScore === undefined ? "—" : `${Math.round(selected.recentScore * 100)}%`}</strong> latest score</span><span><strong>{label(selected.status)}</strong> roadmap status</span></div>}</CardContent></Card>}
    {roadmap.expansionNeeded && <div className="graph-expansion"><Sparkles aria-hidden="true" /><div><strong>{audience === "child" ? "Your map can keep growing." : "This subject is ready to expand."}</strong><p>{audience === "child" ? "An adult can add the next learning stops." : ("expansionReason" in roadmap ? roadmap.expansionReason : undefined)}</p></div></div>}
  </section>;
}
