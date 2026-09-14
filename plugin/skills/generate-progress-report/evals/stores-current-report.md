---
name: stores-current-report
skill: generate-progress-report
fixture: learner-with-history
args: "{{studentId}} current markdown as of {{reportDate}}"
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult asks for a current progress report as of a date. The skill must store an immutable snapshot through the tool and lead with needs-attention and next work.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.called generate_progress_report
- [ ] db.count report_snapshots >= 1
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override
- [ ] tool.not_called confirm_evaluation
- [ ] tool.not_called reject_evaluation

### Tier 1 (Important)

- [ ] tool.input generate_progress_report /"kind":\s*"current"/
- [ ] final.matches /attention|next|recommend/i
- [ ] judge "The final message leads with areas needing attention and recommended next work, then strengths, and separates unconfirmed evidence for adult review."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
