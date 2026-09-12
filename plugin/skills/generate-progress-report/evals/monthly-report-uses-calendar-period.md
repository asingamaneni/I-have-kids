---
name: monthly-report-uses-calendar-period
skill: generate-progress-report
fixture: learner-with-history
args: "{{studentId}} monthly markdown for the month containing {{reportDate}} in the America/New_York timezone"
timeout_seconds: 600
max_turns: 25
---

Scenario: an adult asks for a calendar-month report with an explicit timezone. The skill must pass the requested kind and timezone through to the deterministic tool.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.called generate_progress_report
- [ ] db.count report_snapshots >= 1
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] tool.input generate_progress_report /"kind":\s*"monthly"/
- [ ] tool.input generate_progress_report /America\/New_York/
- [ ] judge "The final message names the calendar month covered and does not relabel today's state as an earlier report."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
