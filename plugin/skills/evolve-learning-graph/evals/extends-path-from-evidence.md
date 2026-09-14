---
name: extends-path-from-evidence
skill: evolve-learning-graph
fixture: learner-with-history
args: "{{studentId}} math \"extra practice on {{conceptId}} before moving on\""
timeout_seconds: 600
max_turns: 40
max_budget_usd: 3
---

Scenario: an adult wants the learner's math path adjusted for extra practice. The skill should prefer a learner-specific directive over a shared curriculum change and must never activate anything.

## Assertions

### Tier 0 (Critical)

- [ ] run.subtype == "success"
- [ ] final.not_matches /traceback|panic|unhandled exception/i
- [ ] tool.not_called activate_curriculum_revision
- [ ] tool.not_called decide_curriculum_revision
- [ ] tool.not_called apply_override
- [ ] tool.not_called reverse_override

### Tier 1 (Important)

- [ ] tool.called get_learning_roadmap
- [ ] transcript.matches /apply_learning_directive|propose_curriculum_revision/
- [ ] final.matches /directive|practice|proposal/i
- [ ] judge "The final message explains what changed for this learner, why the evidence supports it, and what the adult should review next."

### Tier 2 (Capability Tracking)

- [ ] run.duration_seconds < 600
- [ ] tool.call_count <= 50
