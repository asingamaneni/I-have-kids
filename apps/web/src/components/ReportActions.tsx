"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportActions({ studentId, reportId }: { studentId: string; reportId: string | undefined }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true);
    const response = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId }) });
    const result = await response.json();
    setMessage(response.ok ? "A new immutable report snapshot was created." : String(result.error ?? "Could not create report."));
    setBusy(false);
    if (response.ok) router.refresh();
  }
  return <div className="report-actions"><div className="archive-actions"><Button type="button" onClick={generate} disabled={busy}><FilePlus2 />{busy ? "Creating…" : "Create current report"}</Button>{reportId && <Button asChild variant="outline"><a href={`/print/report/${encodeURIComponent(reportId)}`}><Printer />Open latest report</a></Button>}</div>{message && <span role="status">{message}</span>}</div>;
}
