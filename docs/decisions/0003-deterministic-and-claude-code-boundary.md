# ADR 0003: Deterministic application with Claude Code proposals

## Status

Accepted.

## Decision

Application code owns schemas, answer construction, scoring, progression thresholds, comparable-evidence windows, review scheduling, recommendation ranking, and persistence. The application has no Anthropic SDK dependency and makes no model API calls.

The active Claude Code session may use Omniplug skills and local MCP tools to:

- propose personalized activity wording and variants;
- compose requests for local semantic SVG assets;
- transcribe evidence visible in a local worksheet image;
- write brief child-facing mistake explanations;
- summarize confirmed evidence for an adult.

Every proposal crosses a versioned Zod/MCP contract. Known answers are validated by code. Image or open-response interpretations are stored as `claude_code_assisted` evaluations with confidence and `needs-human-review`; they do not become progress observations until an adult confirms them.

## Consequences

- No API credentials, provider retention policy, or paid model calls are required.
- Tests are deterministic and never call a model.
- Claude cannot directly write learning state.
- Subjective reasoning remains reviewable and reversible.
