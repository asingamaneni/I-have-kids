---
name: schedules-review-from-stored-evidence
skill: review-old-topic
fixture: learner-with-history
args: "{{studentId}} auto {{reportDate}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult asks which topic is due for spaced review as of a date. The skill must use stored evidence and policy and must not alter any concept status.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation
- [ ] tool.not_called record_digital_submission
- [ ] db.count progress_events == 4

### Tier 1 (Important)

- [ ] tool.call_count >= 2
- [ ] final.matches /review|due|interval|days?/i
- [ ] judge "The final message identifies a review target from stored evidence and does not claim mastery changed merely because a review was scheduled."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
