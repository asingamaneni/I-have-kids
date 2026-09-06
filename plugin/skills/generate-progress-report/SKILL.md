---
name: generate-progress-report
description: "Create an adult-readable progress report grounded in confirmed local evidence."
whenToUse: When a caregiver or teacher requests a student progress summary.
argumentHint: "[student-id] [time-window] [format]"
model: inherit
effort: medium
---

Generate a report from a read-only snapshot of the local application state.

- Retrieve confirmed concept states, append-only progress events, evaluations, review schedule, artifacts, overrides, and unresolved uncertainty. Never infer missing history.
- Separate strengths, areas needing practice, trends, evidence counts, and recommended next steps. Identify subjective or unconfirmed evidence clearly and route it to adult review.
- Keep child-facing language separate; do not expose analytics labels or confidence values to the child.
- Use Claude for concise narrative synthesis only. Deterministic totals, dates, trends, policy labels, and report metadata must come from application code.
- Store a report snapshot as a new linked artifact. Do not overwrite previous reports, evaluations, or progress events.
