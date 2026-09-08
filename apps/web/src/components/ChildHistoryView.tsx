import Link from "next/link";
import type { ChildActivityLifecycle } from "@child-learning/contracts";
import { AppShell, PageIntro } from "@/components/AppShell";
import { getStudentBundle, type DataScope } from "@/lib/data";
import { childActivityRoute, childHomeRoute, type LearnerRouteScope } from "@/lib/routes";

export async function ChildHistoryView({ studentId, dataScope = "household" }: { studentId: string; dataScope?: DataScope }) {
  const data = await getStudentBundle(studentId, dataScope);
  if (!data.student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>;
  const history = (data.learnerWork as { history: ChildActivityLifecycle[] }).history;
  const routeScope: LearnerRouteScope = dataScope === "demo" ? "demo" : "household";
  return <AppShell student={data.student} routeScope={routeScope}><main className="content-wrap child-history-page">
    {data.student.dataScope === "demo" && <p className="demo-data-banner">Demo data · This history is isolated from household learners.</p>}
    <PageIntro eyebrow="Your saved work" title="My history" description="Open a worksheet you tried before, or try the exact same page again." />
    {history.length === 0 ? <section className="empty-state"><h2>No saved work yet</h2><p>Finished and submitted worksheets will appear here.</p><Link href={childHomeRoute(studentId, routeScope)}>Back to my worktable</Link></section> : <ol className="child-history-list">{history.map((entry) => <li key={entry.latestSubmissionId ?? entry.activity.id}><div><span>{entry.statusLabel}</span><h2>{entry.activity.title}</h2><p>{entry.latestAttemptAt ? new Date(entry.latestAttemptAt).toLocaleDateString("en-US", { dateStyle: "medium" }) : "Saved work"} · {entry.attemptCount} attempt{entry.attemptCount === 1 ? "" : "s"}</p></div><div className="history-actions"><Link href={`${childActivityRoute(studentId, entry.activity.id, routeScope)}?historyFrom=${encodeURIComponent(entry.latestSubmissionId ?? "")}`}>Open worksheet</Link>{entry.status !== "awaiting-validation" && entry.latestSubmissionId && <Link className="button button-primary" href={`${childActivityRoute(studentId, entry.activity.id, routeScope)}?retryOf=${encodeURIComponent(entry.latestSubmissionId)}`}>Try this same worksheet again</Link>}</div></li>)}</ol>}
  </main></AppShell>;
}
