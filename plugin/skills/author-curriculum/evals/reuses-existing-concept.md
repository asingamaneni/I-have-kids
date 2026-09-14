---
name: reuses-existing-concept
skill: author-curriculum
fixture: learner-with-history
args: "math \"adding two numbers with a sum up to ten\" none"
timeout_seconds: 600
max_turns: 25
max_budget_usd: 3
---

Scenario: the requested goal is already covered by an active concept. The skill must reuse it rather than proposing a duplicate revision.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called activate_curriculum_revision
- [ ] tool.not_called decide_curriculum_revision
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] tool.not_called propose_curriculum_revision
- [ ] final.matches /already|exist|active|reuse|covers/i
- [ ] judge "The final message identifies the existing concept that covers the goal and explains no new revision is needed."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
