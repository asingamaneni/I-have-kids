import Link from "next/link";
import type { CurriculumPackRevision, CurriculumRevisionDecision, CurriculumRevisionProposal } from "@child-learning/contracts";
import { AppShell, PageIntro } from "@/components/AppShell";
import { CurriculumReview } from "@/components/CurriculumReview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurriculumOverview, getStudent } from "@/lib/data";

export default async function CurriculumPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = await getStudent(studentId);
  if (!student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  const curriculum = await getCurriculumOverview() as { activeRevisions: CurriculumPackRevision[]; subjects: Array<{ id: string; title: string; description: string }>; proposals: Array<{ proposal: CurriculumRevisionProposal; decision?: CurriculumRevisionDecision }> };
  return <AppShell adult student={student}><main className="content-wrap adult-content"><PageIntro eyebrow="Open curriculum" title="Roadmap revisions" description="The learning graph can grow with new subjects and concepts. Claude may propose a revision, but an adult must review and activate it before it changes any learner roadmap." /><section className="active-curriculum-grid">{curriculum.activeRevisions.map((revision) => <Card key={revision.id}><CardHeader><CardDescription>{revision.packId} · revision {revision.revision}</CardDescription><CardTitle>{revision.title}</CardTitle></CardHeader><CardContent><p>{revision.description}</p><strong>{revision.concepts.length} concepts</strong></CardContent></Card>)}</section><div className="section-heading curriculum-review-title"><span>Proposed roadmap changes</span><small>Review provenance, concepts, and edges before activation</small></div><CurriculumReview proposals={curriculum.proposals} /></main></AppShell>;
}
