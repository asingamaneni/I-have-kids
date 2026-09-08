import Link from "next/link";
import type { LearnerRoadmap } from "@child-learning/contracts";
import { AdultOverview, AdultTablePage } from "@/components/AdultView";
import { AppShell, PageIntro } from "@/components/AppShell";
import { LearningGraph } from "@/components/LearningGraph";
import { getStudentBundle } from "@/lib/data";

const labels: Record<string, { kind: "progress" | "history"; title: string; description: string }> = {
  progress: { kind: "progress", title: "Progress", description: "Concept states and evidence inside the isolated demo." },
  history: { kind: "history", title: "History", description: "Append-only events inside the isolated demo." },
};

export default async function DemoAdultPage({ params }: { params: Promise<{ studentId: string; view?: string[] }> }) {
  const { studentId, view = [] } = await params;
  const data = await getStudentBundle(studentId, "demo");
  if (!data.student) return <main className="empty-state"><h1>Demo learner not found</h1><Link href="/">Back home</Link></main>;
  const section = view[0];
  if (!section) return <AdultOverview data={data} />;
  if (section === "path") {
    const roadmaps = (data.roadmaps as { roadmaps: LearnerRoadmap[] }).roadmaps;
    return <AppShell adult student={data.student} routeScope="demo"><main className="content-wrap adult-content"><p className="demo-data-banner">Demo data · Synthetic evidence is isolated from household learners.</p><PageIntro eyebrow="Individual learning plan" title="Learning roadmap" description="See the demo learner inside the complete approved subject path." /><LearningGraph roadmaps={roadmaps} audience="adult" /></main></AppShell>;
  }
  const label = labels[section ?? ""];
  if (!label) return <AppShell adult student={data.student} routeScope="demo"><main className="content-wrap adult-content"><p className="demo-data-banner">Demo data · This read-only showcase is isolated from household learners.</p><PageIntro eyebrow="Demo workspace" title="This demo section is not interactive" description="Use a household learner to create reports, review submissions, or change a learning plan." /></main></AppShell>;
  return <AdultTablePage data={data} kind={label.kind} title={label.title} description={label.description} />;
}
