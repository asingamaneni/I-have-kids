import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ActivityForm } from "@/components/ActivityForm";
import { PhotoUpload } from "@/components/PhotoUpload";
import { getChildActivity, getHistoricalChildActivity, getStudent, isValidRetrySource } from "@/lib/data";
import { childHomeRoute, childHowToRoute } from "@/lib/routes";

export default async function ChildActivity({ params, searchParams }: { params: Promise<{ studentId: string; activityId: string }>; searchParams: Promise<{ retryOf?: string; historyFrom?: string }> }) {
  const [{ studentId, activityId }, query] = await Promise.all([params, searchParams]);
  const [student, activity, retryValid] = await Promise.all([getStudent(studentId), query.retryOf || query.historyFrom ? getHistoricalChildActivity(activityId, studentId) : getChildActivity(activityId), query.retryOf ? isValidRetrySource(studentId, activityId, query.retryOf) : true]);
  if (!student || !activity || activity.studentId !== studentId || !retryValid) return <main className="empty-state"><h1>That page is not on this shelf.</h1><Link href={childHomeRoute(studentId)}>Back to worktable</Link></main>;
  return <AppShell student={student}><main className="content-wrap activity-page">
    <div className="activity-toolbar"><Link href={childHomeRoute(studentId)}>← Back to shelf</Link><div className="activity-toolbar-actions">{activity.childGuide && <Link className="small-button" href={`${childHowToRoute(studentId, activityId)}${query.historyFrom ? `?historyFrom=${encodeURIComponent(query.historyFrom)}` : ""}`}>How to learn this</Link>}<Link className="small-button" href={`/print/activity/${encodeURIComponent(activityId)}`}>Use a paper worksheet</Link></div></div>
    <ActivityForm activity={activity} {...(query.retryOf ? { retryOfSubmissionId: query.retryOf } : {})} />
    <PhotoUpload studentId={studentId} activityId={activityId} {...(query.retryOf ? { retryOfSubmissionId: query.retryOf } : {})} />
  </main></AppShell>;
}
