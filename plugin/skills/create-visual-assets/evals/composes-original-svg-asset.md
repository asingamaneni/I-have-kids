---
name: composes-original-svg-asset
skill: create-visual-assets
fixture: learner-with-submission
args: "{{conceptId}} counting-groups \"five apples in a row, printable, grayscale-safe, for activity {{activityId}}\""
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult asks for an original counting asset for an existing activity. The skill must compose it through the local asset tool and never treat the result as progress.

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

- [ ] tool.called compose_visual_asset
- [ ] tool.errors == 0
- [ ] final.matches /asset|svg/i
- [ ] judge "The final message reports a stored asset reference and states what the asset represents."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
