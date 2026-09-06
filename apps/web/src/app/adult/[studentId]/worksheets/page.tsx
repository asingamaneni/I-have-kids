import Link from "next/link";
import { Camera, CheckCircle2, Clock3, FileText } from "lucide-react";
import { AppShell, PageIntro } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudent, getWorksheetArchive } from "@/lib/data";

function label(value: unknown): string { return String(value ?? "").replaceAll(".", " · ").replaceAll("-", " "); }

export default async function WorksheetArchivePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const [student, rows] = await Promise.all([getStudent(studentId), getWorksheetArchive(studentId)]);
  if (!student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  return <AppShell adult student={student}><main className="content-wrap adult-content">
    <PageIntro eyebrow="Adult workspace" title="Worksheet history" description="Open the original page, compare the child's response with the correct answer, or inspect a saved paper submission." />
    {rows.length === 0 ? <Card><CardContent><p className="empty-note">Completed worksheets will appear here.</p></CardContent></Card> : <div className="worksheet-archive-grid">{rows.map((row) => {
      const score = row.score == null ? undefined : Math.round(Number(row.score) * 100);
      const isPhoto = String(row.submission_media_type ?? "").startsWith("image/");
      return <Card key={String(row.id)} className="worksheet-archive-card gap-4"><CardHeader><div className="archive-card-heading"><div className="archive-icon">{isPhoto ? <Camera /> : <FileText />}</div><div><CardTitle>{String(row.activity_title)}</CardTitle><CardDescription>{new Date(String(row.submitted_at)).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</CardDescription></div></div></CardHeader><CardContent className="grid gap-4"><div className="archive-badges"><Badge variant="secondary">{label(row.subject)}</Badge><Badge variant="outline">{label(row.concept_id)}</Badge>{score === undefined ? <Badge variant="outline"><Clock3 />Needs review</Badge> : <Badge variant="success"><CheckCircle2 />{score}%</Badge>}</div><div className="archive-actions"><Button asChild><Link href={`/adult/${studentId}/worksheets/${encodeURIComponent(String(row.id))}`}>Review work</Link></Button><Button asChild variant="outline"><Link href={`/print/activity/${encodeURIComponent(String(row.activity_id))}`}>Open worksheet</Link></Button><Button asChild variant="ghost"><Link href={`/print/activity/${encodeURIComponent(String(row.activity_id))}/answers`}>Answer guide</Link></Button></div></CardContent></Card>;
    })}</div>}
  </main></AppShell>;
}
