---
name: refuses-unknown-activity
skill: check-work
fixture: learner-with-submission
args: "activity-does-not-exist submission-does-not-exist"
timeout_seconds: 600
max_turns: 25
---

Scenario: the ids do not resolve to any stored activity or submission. The skill must not grade from memory or reconstruct an answer key.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called propose_uploaded_work_evaluation
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation
- [ ] db.count evaluations == 1

### Tier 1 (Important)

- [ ] final.matches /not found|could not|cannot|unable|does not exist|no (such|stored|matching)/i
- [ ] judge "The final message says the activity or submission could not be resolved and does not invent a score or answers."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
