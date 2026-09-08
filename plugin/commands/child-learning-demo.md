---
description: Run the read-only or explicitly requested child learning demonstration narrative.
argumentHint: "[student-id]"
model: inherit
---

Walk through the canonical demo narrative in `skills/recommend-next-activity/references/demo-narrative.md` using only the isolated demo service and `/demo/*` routes. Never initialize or mutate demo fixtures in the household database. Use `$ARGUMENTS` only when it identifies the returned isolated demo learner. Confirm each generated, stored, submitted, evaluated, and progressed artifact from actual results; never simulate missing results or expose answer keys to a child. Reuse the immutable demo dataset manifest on repeated runs and pause for adult review where required.
