---
name: stores-current-report
skill: child-learning-report
entry: true
fixture: learner-with-history
args: "{{studentId}} current"
timeout_seconds: 600
max_turns: 25
---

Scenario: the entry skill delegates to generate-progress-report with the default current period. It must store a new immutable report artifact.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.called generate_progress_report
- [ ] db.count report_snapshots >= 1
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] tool.input generate_progress_report /"kind":\s*"current"/
- [ ] final.matches /attention|next|recommend/i
- [ ] judge "The final message puts needs-attention and recommended next work first."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
