---
name: track-progress
description: "Apply validated evaluation evidence to concept-level progress through the application policy."
whenToUse: When a confirmed evaluation is ready to update a student concept state.
argumentHint: "[student-id] [evaluation-id]"
model: inherit
effort: medium
---

This skill orchestrates; it is not the authority that calculates or writes progress.

1. Retrieve the exact evaluation, concept state, recent comparable evidence, overrides, and policy from the local MCP server. Refuse to proceed if evidence is missing, ambiguous, or not linked to the activity.
2. Ask application/domain code to calculate the candidate state transition, trend, mastery evidence, review schedule, and reason. Never let Claude directly mutate progress or invent an event.
3. Require append-only ProgressEvent data with previous state, new state, evidence ids, policy version, and timestamp. Preserve the materialized current state as a derived view.
4. Route subjective evidence and disputed results to adult review before applying a consequential transition. One unusually good or bad activity must not change a permanent label.
5. Confirm the actual write result from the local tool and report the transition only when it is confirmed.
