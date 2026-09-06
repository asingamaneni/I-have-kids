import Link from "next/link";
import { AppShell, PageIntro, EvidenceTrail } from "@/components/AppShell";
import { PracticeShelf } from "@/components/PracticeShelf";
import { getStudentBundle } from "@/lib/data";

export default async function ChildHome({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getStudentBundle(studentId);
  if (!data.student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  const latest = data.availableActivities[0];
  const entries = data.timeline.map((entry) => ({ kind: entry.kind === "submission" ? "Work saved" : entry.kind, at: entry.at, text: entry.kind === "submission" ? "A practice page was added to the worktable." : "A learning note was recorded." }));
  return <AppShell student={data.student}><main className="content-wrap child-home">
    <PageIntro eyebrow="Your worktable" title={`Hi, ${data.student.displayName.split(" ")[0]}.`} description="Pick one small practice moment. You can always come back to it." />
    <section className="child-hero"><div><p className="eyebrow">Ready when you are</p><h2>{latest?.title ?? "A fresh practice page"}</h2><p>{latest?.objectives[0] ?? "Try a little learning today."}</p><Link className="button button-primary" href={latest ? `/child/${studentId}/activity/${latest.id}` : "#"}>{latest ? "Start practice" : "No activity yet"}</Link></div><div className="hero-doodle" aria-hidden="true"><span>1</span><span>+</span><span>1</span><b>=</b><strong>2</strong></div></section>
    <PracticeShelf studentId={studentId} activities={data.availableActivities} />
    <EvidenceTrail entries={entries} />
  </main></AppShell>;
}
