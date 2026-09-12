---
name: explains-without-answer-leak
skill: explain-mistakes
fixture: learner-with-history
args: "{{historyEvaluationId}} auto child"
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult asks for a child-facing explanation of a mistake in a stored, confirmed evaluation. The explanation must use the real evaluation and must not expose the answer key.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called record_digital_submission
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] tool.called get_activity
- [ ] final.not_matches /answer key|expected answer|confidence:/i
- [ ] judge "The child-facing text explains one idea in simple concrete language and does not reveal the answers to unsolved items, hidden rubric criteria, or analytics labels."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
