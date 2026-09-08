---
description: Generate an adult-readable progress report from confirmed local evidence.
argumentHint: "[student-id] [current-or-monthly-or-quarterly] [date] [timezone]"
model: inherit
---

Delegate to `generate-progress-report` with `$ARGUMENTS`. Default the requested current/monthly/quarterly period and explicit timezone, reconstruct state only from evidence effective at that cutoff, put needs-attention and recommended next work first, and store a new immutable report artifact without reconciling or overwriting current history.
