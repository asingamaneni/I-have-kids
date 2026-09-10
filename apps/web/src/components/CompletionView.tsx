import Link from "next/link";
import type { ChildActivityLifecycle } from "@child-learning/contracts";
import { AppShell } from "@/components/AppShell";
import { getStudentBundle } from "@/lib/data";
import { childHomeRoute } from "@/lib/routes";

export async function CompletionView({ studentId, submissionId }: { studentId: string; submissionId?: string }) {
  const data = await getStudentBundle(studentId);
  if (!data.student) return <main className="empty-state"><h1>Student not found</h1></main>;
  const history = (data.learnerWork as { history: ChildActivityLifecycle[] }).history;
  const completed = submissionId ? history.find((entry) => entry.latestSubmissionId === submissionId) : history[0];
  const waiting = completed?.status === "awaiting-validation";
  return <AppShell student={data.student}><main className="content-wrap completion-page"><div className="completion-star" aria-hidden="true">✦</div><p className="eyebrow">Nice work</p><h1>{waiting ? "Your work is saved." : "You finished this practice."}</h1><p>{waiting ? "It is already in your history and is marked as waiting until an adult finishes the check." : "This attempt is complete and is now in your history. You can choose the next page or take a break."}</p><div className="landing-actions"><Link className="button button-primary" href={childHomeRoute(studentId)}>See what is next</Link></div></main></AppShell>;
}
