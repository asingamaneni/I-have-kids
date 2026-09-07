# Curriculum graph extension reference

A curriculum extension is an immutable `CurriculumPackRevision`, not an edit to active rows. It includes a stable pack id, increasing revision number, registry-backed subjects, capability nodes, typed edges, ordered stage definitions, supported activity primitives, original deterministic/review-gated templates, provenance, and creation metadata.

Use advisory age or placement ranges only to adapt vocabulary, safety, visual density, and support. They never determine eligibility or cap the graph. Existing concrete/pictorial/abstract paths remain valid, but a subject may configure other ordered stages such as guided, visual, planned, independent, application, or extension.

Each concept requires a stable id, subject, title, description, prerequisite/readiness relationships, branch kind, activity kinds, stages, generator/evaluator/renderer ids, and enough answer information to validate every deterministic item. Generic primitives cover selected response, numeric response, short response, extended rubric response, ordering, observations/projects, and the existing visual early-learning items. A genuinely new interaction kind still requires a code-level contract, scorer/evaluator, renderer, and tests.

Before storing a proposal, check duplicate ids, dangling references, cycles, stage duplication/order, component registrations, concept/item consistency, complete answer specifications, historical-id preservation, and originality. Show a concise node/edge diff and affected learners. A proposal does not change any roadmap. Only an explicit adult approval followed by a separate activation event can do that; rollback activates an earlier immutable revision rather than deleting history.

Learner-specific extra-practice and review branches normally belong in the roadmap overlay, not the shared curriculum pack. They must be triggered by repeated confirmed evidence, link back to the core concept, and never count as prerequisite mastery by themselves.
