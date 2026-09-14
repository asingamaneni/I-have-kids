---
name: routes-ambiguous-evidence-to-adult
skill: child-learning-check-work
entry: true
fixture: learner-with-pending-review
args: "{{activityId}} {{submissionId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the submission has both a deterministic evaluation and a pending uploaded-work evaluation. The entry skill must surface the pending review rather than confirming it.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] final.matches /review|adult|pending|unconfirmed/i
- [ ] judge "The final message mentions that an evaluation awaits adult review and does not present it as confirmed."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
