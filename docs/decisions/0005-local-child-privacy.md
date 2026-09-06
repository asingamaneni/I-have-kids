# ADR 0005: Local child privacy and adult checkpoints

## Status

Accepted for the demo-quality local application.

## Decision

All student records and uploaded work remain on the local machine. Child-facing contracts are separate from adult activity contracts: they remove `answerSpecs` and hidden item fields such as arithmetic results, correct choices, target sounds, sequence answers, and expected observations before data reaches MCP child resources, HTTP APIs, or client components.

Adult routes can optionally be protected with `LEARNING_ADULT_PIN`. The gate covers adult pages, printable reports/answer sheets, activity generation, review, report, and override mutations. With no PIN configured, the local demo remains frictionless. This is not a substitute for production identity, consent, encryption, retention, or regulatory controls.

Uploads are restricted by local type/size checks, stored as immutable artifacts, linked to their activity, and immediately marked for adult review. The app does not perform or claim OCR. Claude Code-assisted interpretations require explicit confirmation before progress changes.

## Consequences

- Child pages cannot recover answers from serialized application data.
- Adult analytics and confidence labels are intentionally absent from child views.
- Hosted deployment requires a new security/privacy decision before use.
