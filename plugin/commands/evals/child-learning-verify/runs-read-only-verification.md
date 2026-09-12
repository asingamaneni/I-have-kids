---
name: runs-read-only-verification
skill: child-learning-verify
entry: true
fixture: empty
args: "all"
tools: Bash
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult asks for plugin verification. The entry skill should run the fast verification hook (or equivalent read-only checks) and report exact checks and failures without modifying data or packages.

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
- [ ] tool.not_called create_student
- [ ] db.count students == 0
- [ ] transcript.not_matches /omniplug (build|validate)|go run github|pnpm (add|install|remove)/

### Tier 1 (Important)

- [ ] tool.called Bash
- [ ] final.matches /pass|fail|skipp|check/i
- [ ] judge "The final message lists the exact checks that ran and their outcome, and says plainly if any check was skipped."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 20
