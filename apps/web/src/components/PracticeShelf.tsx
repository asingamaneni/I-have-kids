"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShelfActivity {
  id: string;
  title: string;
  subject: string;
  conceptId: string;
  objectives: string[];
}

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
  return { symbol: "+", label: "Counting and adding" };
}

function displayLabel(value: string): string {
  return value.replaceAll(".", " · ").replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function PracticeShelf({ studentId, activities }: { studentId: string; activities: ShelfActivity[] }) {
  const [view, setView] = useState<ShelfView>("all");
  const [selection, setSelection] = useState("all");
  const options = useMemo(() => [...new Set(activities.map((activity) => view === "concept" ? activity.conceptId : activity.subject))].sort(), [activities, view]);
  const visible = selection === "all" || view === "all" ? activities : activities.filter((activity) => (view === "concept" ? activity.conceptId : activity.subject) === selection);
  const groups = useMemo(() => {
    if (view === "all" || selection !== "all") return [["", visible] as const];
    const grouped = new Map<string, ShelfActivity[]>();
    for (const activity of visible) {
      const key = view === "concept" ? activity.conceptId : activity.subject;
      grouped.set(key, [...(grouped.get(key) ?? []), activity]);
    }
    return [...grouped.entries()];
  }, [selection, view, visible]);

  function chooseView(next: ShelfView) {
    setView(next);
    setSelection("all");
  }

  return <section className="activity-list">
    <div className="section-heading"><span>Practice shelf</span><small>{visible.length} of {activities.length} pages</small></div>
    <div className="shelf-controls">
      <Tabs value={view} onValueChange={(value) => chooseView(value as ShelfView)}><TabsList aria-label="Organize practice pages"><TabsTrigger value="all">See all</TabsTrigger><TabsTrigger value="subject">By subject</TabsTrigger><TabsTrigger value="concept">By concept</TabsTrigger></TabsList></Tabs>
      {view !== "all" && <label className="shelf-filter">Choose {view}<Select value={selection} onValueChange={setSelection}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All {view === "subject" ? "subjects" : "concepts"}</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{displayLabel(option)}</SelectItem>)}</SelectContent></Select></label>}
    </div>
    {groups.map(([group, groupActivities]) => <div className="shelf-group" key={group || "all"}>{group && <h3>{displayLabel(group)}</h3>}{groupActivities.map((activity, index) => {
      const badge = activityLabel(activity.conceptId);
      return <Link className="activity-row" key={activity.id} href={`/child/${studentId}/activity/${activity.id}`}><span className={`activity-badge badge-${index % 3}`} aria-label={badge.label}>{badge.symbol}</span><span><strong>{activity.title}</strong><small><b className="activity-kind-label">{badge.label}</b> · {activity.objectives[0]}</small></span><span className="row-arrow" aria-hidden="true">→</span></Link>;
    })}</div>)}
  </section>;
}
