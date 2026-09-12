---
name: keeps-adult-rationale-separate
skill: child-learning-explain-mistakes
entry: true
fixture: learner-with-history
args: "{{historyEvaluationId}} auto adult"
timeout_seconds: 600
max_turns: 25
---

Scenario: the audience is the adult. The explanation may include rationale but must still keep child-facing feedback distinct and must not write anything.

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

- [ ] judge "The final message clearly separates a child-facing explanation from adult-facing rationale or next steps."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
