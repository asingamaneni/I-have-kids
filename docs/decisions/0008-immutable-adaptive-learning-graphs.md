# 0008: Immutable adaptive learning graphs

## Status

Accepted

## Context

The original capability path was a finite in-memory graph for four early-learning subjects. It could adapt stage and difficulty inside those concepts, but it could not register a new subject, preserve curriculum revisions, show graph topology to a child, or continue automatically after the last approved concept.

## Decision

Treat curriculum as immutable, content-addressed pack revisions. An active registry composes approved revisions into subject graphs with stable concept IDs, ordered stages, typed edges, registered activity primitives, and provenance. Historical `capability-path-v1` definitions are imported unchanged as the first revision.

Each learner receives a projected roadmap that overlays confirmed evidence, directives, reviews, and learner-specific practice branches on the active curriculum topology. Reconciliation runs after starting assessment, confirmed evidence, directives, and curriculum activation. Repeated confirmed difficulty may add an extra-practice branch that rejoins its core concept; it does not create prerequisite mastery.

Claude may propose a curriculum revision but cannot approve or activate it. Deterministic validation rejects cycles, dangling references, unsupported components, missing answer contracts, and removal of historical concept IDs. An adult decision and separate activation event are required. Rollback activates an older immutable revision rather than editing history.

Child projections omit scores, confidence, adult rationale, locked analytics, revision metadata, and private notes. The default child view collapses completed history and shows the current placement plus five mainline steps; a child may deliberately open the complete child-safe path with a clear “You are here” marker. Adult projections render the complete approved subject progression top-to-bottom, retain evidence reasons, and expose node-level extra-practice, reassessment, prioritization, and curriculum-proposal entry points.

## Consequences

- Subjects and stages are registry-backed IDs rather than closed enums.
- The learning roadmap can grow without using grade as a ceiling.
- Existing learner data, artifacts, hashes, and concept IDs remain valid.
- Every subject pack follows the same reference architecture: ordered micro-skills grouped into phases/strands, several diagnostic anchors, consolidation/review links, and an open-ended path from foundations through fluency, comprehension/application, analysis, and advanced work.
- The supplied Math and English progression tables inform breadth and structural continuity only. Product concept IDs, grouping, descriptions, guides, templates, questions, illustrations, and layouts remain original; no proprietary level system or worksheet material is copied.
- Adding a wholly new interaction type still requires a registered contract, scorer/evaluator, and renderer; ordinary new curricula use the generic activity primitives.
