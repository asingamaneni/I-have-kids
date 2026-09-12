---
name: reports-confirmed-transition
skill: track-progress
fixture: learner-with-submission
args: "{{studentId}} {{evaluationId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: a confirmed deterministic evaluation exists and the application already applied the progression policy. The skill must report the confirmed state from tool results and never write progress itself.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called record_digital_submission

### Tier 1 (Important)

- [ ] tool.called get_progress
- [ ] final.matches /step|status|state|transition|no[- ]change/i
- [ ] judge "The final message reports the current concept state as returned by the tools and does not claim Claude wrote or changed progress directly."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
