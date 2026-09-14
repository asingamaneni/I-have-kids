# 0010: Scenario evals for every skill

## Status

Accepted

## Context

Unit tests cover the deterministic domain and the local MCP service, and Playwright covers the browser, but nothing verified that Claude actually follows a `SKILL.md`: calling the right local tools, refusing to mutate progress, stopping before approving its own curriculum proposal, or keeping answer keys out of child-facing text. Those behaviours are the product's safety boundary and regress silently when a skill body or the model changes.

## Decision

Every reusable skill (`plugin/skills/<skill>/evals/`) and every entry skill (`plugin/commands/evals/<command>/`) carries scenario cases as Markdown files. A case names a fixture, positional arguments, and assertions in three tiers:

- **Tier 0 (Critical)** decides pass/fail. It holds only deterministic, structural checks: run completed, no crash text, forbidden tools not called, required tools called, row counts in the isolated database.
- **Tier 1 (Important)** is scored but never fails a case. It may include LLM-judged rubrics.
- **Tier 2 (Capability Tracking)** records duration and tool-call budgets for trend watching.

`pnpm eval:skills` runs each case in a headless `claude -p` session against the built plugin with a fresh SQLite database and artifact directory per case, plugin hooks disabled, user settings excluded, and only the plugin's MCP tools plus read-only built-ins (Read, Glob, Grep) available unless a case opts into more. Results land in a timestamped `RESULTS_DIR` under `.data/evals/` as `eval-results.json`, `eval-results.md`, and per-case `_eval_output.jsonl` transcripts.

Fixtures seed through the public `createLocalService` API only. The test-only demo seed under `packages/mcp-server/tests` stays private to that package.

A vitest guard (`tests/skill-evals.test.ts`) keeps the corpus honest without spending tokens: every skill has at least one case, every assertion parses, Tier 0 contains no judged rubric, and every placeholder is provided by its fixture.

## Consequences

- Evals cost tokens and need a signed-in `claude` CLI, so they run on demand and are not part of `verify:fast`.
- Tier 0 stays narrow on purpose. Wording expectations belong in Tier 1 so model phrasing drift does not fail the suite.
- Reusable-skill `evals/` folders ship inside the built plugin because the builder copies skill subfolders. They are inert Markdown; command evals are not shipped.
