---
name: reports-confirmed-write-only
skill: child-learning-progress
entry: true
fixture: learner-with-submission
args: "{{studentId}} {{evaluationId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the entry skill delegates to track-progress. Application code owns the append-only events; Claude must report only confirmed writes.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called record_digital_submission

### Tier 1 (Important)

- [ ] tool.called get_progress
- [ ] judge "The final message reports the concept state exactly as returned by the tools and does not claim to have mutated progress itself."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
