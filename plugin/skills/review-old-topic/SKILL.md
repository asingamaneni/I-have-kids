---
name: review-old-topic
description: "Schedule and generate a retention check for a previously learned concept."
whenToUse: When a mastered or older concept is due for spaced review or has weakened.
argumentHint: "[student-id] [concept-id-or-auto] [date]"
model: inherit
effort: medium
---

Use the local review scheduler and configurable policy rather than a fixed hidden intuition.

**Never call `generate_activity` for a student before `get_learning_path` (or `get_student_context`) confirms the concept-stage is available for that student.** If the concept is locked, stop and report the unmet prerequisite chain instead of generating; for an open-ended request, pick the concept from the path or `recommend_next_activity`. Always finish with `validate_and_store_activity` so the work reaches the shelf and timeline.

- Retrieve review-due concepts, prior mastery evidence, last practice, recent scores, and adult overrides from local MCP tools.
- Default review intervals may be approximately 1, 7, 21, and 60 days, but treat them as policy configuration rather than a pedagogical claim. Successful reviews may extend an interval; weak reviews return the concept to targeted practice through deterministic code.
- Generate a short, age-appropriate comparable activity after the activity specification is validated. Avoid answer leakage and preserve exact lineage to the prior concept evidence.
- Do not alter status merely because a review was scheduled. Only a later confirmed evaluation can produce an append-only progress event.
