"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2, Printer } from "lucide-react";
import { ReportSnapshotSchema, type ReportSnapshot } from "@child-learning/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ReportKind = ReportSnapshot["kind"];
type ReportRow = { id: string; as_of?: string; created_at?: string; report_json: string };

function parseReport(row: ReportRow): ReportSnapshot | undefined {
  try { return ReportSnapshotSchema.parse(JSON.parse(row.report_json)); } catch { return undefined; }
}
function label(value: string): string { return value.replaceAll(".", " · ").replaceAll("-", " "); }

export function AdultReportsView({ studentId, rows }: { studentId: string; rows: ReportRow[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const parsedRows = useMemo(() => rows.map((row) => ({ row, report: parseReport(row) })).filter((entry): entry is { row: ReportRow; report: ReportSnapshot } => Boolean(entry.report)).sort((left, right) => right.report.asOf.localeCompare(left.report.asOf) || String(right.row.created_at ?? "").localeCompare(String(left.row.created_at ?? ""))), [rows]);
  const [kind, setKind] = useState<ReportKind>("current");
  const [date, setDate] = useState(today);
  const [selectedId, setSelectedId] = useState(parsedRows[0]?.report.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const filtered = parsedRows.filter((entry) => entry.report.kind === kind);
  const selected = parsedRows.find((entry) => entry.report.id === selectedId) ?? filtered[0] ?? parsedRows[0];

  function chooseByDate(nextDate: string) {
    setDate(nextDate);
    const end = `${nextDate}T23:59:59.999Z`;
    const match = filtered.find((entry) => entry.report.asOf <= end);
    setSelectedId(match?.report.id ?? "");
  }

  async function createReport() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId, kind, selectedDate: date, timeZone }) });
      const result = await response.json() as { error?: string; report?: ReportSnapshot };
      if (!response.ok) throw new Error(result.error ?? "Report could not be created.");
      setSelectedId(result.report?.id ?? "");
      setMessage(`${kind === "current" ? "Current" : kind === "monthly" ? "Monthly" : "Quarterly"} report created.`);
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Report could not be created."); }
    finally { setBusy(false); }
  }

  return <div className="adult-reports-view">
    <section className="report-controls" aria-label="Choose report"><label>Report type<Select value={kind} onValueChange={(value) => { setKind(value as ReportKind); const first = parsedRows.find((entry) => entry.report.kind === value); setSelectedId(first?.report.id ?? ""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="current">Current</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent></Select></label><label>Report date<input type="date" value={date} max={today} onChange={(event) => chooseByDate(event.target.value)} /></label><Button onClick={createReport} disabled={busy}><FilePlus2 />{busy ? "Creating…" : `Create ${kind} report`}</Button>{message && <span role="status">{message}</span>}</section>
    {selected ? <Card className="selected-report"><CardHeader><CardDescription>{selected.report.period?.label ?? `Through ${new Date(selected.report.asOf).toLocaleDateString("en-US", { dateStyle: "long" })}`}</CardDescription><CardTitle>Latest {selected.report.kind} report</CardTitle></CardHeader><CardContent className="grid gap-5"><section className="report-needs-attention"><h2>Needs attention next</h2>{selected.report.needsPractice.length ? <ul>{selected.report.needsPractice.map((concept) => <li key={concept}>{label(concept)}</li>)}</ul> : <p>No area currently meets the needs-practice rule.</p>}{selected.report.recommendedNextSteps.length > 0 && <ul>{selected.report.recommendedNextSteps.map((step) => <li key={step}>{step}</li>)}</ul>}</section><section><h2>Summary</h2><p>{selected.report.summary}</p></section><section className="report-notes-grid"><div><h2>Strengths</h2>{selected.report.strengths.length ? <ul>{selected.report.strengths.map((concept) => <li key={concept}>{label(concept)}</li>)}</ul> : <p>Not enough confirmed evidence yet.</p>}</div><div><h2>Work in this report</h2><p>{selected.report.worksheetSummaries.length} worksheet attempt{selected.report.worksheetSummaries.length === 1 ? "" : "s"}</p></div></section><Button asChild variant="outline"><Link href={`/print/report/${encodeURIComponent(selected.report.id)}`}><Printer />Print this report</Link></Button></CardContent></Card> : <Card><CardContent><p className="empty-note">No report exists for this selection. Create one above.</p></CardContent></Card>}
    <section className="report-archive"><h2>Report archive</h2>{parsedRows.length === 0 ? <p>No reports have been created.</p> : <ol>{parsedRows.map(({ report }) => <li key={report.id}><button type="button" onClick={() => setSelectedId(report.id)}><strong>{report.period?.label ?? new Date(report.asOf).toLocaleDateString("en-US")}</strong><span>{report.kind} · {report.summary}</span></button></li>)}</ol>}</section>
  </div>;
}
