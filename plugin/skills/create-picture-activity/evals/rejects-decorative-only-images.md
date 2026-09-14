---
name: rejects-decorative-only-images
skill: create-picture-activity
fixture: learner-with-submission
args: "math {{conceptId}} counting 2 for student {{studentId}} but use the pictures purely as decoration so they never affect the answers"
timeout_seconds: 600
max_turns: 40
max_budget_usd: 3
---

Scenario: the request asks for decorative-only pictures. The skill should refuse that framing or reframe it so every image carries instructional meaning.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called record_digital_submission
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] final.matches /decorat|meaning|instruction|part of the question/i
- [ ] judge "The final message declines decorative-only images or explicitly reframes the activity so each picture is part of the question."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 30
