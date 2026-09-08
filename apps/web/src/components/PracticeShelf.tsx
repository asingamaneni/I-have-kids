"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ChildActivityLifecycle } from "@child-learning/contracts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { childActivityRoute, childHowToRoute, type LearnerRouteScope } from "@/lib/routes";

type ShelfView = "all" | "subject" | "concept";

function activityLabel(conceptId: string): { symbol: string; label: string } {
  if (conceptId.includes("subtraction")) return { symbol: "−", label: "Take away" };
  if (conceptId.includes("teen-numbers")) return { symbol: "10+", label: "Teen numbers" };
  if (conceptId.includes("equal-groups")) return { symbol: "▦", label: "Equal groups" };
  if (conceptId.includes("fair-sharing")) return { symbol: "÷", label: "Fair sharing" };
  if (conceptId.includes("letter-formation")) return { symbol: "Aa", label: "Writing" };
  if (conceptId.includes("reading")) return { symbol: "▤", label: "Reading" };
  if (conceptId.includes("reasoning")) return { symbol: "↗", label: "Reasoning" };
  if (conceptId.includes("science")) return { symbol: "◌", label: "Science" };
  if (conceptId.includes("beginning-sounds")) return { symbol: "A", label: "Sounds" };
  return { symbol: "+", label: "Practice" };
}

function displayLabel(value: string): string {
  return value.replaceAll(".", " · ").replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function PracticeShelf({ studentId, activities, routeScope = "household" }: { studentId: string; activities: ChildActivityLifecycle[]; routeScope?: LearnerRouteScope }) {
  const [view, setView] = useState<ShelfView>("all");
  const [selection, setSelection] = useState("all");
  const options = useMemo(() => [...new Set(activities.map((entry) => view === "concept" ? entry.activity.conceptId : entry.activity.subject))].sort(), [activities, view]);
  const visible = selection === "all" || view === "all" ? activities : activities.filter((entry) => (view === "concept" ? entry.activity.conceptId : entry.activity.subject) === selection);
  const groups = useMemo(() => {
    if (view === "all" || selection !== "all") return [["", visible] as const];
    const grouped = new Map<string, ChildActivityLifecycle[]>();
    for (const entry of visible) {
      const key = view === "concept" ? entry.activity.conceptId : entry.activity.subject;
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }
    return [...grouped.entries()];
  }, [selection, view, visible]);
  function chooseView(next: ShelfView) { setView(next); setSelection("all"); }

  return <section className="activity-list">
    <div className="section-heading"><span>What needs attention</span><small>{visible.length} of {activities.length} pages</small></div>
    <div className="shelf-controls"><Tabs value={view} onValueChange={(value) => chooseView(value as ShelfView)}><TabsList aria-label="Organize current practice"><TabsTrigger value="all">See all</TabsTrigger><TabsTrigger value="subject">By subject</TabsTrigger><TabsTrigger value="concept">By concept</TabsTrigger></TabsList></Tabs>{view !== "all" && <label className="shelf-filter">Choose {view}<Select value={selection} onValueChange={setSelection}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All {view === "subject" ? "subjects" : "concepts"}</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{displayLabel(option)}</SelectItem>)}</SelectContent></Select></label>}</div>
    {groups.map(([group, entries]) => <div className="shelf-group" key={group || "all"}>{group && <h3>{displayLabel(group)}</h3>}{entries.map((entry, index) => {
      const activity = entry.activity;
      const badge = activityLabel(activity.conceptId);
      const content = <><span className={`activity-badge badge-${index % 3}`} aria-label={badge.label}>{badge.symbol}</span><span className="activity-row-copy"><strong>{activity.title}</strong><small><b className="activity-kind-label">{entry.statusLabel}</b> · {activity.objectives[0]}</small>{entry.recommended && <em className="recommended-label">Best next step</em>}</span><span className="row-action">{entry.actionLabel}</span></>;
      if (entry.status === "awaiting-validation") return <div className="activity-row activity-row-pending" key={activity.id} aria-label={`${activity.title}: ${entry.statusLabel}`}>{content}</div>;
      return <div className={`activity-row-wrap${entry.recommended ? " is-recommended" : ""}`} key={activity.id}><Link className="activity-row" href={childActivityRoute(studentId, activity.id, routeScope)} aria-label={`${entry.actionLabel}: ${activity.title}`}>{content}</Link>{activity.childGuide && <Link className="activity-how-to-link" href={childHowToRoute(studentId, activity.id, routeScope)}>How to learn this</Link>}</div>;
    })}</div>)}
   </section>;
}
