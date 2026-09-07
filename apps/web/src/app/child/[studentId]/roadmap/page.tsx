import Link from "next/link";
import type { ChildLearnerRoadmap } from "@child-learning/contracts";
import { AppShell, PageIntro } from "@/components/AppShell";
import { LearningGraph } from "@/components/LearningGraph";
import { getLearnerRoadmaps, getStudent } from "@/lib/data";

export default async function ChildRoadmapPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = await getStudent(studentId);
  if (!student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  const roadmaps = (await getLearnerRoadmaps(studentId, false) as { roadmaps: ChildLearnerRoadmap[] }).roadmaps;
  return <AppShell student={student}><main className="content-wrap child-roadmap-page"><PageIntro eyebrow="My learning map" title="See how your map grows." description="Finished stops stay on your map. New stops appear as you learn, and practice paths help when you need another way through." /><LearningGraph roadmaps={roadmaps} audience="child" /></main></AppShell>;
}
