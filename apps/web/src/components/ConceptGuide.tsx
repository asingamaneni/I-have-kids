import type { ChildGuide } from "@child-learning/contracts";

export function ConceptGuide({ guide }: { guide: ChildGuide }) {
  return <article className="concept-guide" aria-labelledby="concept-guide-title">
    <header><p className="eyebrow">How to learn this</p><h1 id="concept-guide-title">{guide.title}</h1><p>{guide.conceptSummary}</p></header>
    <section><h2>Try these steps</h2><ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol></section>
    {guide.example && <section className="concept-guide-example"><h2>Example</h2><strong>{guide.example.prompt}</strong><p>{guide.example.explanation}</p></section>}
    {guide.remember && <aside><strong>Remember</strong><p>{guide.remember}</p></aside>}
  </article>;
}
