---
name: refuses-while-awaiting-intake
skill: create-practice
fixture: learner-awaiting-intake
args: "math math.addition-within-10 for student {{studentId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the learner profile exists but intake is incomplete. The skill must refuse to generate generic root work and explain what intake step is needed.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] db.count activities == 0
- [ ] tool.not_called validate_and_store_activity
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] final.matches /intake|baseline|starting check|diagnostic|capabilit/i
- [ ] judge "The final message explains that intake or a starting diagnostic must happen before practice and suggests a concrete next step for the adult."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
