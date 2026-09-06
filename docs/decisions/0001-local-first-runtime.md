# ADR 0001: Local-first runtime with an Omniplug operator layer

## Status

Accepted.

## Decision

The product is a local TypeScript web application backed by SQLite and immutable filesystem artifacts. A separate canonical Omniplug source compiles the Claude Code skills, commands, agents, hooks, guidance, and local stdio MCP configuration used to operate it.

The application does not call the Anthropic API and requires no model credentials. The active Claude Code session may propose activities or interpret local worksheet images through plugin workflows, but application contracts and deterministic code validate every proposal before it becomes learning evidence.

## Consequences

- The demo starts without cloud accounts, API keys, or hosted services.
- Claude Code showcases the plugin behavior while the application owns durable state and UI.
- Subjective evidence always has a human checkpoint.
- Omniplug remains a compiler dependency, not an imported runtime library.
