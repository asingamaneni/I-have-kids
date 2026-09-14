---
name: stores-proposal-for-adult-approval
skill: child-learning-add-concept
entry: true
fixture: learner-with-history
args: "math telling-time-to-the-hour \"Read an analog clock to the hour\" {{conceptId}}"
timeout_seconds: 600
max_turns: 40
max_budget_usd: 3
---

Scenario: the entry skill delegates to author-curriculum. It must validate and store a proposal and stop before approval.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called activate_curriculum_revision
- [ ] tool.not_called decide_curriculum_revision
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] tool.called propose_curriculum_revision
- [ ] db.count curriculum_proposals >= 1
- [ ] final.matches /adult|approv|review/i
- [ ] judge "The final message summarises the proposed concept and edges and says an adult must approve it."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 50
