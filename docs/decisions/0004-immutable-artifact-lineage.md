# ADR 0004: Content-addressed artifacts and append-only lineage

## Status

Accepted.

## Decision

Structured activity specifications, rendered worksheets, submissions, evaluations, reports, and supporting assets are distinct immutable artifacts. Bytes are stored by SHA-256 under `.data/artifacts`; SQLite stores metadata and directed lineage edges.

Important relations include:

- activity specification → worksheet (`generated-from`);
- activity specification → submission (`submitted-from`);
- submission → evaluation (`evaluated-from`);
- proposal → adult correction (`corrected-from`);
- evaluations/progress evidence → report (`supports`).

Historical tables have SQLite triggers rejecting updates and deletes. Current `student_concept_state` is a materialized projection that can change, but every change is supported by append-only progress events containing previous/new snapshots, evidence, policy version, and reason.

## Consequences

- A completed worksheet always traces to its exact source specification.
- Corrections and overrides add history rather than rewriting it.
- Duplicate bytes deduplicate while their metadata records remain intact.
- Database and filesystem lineage are checked for missing parents, self-links, and cycles.
