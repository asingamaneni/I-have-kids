---
name: audit-learning-loop
description: "Audit the generate-to-review learning loop for contract, safety, evidence, and lineage violations."
whenToUse: When maintainers want a read-only audit of the kindergarten learning loop.
argumentHint: "[student-id-or-all] [time-window]"
model: inherit
effort: medium
---

Perform a read-only audit using local MCP retrieval and repository inspection; do not repair records or invent missing data.

Check at least: activity spec before render; answer-key consistency; deterministic scoring; age appropriateness; picture ambiguity and printability; exact activity/submission/evaluation lineage; append-only evidence; confidence and adult review; progression thresholds and anti-oscillation; no direct Claude-to-progress mutation; no answer leakage; privacy; original material/provenance; recommendation explanations; and report snapshot integrity.

Read `references/evaluation-confidence.md` and the activity contract as needed. Return findings with severity, evidence ids/paths, reproducible checks, and a safe remediation suggestion. Distinguish confirmed failures from unavailable evidence. Never claim a pass merely because a tool call was attempted.
