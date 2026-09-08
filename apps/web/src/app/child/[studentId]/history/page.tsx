import { ChildHistoryView } from "@/components/ChildHistoryView";

export default async function ChildHistoryPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <ChildHistoryView studentId={studentId} />;
}
