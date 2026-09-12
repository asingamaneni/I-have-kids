import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return <main className="modern-landing">
    <nav className="landing-nav"><Link className="landing-brand" href="/"><Image src="/icon.svg" width={36} height={36} alt="" priority />Learning Worktable</Link><Badge variant="outline" className="local-chip"><i aria-hidden="true" />Private on this device</Badge></nav>
    <section className="landing-hero-modern">
      <div className="landing-copy-modern">
        <Badge variant="secondary" className="hero-tag">Built around one learner</Badge>
        <h1>Learning that grows with them.</h1>
        <p className="landing-intro-modern">Start from what a child can do today, build a visible roadmap for any subject, and keep adding concepts and practice paths as confirmed learning grows—without a rigid grade ceiling.</p>
        <div className="landing-actions"><Button asChild size="lg"><Link href="/setup">Set up a learner</Link></Button></div>
        <ul className="landing-trust"><li>No account</li><li>No cloud AI calls</li><li>Local learning history</li></ul>
      </div>
      <aside className="learning-preview" aria-label="Example adaptive learning path">
        <div className="preview-glow" aria-hidden="true" />
        <Card className="preview-window gap-0 py-0">
          <header><div><small>Ava&apos;s learning roadmap</small><strong>A path that keeps growing</strong></div><span className="preview-avatar">A</span></header>
          <section className="preview-next"><div className="preview-icon" aria-hidden="true">◎</div><div><small>Working here now</small><h2>Food chains</h2><p>One subject path, shaped by confirmed work.</p></div><span className="preview-arrow" aria-hidden="true">›</span></section>
          <div className="preview-path"><div className="path-line" aria-hidden="true" /><article className="is-complete"><span>✓</span><div><strong>Habitats</strong><small>Completed from evidence</small></div></article><article className="is-current"><span>2</span><div><strong>Food chains</strong><small>Current learning</small></div></article><article><span>3</span><div><strong>Ecosystems</strong><small>Roadmap ahead</small></div></article></div>
          <footer><span><i className="pulse-dot" aria-hidden="true" />Adapts from confirmed evidence</span><strong>Any subject</strong></footer>
        </Card>
      </aside>
    </section>
  </main>;
}
