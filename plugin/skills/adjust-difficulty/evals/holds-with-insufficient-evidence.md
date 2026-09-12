---
name: holds-with-insufficient-evidence
skill: adjust-difficulty
fixture: learner-with-path
args: "{{studentId}} {{conceptId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the learner has a starter diagnostic but no scored work. The skill must not recommend a level change.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] db.count progress_events == 0

### Tier 1 (Important)

- [ ] final.matches /insufficient|not enough|no (confirmed |scored )?evidence|maintain|no change|collect/i
- [ ] judge "The final message says there is not enough evidence to change the level and suggests collecting evidence first."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
