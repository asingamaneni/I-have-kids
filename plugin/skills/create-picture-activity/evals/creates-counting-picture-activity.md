---
name: creates-counting-picture-activity
skill: create-picture-activity
fixture: learner-with-submission
args: "math {{conceptId}} counting 2 for student {{studentId}}"
timeout_seconds: 600
max_turns: 40
max_budget_usd: 3
---

Scenario: an adult wants a printable counting activity where the pictures are part of each question. The skill must validate and store a complete specification and must not mutate progress.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called record_digital_submission
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation

### Tier 1 (Important)

- [ ] tool.called validate_and_store_activity
- [ ] db.count activities >= 3
- [ ] final.matches /activity-[a-z0-9-]+/
- [ ] judge "The final message describes what the pictures represent and how they carry the question, without revealing item answers."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 50
