import { CompletionView } from "@/components/CompletionView";

export default async function CompletionPage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ submissionId?: string }> }) {
  const [{ studentId }, query] = await Promise.all([params, searchParams]);
  return <CompletionView studentId={studentId} {...(query.submissionId ? { submissionId: query.submissionId } : {})} />;
}
