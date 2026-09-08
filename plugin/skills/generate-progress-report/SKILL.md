---
name: generate-progress-report
description: "Create an adult-readable progress report grounded in confirmed local evidence."
whenToUse: When a caregiver or teacher requests a student progress summary.
argumentHint: "[student-id] [time-window] [format]"
model: inherit
effort: medium
---

Generate an immutable current, calendar-month, or calendar-quarter report from a historically accurate read-only snapshot of local application state.

- Resolve the requested kind (`current`, `monthly`, or `quarterly`), evidence cutoff, explicit timezone, and half-open calendar period before reading evidence. Retrieve only concept events, evaluations, submissions, directives, curriculum/roadmap revisions, and artifacts effective at that cutoff. Reconstruct historical state; never relabel today's state as an earlier report or mutate the current roadmap while reporting.
- Put areas needing attention and recommended next work first, followed by strengths, trends, evidence counts, and worksheet detail. Identify subjective or unconfirmed evidence clearly and route it to adult review.
- Keep child-facing language separate; do not expose analytics labels or confidence values to the child.
- Use Claude for concise narrative synthesis only. Deterministic totals, dates, trends, policy labels, and report metadata must come from application code.
- Store a report snapshot as a new linked artifact. Do not overwrite previous reports, evaluations, or progress events.
