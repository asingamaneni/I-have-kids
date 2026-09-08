import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ConceptGuide } from "@/components/ConceptGuide";
import { PrintGuideButton } from "@/components/PrintGuideButton";
import { getChildActivity, getHistoricalChildActivity, getStudent } from "@/lib/data";
import { childActivityRoute, childHomeRoute } from "@/lib/routes";

export default async function ActivityHowToPage({ params, searchParams }: { params: Promise<{ studentId: string; activityId: string }>; searchParams: Promise<{ historyFrom?: string }> }) {
  const [{ studentId, activityId }, query] = await Promise.all([params, searchParams]);
  const [student, activity] = await Promise.all([getStudent(studentId), query.historyFrom ? getHistoricalChildActivity(activityId, studentId) : getChildActivity(activityId)]);
  if (!student || !activity || activity.studentId !== studentId || !activity.childGuide) return <main className="empty-state"><h1>This guide is not available.</h1><Link href={childHomeRoute(studentId)}>Back to worktable</Link></main>;
  return <AppShell student={student}><main className="content-wrap concept-guide-page">
    <div className="activity-toolbar guide-controls"><Link href={childActivityRoute(studentId, activityId)}>← Back to worksheet</Link>{activity.childGuide.printable && <PrintGuideButton />}</div>
    <ConceptGuide guide={activity.childGuide} />
  </main></AppShell>;
}
