import Link from "next/link";
import { AppShell, PageIntro } from "@/components/AppShell";
import { AdultReportsView } from "@/components/AdultReportsView";
import { getStudent, listProgressReports } from "@/lib/data";

export default async function ReportsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const [student, rows] = await Promise.all([getStudent(studentId), listProgressReports(studentId)]);
  if (!student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  return <AppShell adult student={student}><main className="content-wrap adult-content"><PageIntro eyebrow="Adult workspace" title="Reports" description="The newest evidence snapshot is shown first. Choose a date or create a monthly or quarterly view without changing learning history." /><AdultReportsView studentId={studentId} rows={rows.map((row) => ({ id: String(row.id), report_json: String(row.report_json), ...(row.as_of ? { as_of: String(row.as_of) } : {}), ...(row.created_at ? { created_at: String(row.created_at) } : {}) }))} /></main></AppShell>;
}
