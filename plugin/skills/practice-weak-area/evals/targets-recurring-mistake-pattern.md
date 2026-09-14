---
name: targets-recurring-mistake-pattern
skill: practice-weak-area
fixture: learner-with-history
args: "{{studentId}} {{conceptId}} 15"
timeout_seconds: 600
max_turns: 25
---

Scenario: the learner has scored history with repeated mistakes. The skill must pick the weak area from evidence, store a targeted activity, and leave progress unchanged.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called record_digital_submission
- [ ] db.count progress_events == 4

### Tier 1 (Important)

- [ ] tool.called get_progress
- [ ] tool.called validate_and_store_activity
- [ ] db.count activities >= 7
- [ ] judge "The final message explains why this weak area was selected using the stored evidence and reports the new activity id."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 50
