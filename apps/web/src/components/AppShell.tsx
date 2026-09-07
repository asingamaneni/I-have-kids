import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Student } from "@child-learning/contracts";

export function AppShell({ children, student, adult = false }: { children: ReactNode; student?: Student; adult?: boolean }) {
  const prefix = student ? (adult ? `/adult/${student.id}` : `/child/${student.id}`) : "/";
  return <div className={`app-frame ${adult ? "adult-frame" : "child-frame"}`}>
    <header className="topbar"><Link className="brand" href={prefix}><Image className="brand-logo" src="/icon.svg" width={34} height={34} alt="" priority /><span>Learning Worktable</span></Link>{student && <div className="topbar-student"><span>{adult ? "Adult view" : "Child view"}</span><strong>{student.displayName}</strong></div>}</header>
    {!adult && student && <nav className="child-nav" aria-label="Child navigation"><Link href={`/child/${student.id}`}>My worktable</Link><Link href={`/child/${student.id}/roadmap`}>My learning map</Link></nav>}
    {adult && student && <nav className="adult-nav" aria-label="Adult navigation"><Link href={`/adult/${student.id}`}>Overview</Link><Link href={`/adult/${student.id}/progress`}>Progress</Link><Link href={`/adult/${student.id}/path`}>Learning roadmap</Link><Link href={`/adult/${student.id}/curriculum`}>Curriculum</Link><Link href={`/adult/${student.id}/history`}>History</Link><Link href={`/adult/${student.id}/worksheets`}>Worksheets</Link><Link href={`/adult/${student.id}/reviews`}>Reviews</Link><Link href={`/adult/${student.id}/reports`}>Reports</Link><Link href={`/adult/${student.id}/settings`}>Settings</Link></nav>}
    {children}
  </div>;
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-intro-action">{action}</div>}</div>;
}

export function StatCard({ label, value, detail, tone = "blue" }: { label: string; value: string; detail?: string; tone?: "blue" | "green" | "yellow" | "coral" }) {
  return <article className={`stat-card tone-${tone}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

export function EvidenceTrail({ entries }: { entries: { kind: string; at: string; text: string }[] }) {
  return <section className="evidence-trail"><div className="section-heading"><span>Evidence trail</span><small>Every decision leaves a note</small></div>{entries.length === 0 ? <p className="empty-note">No evidence has been recorded yet.</p> : <ol className="trail-list">{entries.slice(-8).reverse().map((entry, index) => <li key={`${entry.kind}-${entry.at}-${index}`}><span className="trail-dot" aria-hidden="true" /><div><strong>{entry.kind.replaceAll("_", " ")}</strong><p>{entry.text}</p><time dateTime={entry.at}>{new Date(entry.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time></div></li>)}</ol>}</section>;
}
