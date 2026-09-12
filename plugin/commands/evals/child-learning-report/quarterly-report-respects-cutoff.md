---
name: quarterly-report-respects-cutoff
skill: child-learning-report
entry: true
fixture: learner-with-history
args: "{{studentId}} quarterly as of {{reportDate}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: the adult asks for a quarterly report as of a date. The requested kind must reach the deterministic tool and history must not be rewritten.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.called generate_progress_report
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] db.count progress_events == 4

### Tier 1 (Important)

- [ ] tool.input generate_progress_report /"kind":\s*"quarterly"/
- [ ] judge "The final message names the quarter covered and does not present current state as the historical snapshot."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
