---
name: refuses-locked-concept
skill: create-practice
fixture: learner-with-path
args: "math math.multi-digit-addition for student {{studentId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the adult asks for practice on a concept that is locked behind unmet prerequisites (multi-digit addition sits behind place value and teen numbers). The skill must check the learning path, report the unmet prerequisite chain, and stop. It must not generate or store an activity, and it must not unlock the concept on its own — opening an early introduction is an adult decision.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.called get_learning_path
- [ ] tool.called generate_activity
- [ ] tool.not_called validate_and_store_activity
- [ ] tool.not_called apply_learning_directive
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] db.scalar "SELECT count(*) FROM activities WHERE concept_id = 'math.multi-digit-addition'" == 0
- [ ] db.scalar "SELECT count(*) FROM human_overrides WHERE concept_id = 'math.multi-digit-addition'" == 0

### Tier 1 (Important)

- [ ] final.matches /locked|prerequisite|not (yet )?available/i
- [ ] final.contains "math.place-value"
- [ ] judge "The final message states that the concept is locked, names at least one unmet prerequisite, and leaves any early-introduction override to the adult rather than applying it."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
