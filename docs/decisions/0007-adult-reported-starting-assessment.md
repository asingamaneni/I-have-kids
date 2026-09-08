# ADR 0007: Adult-reported starting assessment

## Status

Accepted.

## Decision

A new learner profile receives no seeded activity. An adult first supplies structured capabilities observed today, completes a per-subject starting questionnaire, or explicitly chooses a subject-entry diagnostic. Setup also accepts optional free-text context, but narrative notes do not select capabilities by themselves.

These answers are stored as **reported capabilities**, not as progress evidence. Curriculum-owned assessment anchors select a diagnostic neighborhood near the reported level, normally one primary target per selected subject. The application appends an `assess` learning directive so the diagnostic can be shown even when normal prerequisites are not yet recorded. School placement can shape presentation but never supplies mastery.

An assessment directive:

- does not mark a concept or prerequisite secure;
- does not alter the child's progress projection;
- gives the diagnostic high recommendation priority;
- records the adult statement and reason in the local audit history;
- remains subject to deterministic scoring or explicit human review;
- establishes the baseline only after every starting diagnostic has a final, confirmed evaluation.

If the adult provides no structured capability or questionnaire anchor, the learner remains `awaiting-intake`. No worksheet, directive, concept state, or false current roadmap node is created. An adult must later complete intake or explicitly request a subject-entry diagnostic.

## Consequences

- Experienced children can start near what they can currently demonstrate without a rigid grade sequence.
- Adult knowledge informs assessment selection but cannot create false mastery.
- Starting context is visible in adult settings and reports, while analytics and adult notes remain outside child-facing data.
- A child can reveal an unexpected gap or strength during the diagnostic, and the normal evidence policy adjusts the subsequent path.
