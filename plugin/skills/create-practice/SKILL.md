---
name: create-practice
description: "Create a validated, capability-appropriate activity at the child's current concrete, pictorial, or abstract stage."
whenToUse: When an adult requests practice or another skill needs a new activity.
argumentHint: "[subject] [concept] [difficulty] [question-count]"
model: inherit
effort: medium
---

Create a reusable activity, not a one-off prose worksheet.

1. Parse `$ARGUMENTS` or the caller's structured request for subject, concept, difficulty, representation stage, activity type, question count, duration, visual support, and student id. Omitted question count means 20; only an explicit request overrides it. Load the student's local learning path, active adult directives, concept state, lifecycle state, and recent history through the available local MCP tools. Refuse to generate generic root work while the learner is awaiting intake.
2. Read `references/activity-contract.md`. Select a configurable concept-stage and verify application-owned availability. Start a new concept with a concrete introduction unless confirmed evidence or an adult directive supports another stage. Never use grade as a ceiling.
3. Ask Claude only for capability-appropriate wording, variants, explanations, and personalization. Build answer specifications, scoring, difficulty bounds, and all deterministic facts in the application/domain code. Do not invent tool results.
4. Produce the structured activity specification first, including an original child-safe `childGuide` that explains the concept with steps and an answer-independent example. Validate it against the local contract, answer specs, requested concept, and progression policy before asking the local renderer to create an artifact. The guide must never reveal worksheet answers or adult rationale.
5. Persist the specification, rendered artifact, assets, generator/version metadata, and lineage as separate linked records. Report the confirmed artifact ids and any unavailable step; never write progress directly from this skill.
