import Link from "next/link";
import { AdultTablePage } from "@/components/AdultView";
import { getStudentBundle } from "@/lib/data";
export default async function ProgressPage({ params }: { params: Promise<{ studentId: string }> }) { const { studentId } = await params; const data = await getStudentBundle(studentId); if (!data.student) return <main className="empty-state"><h1>Student not found</h1><Link href="/">Back home</Link></main>; return <AdultTablePage data={data} kind="progress" title="Progress" description="A compact view of concept states and recent mastery evidence." />; }
