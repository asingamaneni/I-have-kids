---
name: author-curriculum
description: "Propose an immutable curriculum pack revision with original concepts, graph edges, stages, and activity templates."
whenToUse: When an adult adds a subject, extends a roadmap frontier, or revises an approved local curriculum pack.
argumentHint: "[subject] [goal-or-concepts] [prerequisites]"
model: inherit
effort: high
---

Read `references/curriculum-extension.md` before proposing a revision.

1. Use local curriculum and roadmap tools to inspect active revision IDs, stable concept IDs, typed edges, learner goals, confirmed evidence, registered stages, supported generic activity kinds, generator/evaluator/renderer IDs, and provenance.
2. Reuse an active concept when it already covers the goal. Otherwise draft an original immutable `CurriculumPackRevision` that preserves every historical concept ID from the pack and increments its revision number.
3. Define registry-backed subject IDs, advisory age/placement metadata, stable concept IDs, ordered learning stages, prerequisite/readiness/extension edges, and original activity templates with complete answer specifications or explicit review rubrics. Age and grade adapt presentation but never cap eligibility.
4. Never copy third-party curriculum text, questions, answer keys, illustrations, or layouts. Record source provenance for any approved reference.
5. Call the proposal tool. Deterministic validation must reject duplicates, dangling references, cycles, unsupported generators/evaluators/renderers, incompatible item kinds, missing answers, and removal of historical IDs.
6. Present the graph diff and affected learners to the adult. Stop after storing the proposal. Claude must never approve or activate a revision it authored; an adult uses the curriculum view or explicit decision tool.
