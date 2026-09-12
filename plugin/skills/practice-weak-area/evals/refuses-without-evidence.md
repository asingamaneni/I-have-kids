---
name: refuses-without-evidence
skill: practice-weak-area
fixture: learner-awaiting-intake
args: "{{studentId}} math 15"
timeout_seconds: 600
max_turns: 25
---

Scenario: no evaluations exist and intake is incomplete. The skill must not invent a weak area or generate generic work.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] db.count activities == 0
- [ ] tool.not_called validate_and_store_activity
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] final.matches /intake|evidence|diagnostic|starting|no (scored|confirmed)/i
- [ ] judge "The final message explains that there is no evidence to identify a weak area yet and what should happen first."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
