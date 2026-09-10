---
name: recommend-next-activity
description: "Choose and explain the next concept-stage from the child's capability-based learning path."
whenToUse: When a session needs a next activity recommendation or a caregiver asks what to practice next.
argumentHint: "[student-id] [minutes] [subject-preference]"
model: inherit
effort: medium
---

Compose a recommendation from application-owned state, not from a free-form guess.

- Retrieve the capability-based learning path, concrete/pictorial/abstract stage availability, current concept states, recent comparable evidence, recurring mistakes, prerequisites, due reviews, session time, subject balance, fatigue/repetition signals, and adult introduce/prioritize/defer directives through the local MCP server.
- Hard-exclude locked or deferred concept-stages before deterministic ranking. A priority may reorder eligible work but may not erase prerequisites; an introduce directive may open only an early concrete experience. Use deterministic policy code to select candidates and reason codes such as review-due, targeted-practice, revisit, next-step, prerequisite, and variety. Claude may phrase the explanation, but must not invent evidence or modify state.
- Return the selected subject, concept, activity type, difficulty, estimated duration, and a concise machine-readable reason. If evidence is insufficient, recommend evidence collection rather than an unsupported level change.
- Preserve recommendation lineage once the application confirms it.
