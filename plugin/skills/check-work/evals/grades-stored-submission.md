---
name: grades-stored-submission
skill: check-work
fixture: learner-with-submission
args: "{{activityId}} {{submissionId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult asks for a stored digital submission to be evaluated against its exact activity. The deterministic evaluation already exists; the skill must report it faithfully and not mutate progress.

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
- [ ] final.matches /score|correct|\d+\s*(\/|of|out of)\s*\d+|100\s*%/i
- [ ] judge "The final message states the recorded score and whether adult review is needed, and does not claim to have written progress."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
