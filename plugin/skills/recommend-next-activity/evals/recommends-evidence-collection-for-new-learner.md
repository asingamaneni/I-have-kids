---
name: recommends-evidence-collection-for-new-learner
skill: recommend-next-activity
fixture: learner-with-path
args: "{{studentId}} 10"
timeout_seconds: 600
max_turns: 25
---

Scenario: the learner only has an unattempted starter diagnostic. The skill must recommend collecting evidence rather than an unsupported level change.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called apply_learning_directive

### Tier 1 (Important)

- [ ] tool.called recommend_next_activity
- [ ] final.matches /starting check|diagnostic|assessment|evidence/i
- [ ] judge "The final message recommends the starter diagnostic or evidence collection and does not claim a level change."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
