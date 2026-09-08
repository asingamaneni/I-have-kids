import Link from "next/link";
import type { LearnerRoadmap } from "@child-learning/contracts";
import { AppShell, PageIntro } from "@/components/AppShell";
import { LearningPathView } from "@/components/LearningPathView";
import { PrintButton } from "@/components/PrintButton";
import { getStudentBundle } from "@/lib/data";

export default async function LearningPathPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getStudentBundle(studentId);
  if (!data.student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  const roadmaps = (data.roadmaps as { roadmaps: LearnerRoadmap[] }).roadmaps;
  return <AppShell adult student={data.student}><main className="content-wrap adult-content"><PageIntro eyebrow="Individual learning plan" title="Learning roadmap" description="See the complete approved subject path from foundations through advanced work, with this learner's current place and evidence-backed practice branches marked." action={<PrintButton label="Print full subject map" />} /><LearningPathView studentId={studentId} concepts={data.learningPath.availability} roadmaps={roadmaps} /></main></AppShell>;
}
