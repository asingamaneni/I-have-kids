---
name: recommends-from-policy-evidence
skill: adjust-difficulty
fixture: learner-with-history
args: "{{studentId}} {{conceptId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: several comparable scored activities exist. The skill must return a machine-readable recommendation grounded in the stored evidence and policy, without writing progress.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called apply_learning_directive
- [ ] tool.not_called record_digital_submission

### Tier 1 (Important)

- [ ] tool.called get_progress
- [ ] final.matches /advance|maintain|practice|revisit|no[- ]change/i
- [ ] judge "The final message gives one recommendation (advance, maintain, targeted practice, or revisit) with a concise reason citing stored scores or evidence counts."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
