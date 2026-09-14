---
name: reports-unavailable-evidence-honestly
skill: audit-learning-loop
fixture: empty
args: "all \"last 7 days\""
timeout_seconds: 600
max_turns: 25
---

Scenario: the store has no learners. The audit must say there is nothing to audit rather than claiming a pass.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation
- [ ] tool.not_called activate_curriculum_revision
- [ ] tool.not_called decide_curriculum_revision
- [ ] tool.not_called record_digital_submission
- [ ] tool.not_called validate_and_store_activity
- [ ] tool.not_called apply_learning_directive
- [ ] tool.not_called propose_curriculum_revision
- [ ] db.count students == 0

### Tier 1 (Important)

- [ ] tool.called list_students
- [ ] final.matches /no (students|learners)|unavailable|nothing to audit|empty|not enough/i
- [ ] judge "The final message says no learner data was available and does not claim the loop passed."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
