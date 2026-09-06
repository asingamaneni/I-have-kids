import Image from "next/image";
import Link from "next/link";
import { AppShell, EvidenceTrail, PageIntro, StatCard } from "./AppShell";
import type { Student } from "@kindergarten/contracts";
import { ReviewForm } from "./ReviewForm";
import { ReviewActions } from "./ReviewActions";
import { ReportActions } from "./ReportActions";

export interface BundleView { student: Student | undefined; activities: { id: string; title: string; subject: string; conceptId: string; difficultyLevel?: number }[]; states: Record<string, unknown>[]; submissions: Record<string, unknown>[]; evaluations: Record<string, unknown>[]; pendingEvaluations: Record<string, unknown>[]; timeline: { kind: string; at: string; payload: Record<string, unknown> }[]; reports: Record<string, unknown>[]; recommendations: Record<string, unknown>[]; }

export function AdultOverview({ data }: { data: BundleView }) {
  const student = data.student; if (!student) return null;
  const confirmedEvaluations = data.evaluations.filter((row) => row.outcome === "final");
  const latest = confirmedEvaluations.at(-1);
  const avg = confirmedEvaluations.length ? confirmedEvaluations.reduce((sum, row) => sum + Number(row.score ?? 0), 0) / confirmedEvaluations.length : 0;
  const recommendationRow = data.recommendations[0];
  let recommendation: { selectedActivityId?: string; conciseReason?: string } | undefined;
  try { recommendation = recommendationRow?.recommendation_json ? JSON.parse(String(recommendationRow.recommendation_json)) as { selectedActivityId?: string; conciseReason?: string } : undefined; } catch { recommendation = undefined; }
  const nextActivity = data.activities.find((activity) => activity.id === recommendation?.selectedActivityId) ?? data.activities[0];
  const recommendationReason = recommendation?.conciseReason ?? String(recommendationRow?.reason ?? (latest ? "The latest confirmed evidence is ready to guide another small step." : "Seeded practice pages are ready for a child to try."));
  return <AppShell adult student={student}><main className="content-wrap adult-content"><PageIntro eyebrow="A clear view of learning" title={`${student.displayName}'s worktable`} description="Use the evidence below to choose the next small step, not to label a child." action={<ReportActions studentId={student.id} reportId={data.reports[0] ? String(data.reports[0].id) : undefined} />} /><div className="stats-grid"><StatCard label="Practice pages" value={String(data.activities.length)} detail="available locally" tone="blue"/><StatCard label="Average evidence" value={`${Math.round(avg * 100)}%`} detail={latest ? "latest work included" : "waiting for work"} tone="green"/><StatCard label="Concept notes" value={String(data.states.length)} detail="tracked over time" tone="yellow"/><StatCard label="Needs review" value={String(data.pendingEvaluations.length)} detail="adult attention" tone="coral"/></div><div className="dashboard-grid"><section className="panel concept-panel"><div className="section-heading"><span>Concept matrix</span><small>Current state by idea</small></div>{data.states.length === 0 ? <p className="empty-note">Complete a page to see concept evidence here.</p> : <div className="concept-list">{data.states.map((state) => <div className="concept-row" key={`${state.student_id}-${state.concept_id}`}><span className="concept-name">{String(state.concept_id).replaceAll(".", " · ")}</span><span className="state-pill">{String(state.status)}</span><span className="meter"><i style={{ width: `${Math.round(Number(state.mastery ?? 0) * 100)}%` }} /></span><strong>{Math.round(Number(state.mastery ?? 0) * 100)}%</strong></div>)}</div>}</section><section className="panel next-panel"><div className="section-heading"><span>Next useful move</span><small>Based on confirmed evidence</small></div><h2>{nextActivity?.title ?? "Add a practice page"}</h2><p>{recommendationReason}</p>{nextActivity && <small className="recommendation-meta">{nextActivity.subject} · difficulty step {nextActivity.difficultyLevel ?? 0}</small>}<Link className="text-link" href={`/child/${student.id}`}>View child shelf →</Link></section></div><EvidenceTrail entries={data.timeline.map((entry) => ({ kind: entry.kind, at: entry.at, text: entry.kind === "submission" ? "A practice response was submitted." : entry.kind === "progress_event" ? "A progress event was appended." : "A record was added to the learning history." }))} /></main></AppShell>;
}

