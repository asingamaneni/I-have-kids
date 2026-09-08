import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ActivityForm } from "@/components/ActivityForm";
import { PhotoUpload } from "@/components/PhotoUpload";
import { getChildActivity, getHistoricalChildActivity, getStudent, isValidRetrySource } from "@/lib/data";
import { childHomeRoute, childHowToRoute } from "@/lib/routes";

export default async function DemoChildActivity({ params, searchParams }: { params: Promise<{ studentId: string; activityId: string }>; searchParams: Promise<{ retryOf?: string; historyFrom?: string }> }) {
  const [{ studentId, activityId }, query] = await Promise.all([params, searchParams]);
  const [student, activity, retryValid] = await Promise.all([getStudent(studentId, "demo"), query.retryOf || query.historyFrom ? getHistoricalChildActivity(activityId, studentId, "demo") : getChildActivity(activityId, "demo"), query.retryOf ? isValidRetrySource(studentId, activityId, query.retryOf, "demo") : true]);
  if (!student || !activity || activity.studentId !== studentId || !retryValid) return <main className="empty-state"><h1>That page is not on this demo shelf.</h1><Link href={childHomeRoute(studentId, "demo")}>Back to worktable</Link></main>;
  return <AppShell student={student} routeScope="demo"><main className="content-wrap activity-page">
    <p className="demo-data-banner">Demo data · This work is isolated from household learners.</p>
    <div className="activity-toolbar"><Link href={childHomeRoute(studentId, "demo")}>← Back to shelf</Link>{activity.childGuide && <Link className="small-button" href={`${childHowToRoute(studentId, activityId, "demo")}${query.historyFrom ? `?historyFrom=${encodeURIComponent(query.historyFrom)}` : ""}`}>How to learn this</Link>}</div>
    <ActivityForm activity={activity} routeScope="demo" {...(query.retryOf ? { retryOfSubmissionId: query.retryOf } : {})} />
    <PhotoUpload studentId={studentId} activityId={activityId} dataScope="demo" {...(query.retryOf ? { retryOfSubmissionId: query.retryOf } : {})} />
  </main></AppShell>;
}
