---
name: creates-profile-without-worksheet
skill: child-learning-start
entry: true
fixture: empty
args: "\"Nia, age 6, just starting school\""
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult starts with a new child described in free text. Creating the profile alone must generate no worksheet, and the free-text description must not be recorded as mastery.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] db.count activities == 0
- [ ] tool.not_called validate_and_store_activity
- [ ] tool.not_called generate_activity
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] tool.called create_student
- [ ] db.count students == 1
- [ ] final.matches /capabilit|questionnaire|diagnostic|intake|observe/i
- [ ] judge "The final message invites the adult to select observed capabilities, answer the questionnaire, or choose an entry diagnostic, and does not treat age or grade as mastery."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
