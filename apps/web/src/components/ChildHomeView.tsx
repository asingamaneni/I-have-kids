import Link from "next/link";
import { toChildLearnerRoadmap, type ChildActivityLifecycle, type LearnerRoadmap } from "@child-learning/contracts";
import { AppShell, PageIntro } from "@/components/AppShell";
import { LearningGraph } from "@/components/LearningGraph";
import { PracticeShelf } from "@/components/PracticeShelf";
import { getStudentBundle } from "@/lib/data";
import { childActivityRoute } from "@/lib/routes";

export async function ChildHomeView({ studentId }: { studentId: string }) {
  const data = await getStudentBundle(studentId);
  if (!data.student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  const currentWork = (data.learnerWork as { current: ChildActivityLifecycle[] }).current;
  const primary = currentWork.find((entry) => entry.recommended) ?? currentWork.find((entry) => entry.status !== "awaiting-validation");
  const childRoadmaps = (data.roadmaps as { roadmaps: LearnerRoadmap[] }).roadmaps.map(toChildLearnerRoadmap);
  return <AppShell student={data.student}><main className="content-wrap child-home">
    <PageIntro eyebrow="Your worktable" title={`Hi, ${data.student.displayName.split(" ")[0]}.`} description={data.student.baselineStatus === "awaiting-intake" ? "An adult needs to finish the starting questionnaire before practice appears." : "Pick one small practice moment. You can always come back to it."} />
    {data.student.baselineStatus === "awaiting-intake" ? <section className="empty-state"><h2>No work has been assigned yet</h2><p>Ask an adult to describe what you can do or complete the starting questionnaire.</p></section> : <>
      <section className="child-hero"><div className="child-hero-intro"><p className="eyebrow">Ready when you are</p><h2>{primary ? "Choose one thing to work on" : "Your work is being checked"}</h2><p>{primary ? "The best next page is ready on the right." : "There is nothing new to start yet."}</p></div>{primary ? <article className="primary-work-card"><span>{primary.statusLabel}</span><h2>{primary.activity.title}</h2><p>{primary.activity.objectives[0]}</p><Link className="button button-primary" href={childActivityRoute(studentId, primary.activity.id)}>{primary.actionLabel}</Link></article> : <div className="hero-doodle roadmap-doodle" aria-hidden="true"><span>Done</span><b>→</b><strong>Checking</strong></div>}</section>
      <LearningGraph roadmaps={childRoadmaps} audience="child" />
      <PracticeShelf studentId={studentId} activities={currentWork} />
    </>}
  </main></AppShell>;
}
