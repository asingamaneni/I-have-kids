# ADR 0007: Adult-reported starting assessment

## Status

Accepted.

## Decision

A new learner may begin from an adult's description of capabilities observed today rather than being forced through every entry-level activity. Setup offers structured capability statements across math, language, reasoning, and science plus an optional free-text observation.

These statements are stored as **reported capabilities**, not as progress evidence. They select up to one short diagnostic starting point per subject at the matching pictorial or abstract stage. The application appends an `assess` learning directive so the diagnostic can be shown even when normal prerequisites are not yet recorded.

An assessment directive:

- does not mark a concept or prerequisite secure;
- does not alter the child's progress projection;
- gives the diagnostic high recommendation priority;
- records the adult statement and reason in the local audit history;
- remains subject to deterministic scoring or explicit human review;
- establishes the baseline only after every starting diagnostic has a final, confirmed evaluation.

If the adult does not state any current capability, the learner begins with a concrete counting exploration. Assessment results then drive the same concrete-to-pictorial-to-abstract availability policy as all later work.

## Consequences

- Experienced children can start near what they can currently demonstrate without a rigid grade sequence.
- Adult knowledge informs assessment selection but cannot create false mastery.
- Starting context is visible in adult settings and reports, while analytics and adult notes remain outside child-facing data.
- A child can reveal an unexpected gap or strength during the diagnostic, and the normal evidence policy adjusts the subsequent path.
