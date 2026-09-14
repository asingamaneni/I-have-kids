---
name: refuses-unknown-concept
skill: review-old-topic
fixture: learner-with-history
args: "{{studentId}} math.does-not-exist {{reportDate}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the concept id is not in the active curriculum. The skill must say so and must not generate or store work for it.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] db.count activities == 6

### Tier 1 (Important)

- [ ] final.matches /not (found|registered|active|part)|unknown|does not exist|cannot|could not/i
- [ ] judge "The final message explains the concept is not in the active curriculum and offers the learner's real due reviews or a next step."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
