import { notFound } from "next/navigation";
import { ReportSnapshotSchema } from "@child-learning/contracts";
import { getReport, getStudent } from "@/lib/data";

function conceptLabel(conceptId: string): string {
  return conceptId.replaceAll(".", " · ").replaceAll("-", " ");
}

export default async function PrintReport({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const row = await getReport(reportId);
  if (!row) notFound();
  const report = ReportSnapshotSchema.parse(JSON.parse(String(row.report_json)));
  const student = await getStudent(report.studentId);
  const selected = report.recommendation?.candidates.find((candidate) => candidate.activityId === report.recommendation?.selectedActivityId);

  return <main className="report-print" data-render-ready="true">
    <header>
      <p className="eyebrow">Learning Worktable · adult report</p>
      <h1>{student?.displayName ?? report.studentId}&apos;s learning notes</h1>
      <p>{report.period?.label ?? `Evidence through ${new Date(report.asOf).toLocaleDateString("en-US", { dateStyle: "long" })}`} · {report.kind} report</p>
    </header>

    <section className="report-summary report-needs-attention"><h2>Needs attention next</h2>{report.needsPractice.length ? <ul>{report.needsPractice.map((concept) => <li key={concept}>{conceptLabel(concept)}</li>)}</ul> : <p>No area currently meets the needs-practice rule.</p>}{report.recommendedNextSteps.length > 0 && <ul>{report.recommendedNextSteps.map((step) => <li key={step}>{step}</li>)}</ul>}</section>
    <section className="report-summary"><h2>What the evidence says</h2><p>{report.summary}</p></section>

    {student && student.reportedCapabilities.length > 0 && <section><h2>Starting context</h2><p><strong>Assessment status:</strong> {student.baselineStatus.replaceAll("-", " ")}</p><p>The following abilities were reported by an adult and used to select starting diagnostics; they were not counted as mastery without confirmed work.</p><ul>{student.reportedCapabilities.map((capability) => <li key={capability}>{capability.replaceAll(".", " · ").replaceAll("-", " ")}</li>)}</ul>{student.baselineNotes && <p><strong>Adult note:</strong> {student.baselineNotes}</p>}</section>}

    <section className="report-notes-grid">
      <div><h2>Strengths</h2>{report.strengths.length ? <ul>{report.strengths.map((concept) => <li key={concept}>{conceptLabel(concept)}</li>)}</ul> : <p>No strength area has enough confirmed evidence yet.</p>}</div>
      <div><h2>Needs practice</h2>{report.needsPractice.length ? <ul>{report.needsPractice.map((concept) => <li key={concept}>{conceptLabel(concept)}</li>)}</ul> : <p>No concept currently meets the targeted-practice rule.</p>}</div>
    </section>

    {report.learningPath.length > 0 && <section><h2>Capability-based learning path</h2><table><thead><tr><th>Concept</th><th>Availability</th><th>Current representation</th><th>Why</th></tr></thead><tbody>{report.learningPath.map((concept) => <tr key={concept.conceptId}><td>{conceptLabel(concept.conceptId)}</td><td>{concept.status}</td><td>{concept.currentStage}</td><td>{concept.reason}</td></tr>)}</tbody></table></section>}

    <section><h2>Concept evidence</h2><table><thead><tr><th>Concept</th><th>State</th><th>Step</th><th>Confirmed observations</th><th>Trend</th><th>Recent scores</th></tr></thead><tbody>{report.conceptStates.map((state) => {
      const evidence = report.evidence.find((entry) => entry.conceptId === state.conceptId);
      return <tr key={state.conceptId}><td>{conceptLabel(state.conceptId)}</td><td>{state.status}</td><td>{state.step}</td><td>{evidence?.evidenceCount ?? 0}</td><td>{evidence?.trend ?? "insufficient-data"}</td><td>{state.recentScores.map((score) => `${Math.round(score * 100)}%`).join(", ") || "—"}</td></tr>;
    })}</tbody></table></section>

    <section><h2>Recent worksheets</h2>{report.worksheetSummaries.length ? <table><thead><tr><th>Worksheet</th><th>Date</th><th>Result</th><th>Items correct</th><th>Adult review</th></tr></thead><tbody>{report.worksheetSummaries.map((worksheet) => <tr key={worksheet.submissionId}><td>{worksheet.title}</td><td>{new Date(worksheet.submittedAt).toLocaleDateString("en-US")}</td><td>{worksheet.score === undefined ? worksheet.status : `${Math.round(worksheet.score * 100)}%`}</td><td>{worksheet.correctItems === undefined ? "—" : `${worksheet.correctItems} of ${worksheet.totalItems}`}</td><td><a href={`/adult/${report.studentId}/worksheets/${encodeURIComponent(worksheet.submissionId)}`}>Responses and correct answers</a></td></tr>)}</tbody></table> : <p>No completed worksheets are included in this snapshot.</p>}</section>

    <section className="report-recommendation"><h2>Recommended next step</h2>{report.recommendedNextSteps.length ? <ul>{report.recommendedNextSteps.map((step) => <li key={step}>{step}</li>)}</ul> : <p>No activity is currently eligible.</p>}{report.recommendation && <><p><strong>Policy version:</strong> {report.recommendation.policyVersion}</p><p><strong>Selected activity:</strong> {report.recommendation.selectedActivityId ?? "None"}</p>{selected && <ul>{selected.reasons.map((reason, index) => <li key={`${reason.code}-${index}`}>{reason.message} <small>({reason.weight >= 0 ? "+" : ""}{reason.weight})</small></li>)}</ul>}</>}</section>

    <footer>Source records remain in the local evidence trail. Ambiguous work is excluded until an adult confirms it. This report does not replace adult judgment.</footer>
  </main>;
}
