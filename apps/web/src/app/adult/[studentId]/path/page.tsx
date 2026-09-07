import Link from "next/link";
import type { LearnerRoadmap } from "@child-learning/contracts";
import { AppShell, PageIntro } from "@/components/AppShell";
import { LearningPathView } from "@/components/LearningPathView";
import { getStudentBundle } from "@/lib/data";

export default async function LearningPathPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getStudentBundle(studentId);
  if (!data.student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  const roadmaps = (data.roadmaps as { roadmaps: LearnerRoadmap[] }).roadmaps;
  return <AppShell adult student={data.student}><main className="content-wrap adult-content"><PageIntro eyebrow="Individual learning plan" title="Learning roadmap" description="See completed learning, the current frontier, upcoming concepts, and evidence-backed practice branches. Age and school placement shape presentation but never set a ceiling." /><LearningPathView studentId={studentId} concepts={data.learningPath.availability} roadmaps={roadmaps} /></main></AppShell>;
}
