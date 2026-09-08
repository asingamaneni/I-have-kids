import { CompletionView } from "@/components/CompletionView";

export default async function DemoCompletionPage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ submissionId?: string }> }) {
  const [{ studentId }, query] = await Promise.all([params, searchParams]);
  return <CompletionView studentId={studentId} dataScope="demo" {...(query.submissionId ? { submissionId: query.submissionId } : {})} />;
}
