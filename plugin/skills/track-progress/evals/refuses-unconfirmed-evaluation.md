---
name: refuses-unconfirmed-evaluation
skill: track-progress
fixture: learner-with-pending-review
args: "{{studentId}} {{pendingEvaluationId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the evaluation still needs human review. The skill must route it to adult review and must not apply or force a transition.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation
- [ ] db.count progress_events == 1

### Tier 1 (Important)

- [ ] final.matches /review|unconfirmed|needs[- ]human|adult/i
- [ ] judge "The final message explains that the evaluation is unconfirmed and progress cannot change until an adult reviews it."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
