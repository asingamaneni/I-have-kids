import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Student } from "@child-learning/contracts";
import { adultHomeRoute, childHistoryRoute, childHomeRoute, childRoadmapRoute, type LearnerRouteScope } from "@/lib/routes";

export function AppShell({ children, student, adult = false, routeScope }: { children: ReactNode; student?: Student; adult?: boolean; routeScope?: LearnerRouteScope }) {
  const scope = routeScope ?? (student?.dataScope === "demo" ? "demo" : "household");
  const childHome = student ? childHomeRoute(student.id, scope) : "/";
  const adultHome = student ? adultHomeRoute(student.id, scope) : "/";
  const prefix = adult ? adultHome : childHome;
  return <div className={`app-frame ${adult ? "adult-frame" : "child-frame"}`}>
    <header className="topbar"><Link className="brand" href={prefix}><Image className="brand-logo" src="/icon.svg" width={34} height={34} alt="" priority /><span>Learning Worktable</span></Link>{student && <div className="topbar-actions"><div className="topbar-student"><span>{adult ? "Adult view" : "Child view"}</span><strong>{student.displayName}</strong></div><Link className="view-switch" href={adult ? childHome : adultHome}>{adult ? "Switch to child view" : "Switch to adult view"}</Link></div>}</header>
    {!adult && student && <nav className="child-nav" aria-label="Child navigation"><Link href={childHome}>My worktable</Link><Link href={childRoadmapRoute(student.id, scope)}>My learning map</Link><Link href={childHistoryRoute(student.id, scope)}>My history</Link></nav>}
    {adult && student && <nav className="adult-nav" aria-label="Adult navigation"><Link href={adultHome}>Overview</Link><Link href={`${adultHome}/progress`}>Progress</Link><Link href={`${adultHome}/path`}>Learning roadmap</Link>{scope === "household" && <Link href={`${adultHome}/curriculum`}>Curriculum</Link>}<Link href={`${adultHome}/history`}>History</Link>{scope === "household" && <><Link href={`${adultHome}/worksheets`}>Worksheets</Link><Link href={`${adultHome}/reviews`}>Reviews</Link><Link href={`${adultHome}/reports`}>Reports</Link><Link href={`${adultHome}/settings`}>Settings</Link></>}</nav>}
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
