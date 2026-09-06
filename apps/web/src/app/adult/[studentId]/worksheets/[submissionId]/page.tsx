import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivitySpecSchema, EvaluationSchema, type AnswerSpec } from "@kindergarten/contracts";
import { AppShell, PageIntro } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStudent, getWorksheetReview } from "@/lib/data";

function answerText(answer: AnswerSpec | undefined): string {
  if (!answer) return "No answer specification";
  if (answer.type === "integer" || answer.type === "number" || answer.type === "text" || answer.type === "choice") return String(answer.expected);
  if (answer.type === "sequence") return answer.expected.join(", ");
  if (answer.type === "rubric") return `Adult rubric: ${answer.rubricId}`;
  return `Observe: ${answer.acceptedFeatures.join(", ")}`;
}

function responseText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "No digital response";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export default async function WorksheetReviewPage({ params }: { params: Promise<{ studentId: string; submissionId: string }> }) {
  const { studentId, submissionId } = await params;
  const [student, row] = await Promise.all([getStudent(studentId), getWorksheetReview(studentId, submissionId)]);
  if (!student || !row) notFound();
  const activity = ActivitySpecSchema.parse(JSON.parse(String(row.specification_json)));
  const payload = JSON.parse(String(row.payload_json ?? "{}")) as { responses?: Array<{ itemId: string; value: unknown }> };
  const responses = new Map((payload.responses ?? []).map((response) => [response.itemId, response.value]));
  const evaluation = row.evaluation_json ? EvaluationSchema.parse(JSON.parse(String(row.evaluation_json))) : undefined;
  const itemEvidence = new Map(evaluation?.items.map((item) => [item.itemId, item]));
  const imageArtifactId = String(row.submission_media_type ?? "").startsWith("image/") && row.artifact_id ? String(row.artifact_id) : undefined;

  return <AppShell adult student={student}><main className="content-wrap adult-content">
    <PageIntro eyebrow="Worksheet history" title={activity.title} description={`Submitted ${new Date(String(row.submitted_at)).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}. Answers and evaluation evidence are shown only in the adult workspace.`} action={<div className="archive-actions"><Button asChild variant="outline"><Link href={`/print/activity/${encodeURIComponent(activity.id)}`}>Original worksheet</Link></Button><Button asChild variant="outline"><Link href={`/print/activity/${encodeURIComponent(activity.id)}/answers`}>Answer guide</Link></Button></div>} />
    <div className="worksheet-review-summary"><Card><CardHeader><CardTitle>Result</CardTitle></CardHeader><CardContent><strong className="review-score">{evaluation?.status === "final" ? `${Math.round(evaluation.score * 100)}%` : "Needs adult review"}</strong><p>{evaluation?.followUp.reason ?? (evaluation?.status === "final" ? "Recorded from confirmed evidence." : "No evaluation has been recorded yet.")}</p><div className="archive-badges"><Badge variant="secondary">{activity.subject}</Badge><Badge variant="outline">{activity.conceptId}</Badge><Badge variant={evaluation?.status === "final" ? "success" : "outline"}>{evaluation?.status ?? "not evaluated"}</Badge></div></CardContent></Card>{imageArtifactId && <Card><CardHeader><CardTitle>Completed paper page</CardTitle></CardHeader><CardContent><a href={`/api/artifacts/${encodeURIComponent(imageArtifactId)}`} target="_blank" rel="noreferrer"><Image unoptimized className="submitted-worksheet-image" src={`/api/artifacts/${encodeURIComponent(imageArtifactId)}`} width={900} height={1200} alt={`Completed ${activity.title} worksheet`} /></a></CardContent></Card>}</div>
    <Card className="worksheet-answer-review"><CardHeader><CardTitle>Response review</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Child&apos;s response</TableHead><TableHead>Correct answer or rubric</TableHead><TableHead>Evaluation</TableHead></TableRow></TableHeader><TableBody>{activity.items.map((item, index) => {
      const evidence = itemEvidence.get(item.id);
      return <TableRow key={item.id}><TableCell><strong>{index + 1}. {item.prompt}</strong></TableCell><TableCell>{responseText(responses.get(item.id))}</TableCell><TableCell>{answerText(activity.answerSpecs[item.id])}</TableCell><TableCell>{evidence ? <><Badge variant={evidence.score === 1 ? "success" : "outline"}>{evidence.score === 1 ? "Correct" : evidence.evidenceStatus === "confirmed" ? "Needs practice" : "Review"}</Badge><p className="table-rationale">{evidence.rationale}</p></> : "Not evaluated"}</TableCell></TableRow>;
    })}</TableBody></Table></CardContent></Card>
  </main></AppShell>;
}
