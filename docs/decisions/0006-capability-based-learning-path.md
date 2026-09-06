# ADR 0006: Capability-based learning paths

## Status

Accepted.

## Decision

Learning Worktable selects concepts from demonstrated capabilities and adult-observed readiness rather than enforcing a school-grade sequence. School placement remains descriptive context only.

Each curriculum concept declares an ordered set of learning stages:

1. **Concrete** — the child manipulates real materials, moves, sorts, listens, or speaks.
2. **Pictorial** — the child connects the idea to images and structured representations.
3. **Abstract** — the child works with language and symbols after sufficient prior evidence.

A concept may omit a stage when it is not meaningful. Stage evidence requirements are configured per concept. Exploration evidence is confirmed but non-comparable; it can open the next representation without being counted as a mastery score. Mastery requires the configured confirmed evidence at the final stage.

Eligibility is resolved before recommendation ranking. Locked and deferred concept-stages cannot win through preference weights. Adults may append directives to introduce a locked concept at the concrete stage, prioritize eligible work, defer it, or clear a prior directive. Introducing a concept early does not mark prerequisites mastered.

When confirmed evidence completes a stage, the application may materialize the next stage's activity automatically. Existing completed work stays in the adult worksheet archive with the original specification, responses, correct answers or rubric, evaluation, and artifact lineage.

## Consequences

- Numeric difficulty and concept availability are separate decisions.
- A higher difficulty step alone does not establish prerequisite mastery.
- Children can move ahead, branch, or revisit without a grade ceiling.
- Concrete introductions are first-class activities, not merely decorative worksheet instructions.
- Child routes expose only currently available work; adult views retain the complete history and curriculum graph.
- Curriculum extensions must define stages, evidence purposes, generators, and readiness relationships and pass graph validation.