function ReviewEvidence({ row }: { row: Record<string, unknown> }) {
  let evaluation: { confidence?: number; evidence?: string[]; items?: Array<{ itemId: string; rationale: string; evidenceStatus: string }> } | undefined;
  try { evaluation = row.evaluation_json ? JSON.parse(String(row.evaluation_json)) as typeof evaluation : undefined; } catch { evaluation = undefined; }
  const artifactId = typeof row.submission_artifact_id === "string" ? row.submission_artifact_id : undefined;
  const image = String(row.submission_media_type ?? "").startsWith("image/");
  return <div className="review-evidence">
    <strong>{String(row.activity_title ?? row.activity_id ?? "Submitted activity")}</strong>
    <span>Proposal confidence: {Math.round(Number(evaluation?.confidence ?? 0) * 100)}% · not a grade</span>
    {artifactId && image && <a href={`/api/artifacts/${encodeURIComponent(artifactId)}`} target="_blank" rel="noreferrer"><Image unoptimized className="review-evidence-image" src={`/api/artifacts/${encodeURIComponent(artifactId)}`} width={480} height={640} alt={`Submitted worksheet for ${String(row.activity_title ?? "review")}`} /></a>}
    {artifactId && <a className="text-link" href={`/api/artifacts/${encodeURIComponent(artifactId)}`} target="_blank" rel="noreferrer">Open source submission</a>}
    {(evaluation?.evidence ?? []).map((evidence) => <span key={evidence}>{evidence}</span>)}
    {(evaluation?.items ?? []).map((item) => <span key={item.itemId}>{item.itemId}: {item.rationale} ({item.evidenceStatus})</span>)}
  </div>;
}

export function AdultTablePage({ data, title, description, kind }: { data: BundleView; title: string; description: string; kind: "progress" | "history" | "reviews" | "reports" | "settings" }) {
  const student = data.student; if (!student) return null;
  const rows: Record<string, unknown>[] = kind === "progress" ? data.states : kind === "history" ? data.timeline as unknown as Record<string, unknown>[] : kind === "reviews" ? data.pendingEvaluations : data.reports;
  return <AppShell adult student={student}><main className="content-wrap adult-content"><PageIntro eyebrow="Adult workspace" title={title} description={description} />{kind === "settings" ? <SettingsPanel student={student} /> : <section className="panel table-panel"><div className="table-wrap">{rows.length === 0 ? <p className="empty-note">Nothing here yet. New evidence will appear after the next activity.</p> : <table><thead><tr><th>Record</th><th>Details</th><th>When</th>{kind === "reviews" && <th>Action</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)}><td><strong>{kind === "reports" ? <Link href={`/print/report/${encodeURIComponent(String(row.id))}`}>{String(row.report_type ?? row.id)}</Link> : String(row.concept_id ?? row.kind ?? row.report_type ?? row.id)}</strong></td><td>{kind === "reviews" ? <ReviewEvidence row={row} /> : String(row.reason ?? row.status ?? row.outcome ?? row.summary ?? "Recorded evidence")}</td><td>{String(row.occurred_at ?? row.at ?? row.created_at ?? "").slice(0, 10)}</td>{kind === "reviews" && <td><ReviewActions evaluationId={String(row.id)} /></td>}</tr>)}</tbody></table>}</div></section>}{kind === "reviews" && <ReviewForm studentId={student.id} />}{kind === "reports" && <ReportActions studentId={student.id} reportId={data.reports[0] ? String(data.reports[0].id) : undefined} />}</main></AppShell>;
}

function SettingsPanel({ student }: { student: Student }) {
  return <section className="panel settings-panel"><h2>Local workspace</h2><p>Student records, activity specifications, and uploaded artifacts stay on this device.</p><dl><div><dt>Student</dt><dd>{student.displayName}</dd></div><div><dt>School placement <small>(context only)</small></dt><dd>{student.gradeBand}</dd></div><div><dt>Language</dt><dd>{student.preferredLanguage === "en" ? "English" : student.preferredLanguage}</dd></div><div><dt>Starting assessment</dt><dd>{student.baselineStatus.replaceAll("-", " ")}</dd></div></dl>{student.reportedCapabilities.length > 0 && <div className="baseline-summary"><h3>Adult-reported starting point</h3><p>These statements selected the diagnostic activities. They are not treated as mastered skills until confirmed by the child&apos;s work.</p><ul>{student.reportedCapabilities.map((capability) => <li key={capability}>{capability.replaceAll(".", " · ").replaceAll("-", " ")}</li>)}</ul>{student.baselineNotes && <blockquote>{student.baselineNotes}</blockquote>}</div>}<p className="privacy-note">No answers are shown in child view. Photo uploads are marked for adult review; this app does not claim to read handwriting.</p></section>;
}
