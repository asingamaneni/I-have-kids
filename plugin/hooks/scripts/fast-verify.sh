#!/bin/sh
set -eu

# Non-destructive, bounded hook. It never installs packages, edits files, or touches data.
ROOT="${KINDERGARTEN_PROJECT_ROOT:-${CLAUDE_PROJECT_DIR:-}}"
if [ -z "$ROOT" ] || [ ! -d "$ROOT" ]; then
  printf '%s\n' 'kindergarten-learning: project root unavailable; fast verification skipped.' >&2
  exit 0
fi
if [ ! -f "$ROOT/package.json" ] || [ ! -d "$ROOT/packages" ]; then
  printf '%s\n' 'kindergarten-learning: expected project layout not found; fast verification skipped.' >&2
  exit 0
fi
if ! command -v pnpm >/dev/null 2>&1 || [ ! -d "$ROOT/node_modules" ]; then
  printf '%s\n' 'kindergarten-learning: dependencies unavailable; fast verification skipped.' >&2
  exit 0
fi

cd "$ROOT"
printf '%s\n' 'kindergarten-learning: checking contracts and deterministic domain tests…' >&2
pnpm --filter @kindergarten/contracts typecheck >/dev/null
pnpm --filter @kindergarten/domain typecheck >/dev/null
pnpm exec vitest run packages/contracts packages/domain --reporter=dot >/dev/null
printf '%s\n' 'kindergarten-learning: fast verification passed.' >&2
