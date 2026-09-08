import Image from "next/image";
import Link from "next/link";
import type { CurriculumPackRevision } from "@child-learning/contracts";
import { SetupForm, type SetupSubject } from "@/components/SetupForm";
import { getCurriculumOverview } from "@/lib/data";

function capabilityTitle(id: string, conceptTitle: string): string {
  if (id.endsWith("with-objects")) return `${conceptTitle} with objects or pictures`;
  if (id.endsWith("with-symbols")) return `${conceptTitle} with numbers and symbols`;
  return conceptTitle;
}

export default async function SetupPage() {
  const curriculum = await getCurriculumOverview() as { activeRevisions: CurriculumPackRevision[]; subjects: Array<{ id: string; title: string; description: string }> };
  const concepts = curriculum.activeRevisions.flatMap((revision) => revision.concepts);
  const subjects: SetupSubject[] = curriculum.subjects.map((subject) => ({ ...subject, capabilities: concepts.filter((concept) => concept.subject === subject.id).flatMap((concept) => [...new Set([...concept.assessmentClaims, ...concept.assessmentTargets.map((target) => target.claim)])].map((id) => ({ id, title: capabilityTitle(id, concept.title) }))) }));
  return <main className="setup-page"><nav className="landing-nav"><Link className="landing-brand" href="/"><Image src="/icon.svg" width={36} height={36} alt="" priority />Learning Worktable</Link></nav><div className="setup-layout"><section><p className="hero-tag">Private, capability-based learning</p><h1>Start with the child, not the grade.</h1><p>Choose any active subject and share what you already see them doing. The app starts near that point, shows the roadmap, and keeps adding approved next concepts and practice branches as confirmed work comes in.</p></section><SetupForm subjects={subjects} /></div></main>;
}
