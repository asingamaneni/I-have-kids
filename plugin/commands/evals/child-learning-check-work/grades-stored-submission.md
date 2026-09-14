---
name: grades-stored-submission
skill: child-learning-check-work
entry: true
fixture: learner-with-submission
args: "{{activityId}} {{submissionId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the entry skill delegates to check-work. It must use the stored deterministic evaluation and must not mutate progress from the command.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.call_count >= 1
- [ ] tool.not_called record_digital_submission
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation

### Tier 1 (Important)

- [ ] tool.called get_activity
- [ ] final.contains "{{submissionId}}"
- [ ] judge "The final message states the recorded score and whether adult review is needed."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
