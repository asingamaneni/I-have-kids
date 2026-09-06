import Link from "next/link";
import { AppShell, PageIntro } from "@/components/AppShell";
import { LearningPathView } from "@/components/LearningPathView";
import { getStudentBundle } from "@/lib/data";

export default async function LearningPathPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getStudentBundle(studentId);
  if (!data.student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  return <AppShell adult student={data.student}><main className="content-wrap adult-content"><PageIntro eyebrow="Individual learning plan" title="Learning path" description="Follow demonstrated capabilities, introduce a new idea with real materials, or adjust what appears next. School grade never sets a ceiling." /><LearningPathView studentId={studentId} concepts={data.learningPath.availability} /></main></AppShell>;
}
