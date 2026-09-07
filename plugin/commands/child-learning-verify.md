---
description: Run a non-destructive fast verification of the plugin and learning contracts.
argumentHint: "[scope]"
model: inherit
---

Run the local fast verification hook or equivalent read-only checks for `$ARGUMENTS`. Prefer `hooks/scripts/fast-verify.sh`; it must gracefully skip outside the expected project. Do not install or run Omniplug, change application packages, or modify data. Report exact checks and failures.
