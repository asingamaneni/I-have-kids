# Child Learning Plugin guidance

This plugin is a local-first learning loop for school-age children. Preserve the following invariants in every reusable skill, user-invocable entry skill, agent, and local tool interaction.

## Safety, privacy, and locality

- Work only on local project data and local MCP tools. Never ask for, create, store, or transmit API credentials, tokens, cookies, or other secrets for this learning loop.
- Treat child data as sensitive. Keep identifiers and completed work local, minimize exposure in generated artifacts, and do not put private child details in shareable output unless an adult explicitly requests it.
- If the expected project root or local MCP server is unavailable, stop with a clear limitation. Do not fabricate a tool result, activity, score, artifact, or progress state.
- Use the local MCP server's declared tool schema as the source of truth for tool names and arguments. Discover available tools before calling them; never invent a successful result.

## Age and child experience

- Match language, instructions, choices, images, and duration to the individual child's demonstrated capabilities and accommodations. Begin with young-child-readable prompts, large type, generous whitespace, concrete vocabulary, and one clear action at a time, but never use school grade as a learning ceiling.
- Do not show child-facing labels such as weak, mastery score, confidence, evaluator type, or difficulty policy. Keep analytics and uncertainty in the adult view.
- Do not use color as the only distinguishing feature. Images must be uncluttered, printable, unambiguous, and instructional rather than decorative.
- Never reveal answers, answer keys, hidden rubric criteria, or hints that make the requested work trivial in child-facing material.

## Activity contract and rendering

- Create and validate a structured activity specification before rendering any worksheet, picture activity, or export. The specification is the source of truth for items, objectives, assets, answer specifications, scoring, difficulty, and lineage.
- Validate every generated item against its answer specification before release. Keep the exact specification and the rendered artifact linked and reproducible.
- Deterministic facts belong in application code: arithmetic, known answer keys, normalization, scoring, schema validation, thresholds, progression policy, and lineage checks. Claude may design wording, explanations, and alternatives but must not replace deterministic rules with intuition.
- Keep prompts/instructions and policy versions separate from deterministic business rules. Do not silently change a stored activity or answer specification.

## Evaluation and progress

- Never let Claude directly mutate current progress or write a progress event. Claude may propose structured evidence or a recommendation; application code must validate it, calculate deterministic fields, and perform the write.
- Store generated activities, submissions, evaluations, and reports as separate linked artifacts. Preserve append-only evidence and lineage; never overwrite or delete historical work to update the current view.
- A subjective or ambiguous observation must carry evidence status and confidence and remain unconfirmed until an adult reviews it. Ambiguous handwriting, image interpretation, creative responses, or disputed scoring require adult review.
- Adult-reported current capabilities are hypotheses used to choose starting diagnostics, not evidence of mastery. Establish the baseline only from the child's confirmed assessment work.
- Do not infer a permanent ability label from one activity. Difficulty changes require the configured evidence window, comparable activities, and explicit policy reasoning. Apply at most the configured controlled step.
- Preserve human overrides as new, auditable records with actor, reason, prior value, new value, and timestamp. A correction does not erase the original evaluation or event.
- Every recommendation must explain which deterministic evidence and policy rule selected the subject, concept, activity type, and difficulty.

## Curriculum and originality

- Treat curriculum/reference material as approved local input, not as authority to scrape or reproduce a website. Preserve provenance for references and generated material.
- Material must be original, printable, picture-rich, and designed for the individual child. Do not copy third-party workbook text, branding, layouts, illustrations, answer keys, or protected worksheet content.
- Extend curriculum through immutable pack revisions with stable concepts, typed graph edges, configurable ordered stages, original activity templates, and provenance. Grade and age are presentation context only. A child may move ahead, branch, revisit, or receive an adult-opened introduction without falsely marking prerequisites mastered.
- Claude may propose a curriculum revision but must never approve or activate its own proposal. Deterministic validation and an explicit adult checkpoint are required before a new graph can affect learners.

## Tool and workflow discipline

- Read the relevant local contract and reference before acting. Use local MCP tools for persistence, retrieval, rendering, and evaluation when available; use application/domain code for deterministic checks.
- Keep child-facing explanations separate from parent/teacher reporting. Explain mistakes briefly and encouragingly without leaking the answer to the next unsolved item.
- If a tool response is incomplete, ambiguous, or contradictory, preserve the evidence, mark uncertainty, and ask for adult review rather than guessing.
- Report what was actually done and what remains unavailable. Never claim an artifact was stored, evaluated, or progressed unless the local tool/application result confirms it.
