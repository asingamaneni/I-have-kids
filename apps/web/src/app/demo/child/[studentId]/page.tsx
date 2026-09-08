import { ChildHomeView } from "@/components/ChildHomeView";

export default async function DemoChildHome({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <ChildHomeView studentId={studentId} dataScope="demo" />;
}
