---
name: creates-default-twenty-item-practice
skill: create-practice
fixture: learner-with-submission
args: "math {{conceptId}} for student {{studentId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult asks for new math practice on the learner's active concept without naming a question count. The skill must persist a validated activity with the default 20 items and must not touch progress.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.called validate_and_store_activity
- [ ] tool.not_called record_digital_submission
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation
- [ ] db.count activities >= 3

### Tier 1 (Important)

- [ ] tool.input generate_activity /"itemCount":\s*20/
- [ ] final.matches /activity-[a-z0-9-]+/
- [ ] judge "The final message reports the stored activity id and does not print any answer key or expected answers."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
