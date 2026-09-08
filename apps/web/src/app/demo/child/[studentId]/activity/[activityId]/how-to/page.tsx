import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ConceptGuide } from "@/components/ConceptGuide";
import { PrintGuideButton } from "@/components/PrintGuideButton";
import { getChildActivity, getStudent } from "@/lib/data";
import { childActivityRoute, childHomeRoute } from "@/lib/routes";

export default async function DemoActivityHowToPage({ params }: { params: Promise<{ studentId: string; activityId: string }> }) {
  const { studentId, activityId } = await params;
  const [student, activity] = await Promise.all([getStudent(studentId, "demo"), getChildActivity(activityId, "demo")]);
  if (!student || !activity || activity.studentId !== studentId || !activity.childGuide) return <main className="empty-state"><h1>This guide is not available.</h1><Link href={childHomeRoute(studentId, "demo")}>Back to worktable</Link></main>;
  return <AppShell student={student} routeScope="demo"><main className="content-wrap concept-guide-page"><p className="demo-data-banner">Demo data · This guide is isolated from household learners.</p><div className="activity-toolbar guide-controls"><Link href={childActivityRoute(studentId, activityId, "demo")}>← Back to worksheet</Link>{activity.childGuide.printable && <PrintGuideButton />}</div><ConceptGuide guide={activity.childGuide} /></main></AppShell>;
}
