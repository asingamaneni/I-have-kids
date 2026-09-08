import Link from "next/link";
import type { ChildLearnerRoadmap } from "@child-learning/contracts";
import { AppShell, PageIntro } from "@/components/AppShell";
import { LearningGraph } from "@/components/LearningGraph";
import { getLearnerRoadmaps, getStudent } from "@/lib/data";

export default async function DemoChildRoadmapPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = await getStudent(studentId, "demo");
  if (!student) return <main className="empty-state"><h1>Demo learner not found</h1><Link href="/">Back home</Link></main>;
  const roadmaps = (await getLearnerRoadmaps(studentId, false, "demo") as { roadmaps: ChildLearnerRoadmap[] }).roadmaps;
  return <AppShell student={student} routeScope="demo"><main className="content-wrap child-roadmap-page"><p className="demo-data-banner">Demo data · This roadmap is isolated from household learners.</p><PageIntro eyebrow="My learning map" title="See where you are and where you can go." description="Start with your next five steps, or open the whole subject path whenever you want." /><LearningGraph roadmaps={roadmaps} audience="child" /></main></AppShell>;
}
