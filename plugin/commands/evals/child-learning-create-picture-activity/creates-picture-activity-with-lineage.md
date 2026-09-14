---
name: creates-picture-activity-with-lineage
skill: child-learning-create-picture-activity
entry: true
fixture: learner-with-submission
args: "math {{conceptId}} counting 2 for student {{studentId}}"
timeout_seconds: 600
max_turns: 40
max_budget_usd: 3
---

Scenario: the entry skill delegates to create-picture-activity and create-visual-assets. Image meaning, answer specs, and lineage must be validated before rendering; progress must not change.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called record_digital_submission
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation

### Tier 1 (Important)

- [ ] tool.called validate_and_store_activity
- [ ] db.count activities >= 3
- [ ] judge "The final message explains what each picture represents and reports the stored activity id."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 50
