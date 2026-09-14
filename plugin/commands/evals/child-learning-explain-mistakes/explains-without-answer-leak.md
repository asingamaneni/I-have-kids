---
name: explains-without-answer-leak
skill: child-learning-explain-mistakes
entry: true
fixture: learner-with-history
args: "{{historyEvaluationId}} auto child"
timeout_seconds: 600
max_turns: 25
---

Scenario: the entry skill delegates to explain-mistakes for a child audience. It must retrieve the real evaluation and avoid answer leakage.

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
- [ ] final.not_matches /answer key|expected answer/i
- [ ] judge "The child-facing explanation covers one idea in simple language and does not reveal unsolved answers or adult rationale."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
