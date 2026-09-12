---
name: adjust-difficulty
description: "Apply explicit, configurable progression rules to repeated comparable evidence."
whenToUse: When the system needs to decide whether to advance, maintain, target practice, revisit, or review a concept.
argumentHint: "[student-id] [concept-id]"
model: inherit
effort: medium
---

Use the local progression policy and current state; do not use intuition as a substitute for policy.

- Gather comparable recent evaluations (`get_progress`, and `get_evaluation` for any specific evaluation id), evidence status, recurring mistake tags, prerequisites, review dates, and adult overrides through local MCP tools.
- Have deterministic application code enforce the configured thresholds, evidence minimum, consecutive-activity requirement, maximum one-step change, and anti-oscillation window. The initial defaults are 90% on three comparable activities to advance, 75-89% to maintain, 60-74% for targeted practice, and below 60% with sufficient evidence to revisit or reduce.
- Return a machine-readable recommendation and a concise reason grounded in evidence. Preserve the policy rule and before/after level in a ProgressEvent when the application accepts the transition.
- Insufficient, ambiguous, or disputed evidence means no level change. Never directly write progress from Claude or fabricate a score.
