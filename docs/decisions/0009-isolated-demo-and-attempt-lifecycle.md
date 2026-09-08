# 0009: Isolated demo data and worksheet attempt lifecycle

## Status

Accepted

## Context

A reproducible demo previously shared the household database and stable learner IDs. Genuine interaction with the demo could then appear beside synthetic evaluations and affect summaries. The child worktable also showed every available activity identically, even after submission or completion.

## Decision

Synthetic fixtures use a dedicated SQLite database and artifact root under `.data/demo`, a versioned immutable dataset manifest, a visibly labeled `/demo/*` route family, and reserved IDs. Household services never open demo storage, ordinary mutations never default to a demo learner, and reseeding never rebuilds post-seed state.

Existing data is handled conservatively. A canonical untouched legacy fixture can be marked demo. A legacy demo learner containing extra work is marked `legacy-mixed`; no activity, evaluation, progress event, report, artifact, or lineage edge is deleted or rewritten.

Every activity receives a child-safe lifecycle projection derived from its newest immutable submission and active append-only evaluation leaf:

- not attempted;
- awaiting validation;
- corrections needed;
- complete.

The child home is an action queue rather than an archive. Completed work moves to **My history**. A retry uses the same immutable activity specification and creates a new numbered submission linked to the prior attempt. Historical-revision retries remain visible but cannot alter current mastery.

Every new worksheet defaults to 20 items, uses item-aware print density, and carries an answer-free concept guide tied to its activity and curriculum revision. Adult reports are immutable current, monthly, or quarterly as-of snapshots; reading an earlier report never mutates current learning state.

## Consequences

- Synthetic scores cannot be mistaken for household evidence by construction.
- A child can distinguish what to start, what is being checked, what needs correction, and what is complete.
- Exact worksheet attempts and retries remain auditable without rewriting history.
- Existing mixed stores remain inspectable and explicitly ambiguous rather than being destructively cleaned.
