import { NextResponse } from "next/server";
import { generateProgressReport, getProgressReportAtOrBefore, listProgressReports } from "@/lib/data";

type ReportKind = "current" | "monthly" | "quarterly";

function parseKind(value: string | null | undefined): ReportKind | undefined {
  if (!value) return undefined;
  if (value !== "current" && value !== "monthly" && value !== "quarterly") throw new Error("kind must be current, monthly, or quarterly.");
  return value;
}

function parseRow(row: Record<string, unknown> | undefined) {
  if (!row) return undefined;
  return { ...row, report: JSON.parse(String(row.report_json)) as Record<string, unknown> };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId")?.trim();
    if (!studentId) throw new Error("studentId is required.");
    const kind = parseKind(url.searchParams.get("kind"));
    const asOf = url.searchParams.get("asOf");
    const rows = await listProgressReports(studentId, kind);
    const selected = asOf ? await getProgressReportAtOrBefore(studentId, new Date(asOf).toISOString(), kind) : rows[0];
    return NextResponse.json({ reports: rows.map(parseRow), selected: parseRow(selected) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reports could not be loaded" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { studentId?: string; kind?: string; selectedDate?: string; timeZone?: string };
    const studentId = body.studentId?.trim();
    if (!studentId) throw new Error("studentId is required.");
    const kind = parseKind(body.kind) ?? "current";
    const selectedDate = body.selectedDate?.trim();
    if (!selectedDate) throw new Error("selectedDate is required.");
    const timeZone = body.timeZone?.trim() || "UTC";
    const result = await generateProgressReport(studentId, { kind, selectedDate, timeZone });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Report could not be generated" }, { status: 400 });
  }
}
