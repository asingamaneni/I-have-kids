---
name: check-work
description: "Evaluate completed kindergarten work with deterministic scoring and explicit uncertainty."
whenToUse: When a caregiver or teacher submits paper, image, digital responses, or a completed activity for evaluation.
argumentHint: "[activity-id] [submission-id-or-path]"
model: inherit
effort: medium
---

Evaluate a submission linked to its exact generated activity.

- Load the activity specification, answer specifications, submission, and local lineage through MCP. If the activity cannot be resolved exactly, do not grade from memory or reconstruct an answer key.
- Read `references/evaluation-confidence.md`. Use application/domain code for arithmetic, known choices, matching, normalization, score totals, and deterministic mistake tags.
- Use Claude only for supported interpretation such as language observations or ambiguous image/handwriting evidence. Require item-level evidence, confidence, evaluator type, and an `ambiguous`/`unconfirmed` status where appropriate. Do not invent tool results.
- Persist an evaluation artifact separately from the submission. Preserve all per-item results, rationale, confidence, evidence status, evaluator/version metadata, and lineage.
- Ask for adult review when uncertainty or a subjective judgment could affect learning state. Do not mutate progress directly; hand confirmed evaluation evidence to the application's progression workflow.
