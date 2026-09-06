---
name: explain-mistakes
description: "Give a short, encouraging, child-friendly explanation of a confirmed mistake without leaking answers."
whenToUse: When a caregiver requests feedback after evaluation or a child needs a guided explanation.
argumentHint: "[evaluation-id] [item-id] [audience]"
model: inherit
effort: medium
---

Use the stored evaluation and item contract, not an invented reconstruction.

- Explain one idea at a time with concrete language, pictures or a small worked example only when it does not reveal an unsolved answer.
- Separate child-facing feedback from the adult rationale. Never expose answer keys, hidden rubric criteria, confidence, analytics labels, or future item answers to the child.
- For ambiguous or subjective evidence, say that an adult should review it rather than presenting a definitive mistake.
- Use local MCP retrieval tools and application-controlled evaluation data. Do not write scores, progress, or corrected submissions from this skill.
- Preserve the original evaluation and any adult correction as append-only evidence.
