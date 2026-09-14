---
name: ranks-with-reason-code
skill: recommend-next-activity
fixture: learner-with-history
args: "{{studentId}} 15 math"
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult has 15 minutes and asks what the learner should do next. The skill must rank from application state and return a machine-readable reason code.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called apply_learning_directive
- [ ] tool.not_called record_digital_submission

### Tier 1 (Important)

- [ ] tool.called recommend_next_activity
- [ ] final.matches /review-due|targeted-practice|revisit|next-step|prerequisite|variety/i
- [ ] judge "The final message names the recommended concept or activity, an estimated duration, and a concise reason code from the tool result."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
