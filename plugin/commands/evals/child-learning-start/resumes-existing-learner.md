---
name: resumes-existing-learner
skill: child-learning-start
entry: true
fixture: learner-with-history
args: "{{studentId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult resumes a session for an existing learner. The entry skill must load real local state, suggest the next action, and create no worksheet or progress change.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] db.count activities == 6
- [ ] tool.not_called validate_and_store_activity
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation

### Tier 1 (Important)

- [ ] transcript.matches /get_student_context|get_learning_roadmap|get_learning_path/
- [ ] final.matches /next/i
- [ ] judge "The final message summarises the learner's current placement from tool results and proposes one next action without inventing data."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
