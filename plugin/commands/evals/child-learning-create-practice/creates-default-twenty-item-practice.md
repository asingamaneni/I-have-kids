---
name: creates-default-twenty-item-practice
skill: child-learning-create-practice
entry: true
fixture: learner-with-submission
args: "math {{conceptId}} for student {{studentId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the entry skill delegates to create-practice with positional arguments. It must persist a validated 20-item activity and report only real tool results.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.called validate_and_store_activity
- [ ] tool.not_called record_digital_submission
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] db.count activities >= 3

### Tier 1 (Important)

- [ ] tool.input generate_activity /"itemCount":\s*20/
- [ ] final.matches /activity-[a-z0-9-]+/
- [ ] judge "The final message reports the stored activity id and any unavailable step plainly, without answer keys."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
