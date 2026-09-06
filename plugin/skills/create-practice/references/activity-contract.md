# Activity contract reference

An activity is specified before it is rendered. At minimum preserve: `schemaVersion`, stable activity id, subject, concept id, representation stage (`concrete`, `pictorial`, or `abstract`), delivery mode, evidence purpose, title, learning objectives, difficulty step, estimated minutes, activity kind, visual support, items, asset references, answer specifications, scoring specification, prerequisite ids, curriculum/source provenance, generator version, seed when applicable, and creation time.

Each item must have a stable id, concept id, prompt/directions, exact asset references when visual, difficulty metadata, and a deterministic or explicitly review-required answer specification. A worksheet, answer/evaluation spec, generated images, submission, evaluation, and progress event are separate linked artifacts. Validate the spec and answer keys before rendering; never reverse-engineer a score from a PDF when the original spec is unavailable.
