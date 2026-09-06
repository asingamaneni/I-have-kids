---
name: author-curriculum
description: "Extend the configurable curriculum with age-appropriate concepts, prerequisites, and activity kinds."
whenToUse: When an adult or curriculum maintainer adds or revises a subject concept.
argumentHint: "[subject] [concept] [objectives] [prerequisites]"
model: inherit
effort: medium
---

Read `references/curriculum-extension.md` before proposing a concept.

- Use the local curriculum contract and MCP tools to inspect existing ids, taxonomy, prerequisites, objective wording, difficulty steps, activity kinds, and provenance.
- Propose original material matched to the child's demonstrated capabilities rather than a rigid grade ceiling. Never copy third-party text, branding, illustrations, page layouts, or protected worksheet content.
- Keep schema, ids, prerequisites, readiness concepts, answerability, and deterministic evaluation fields in application code. Claude may draft objectives, examples, and teacher notes but cannot silently register a concept.
- Require validation against the curriculum and activity contracts before persistence. Record who approved the extension and preserve prior versions.
