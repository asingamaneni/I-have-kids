---
name: audits-read-only
skill: audit-learning-loop
fixture: learner-with-history
args: "{{studentId}} \"last 30 days\""
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult asks for an integrity audit of one learner's loop. The audit must be read-only and report findings with severity and evidence ids.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation
- [ ] tool.not_called activate_curriculum_revision
- [ ] tool.not_called decide_curriculum_revision
- [ ] tool.not_called record_digital_submission
- [ ] tool.not_called validate_and_store_activity
- [ ] tool.not_called apply_learning_directive
- [ ] tool.not_called propose_curriculum_revision
- [ ] db.count activities == 6
- [ ] db.count progress_events == 4

### Tier 1 (Important)

- [ ] transcript.matches /get_timeline|get_artifact_lineage|get_student_context|get_progress/
- [ ] final.matches /severity|critical|warning|info|finding/i
- [ ] judge "The final message lists findings with severity and evidence ids or paths, and distinguishes confirmed failures from evidence it could not retrieve."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 50
