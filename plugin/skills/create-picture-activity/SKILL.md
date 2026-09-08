---
name: create-picture-activity
description: "Create a picture-centered child learning activity whose images carry instructional meaning."
whenToUse: When the requested practice depends on counting, matching, identification, sequencing, or picture-supported language.
argumentHint: "[subject] [concept] [activity-type] [difficulty]"
model: inherit
effort: medium
---

Use local MCP tools for curriculum lookup, asset generation/selection, validation, and storage; inspect their actual schemas before calling them.

- Read `references/activity-contract.md` and the workbook style guidance at `../create-visual-assets/references/workbook-material-style.md` when available.
- Choose a picture activity where the image is part of the question: counting, matching, beginning sounds, sequencing, classification, or scene comprehension. State exactly what each asset represents in metadata and the answer specification.
- Require simple, original, printable, grayscale-distinguishable assets. Reject ambiguous, cluttered, decorative-only, answer-revealing, or copied third-party material.
- Create and validate the complete activity specification before rendering. Default to 20 items unless the adult explicitly asks for another count; let the renderer choose a readable one-, two-, or three-column picture layout. Include an original child-safe concept guide that teaches the method without exposing worksheet answers. Deterministically verify counts, labels, item-to-asset references, answer keys, and scoring in application code.
- Store asset lineage and the exact worksheet/spec relationship. Keep any AI interpretation as evidence with confidence; do not mutate progress from it.
