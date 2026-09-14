---
name: defers-ambiguous-evidence-to-adult
skill: explain-mistakes
fixture: learner-with-pending-review
args: "{{pendingEvaluationId}} auto child"
timeout_seconds: 600
max_turns: 25
---

Scenario: the evaluation is an uploaded-work transcription that still needs human review. The skill must say an adult should review rather than presenting a definitive mistake.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] final.matches /adult|review|parent|teacher/i
- [ ] judge "The final message says the evidence is unconfirmed and an adult should review it instead of declaring a definitive mistake."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
