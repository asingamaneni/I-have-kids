import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ActivityForm } from "@/components/ActivityForm";
import { PhotoUpload } from "@/components/PhotoUpload";
import { getChildActivity, getStudent } from "@/lib/data";

export default async function ChildActivity({ params }: { params: Promise<{ studentId: string; activityId: string }> }) {
  const { studentId, activityId } = await params;
  const [student, activity] = await Promise.all([getStudent(studentId), getChildActivity(activityId)]);
  if (!student || !activity || activity.studentId !== studentId) return <main className="empty-state"><h1>That page is not on this shelf.</h1><Link href={`/child/${studentId}`}>Back to worktable</Link></main>;
  return <AppShell student={student}><main className="content-wrap activity-page">
    <div className="activity-toolbar"><Link href={`/child/${studentId}`}>← Back to shelf</Link><Link className="small-button" href={`/print/activity/${encodeURIComponent(activityId)}`}>Use a paper worksheet</Link></div>
    <ActivityForm activity={activity} />
    <PhotoUpload studentId={studentId} activityId={activityId} />
  </main></AppShell>;
}
