---
name: rejects-unregistered-subject
skill: child-learning-add-concept
entry: true
fixture: learner-with-history
args: "astrology star-signs \"Learn the twelve zodiac signs\" none"
timeout_seconds: 600
max_turns: 40
max_budget_usd: 3
---

Scenario: the subject is not registered in the local curriculum. The entry skill must not activate anything and must explain the validation outcome honestly.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called activate_curriculum_revision
- [ ] tool.not_called decide_curriculum_revision
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] final.matches /subject|registered|not (found|supported|active)|reject|invalid/i
- [ ] judge "The final message explains that the subject is not registered or the proposal was rejected, and does not claim it was stored as active curriculum."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 50
