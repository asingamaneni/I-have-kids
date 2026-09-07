#!/bin/sh
set -eu

# Status-only hook: never writes project data and never requires credentials.
ROOT="${CHILD_LEARNING_PROJECT_ROOT:-${KINDERGARTEN_PROJECT_ROOT:-${CLAUDE_PROJECT_DIR:-}}}"
if [ -z "$ROOT" ] || [ ! -d "$ROOT" ]; then
  printf '%s\n' 'child-learning: project root unavailable; status hook skipped.' >&2
  exit 0
fi
if [ ! -f "$ROOT/package.json" ] || [ ! -d "$ROOT/packages" ]; then
  printf '%s\n' 'child-learning: expected project layout not found; status hook skipped.' >&2
  exit 0
fi
printf '%s\n' "child-learning: local project ready at $ROOT" >&2
printf '%s\n' 'child-learning: no API credentials are required; use local MCP tools for stored results.' >&2
