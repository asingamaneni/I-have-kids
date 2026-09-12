---
name: honors-explicit-question-count
skill: child-learning-create-practice
entry: true
fixture: learner-with-submission
args: "math {{conceptId}} 3 8 for student {{studentId}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the adult explicitly asks for 8 questions. Only an explicit request may override the default count.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.called validate_and_store_activity
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] tool.input generate_activity /"itemCount":\s*8\b/
- [ ] judge "The final message confirms an eight-item activity was stored."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
