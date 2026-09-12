# Curriculum graph extension reference

A curriculum extension is an immutable `CurriculumPackRevision`, not an edit to active rows. It includes a stable pack id, increasing revision number, registry-backed subjects, capability nodes, typed edges, ordered stage definitions, supported activity primitives, original deterministic/review-gated templates, provenance, and creation metadata.

Use advisory age or placement ranges only to adapt vocabulary, safety, visual density, and support. They never determine eligibility or cap the graph. Existing concrete/pictorial/abstract paths remain valid, but a subject may configure other ordered stages such as guided, visual, planned, independent, application, or extension.

Each concept requires a stable id, subject, title, description, prerequisite/readiness relationships, branch kind, activity kinds, stages, generator/evaluator/renderer ids, and enough answer information to validate every deterministic item. Generic primitives cover selected response, numeric response, short response, extended rubric response, ordering, observations/projects, and the existing visual early-learning items. A genuinely new interaction kind still requires a code-level contract, scorer/evaluator, renderer, and tests.

Before storing a proposal, check duplicate ids, dangling references, cycles, stage duplication/order, component registrations, concept/item consistency, complete answer specifications, historical-id preservation, and originality. Show a concise node/edge diff and affected learners. A proposal does not change any roadmap. Only an explicit adult approval followed by a separate activation event can do that; rollback activates an earlier immutable revision rather than deleting history.

Learner-specific extra-practice and review branches normally belong in the roadmap overlay, not the shared curriculum pack. They must be triggered by repeated confirmed evidence, link back to the core concept, and never count as prerequisite mastery by themselves.

## Proposal tool input shape

`propose_curriculum_revision` takes a wrapper. Prefer the extension form: name the active revision in `extendsRevisionId` and send only what is new under `revision`. The application carries every historical concept, edge, subject, and template forward by id and bumps the revision number, so you never retype the existing pack. Templates live under `activityTemplates`.

```json
{
  "proposal": {
    "extendsRevisionId": "capability-path-v1",
    "rationale": "Why this extension fits the learner and the evidence that prompted it.",
    "createdBy": "adult-author",
    "affectedStudentIds": ["student-id"],
    "revision": {
      "description": "Adds telling time to the hour after addition within 10.",
      "concepts": [ /* only the new concept(s) */ ],
      "edges": [ { "id": "edge-addition-to-time", "from": "math.addition-within-10", "to": "math.telling-time-hour", "type": "requires" } ],
      "activityTemplates": [ /* original templates for the new concept with complete answerSpecs and scoring */ ]
    }
  }
}
```

Only send a complete `revision` (schemaVersion "2.0", id, packId, integer revision, subjects, concepts, edges, activityTemplates, provenance, createdBy) when creating a brand-new pack. To find the active revision id and an example concept shape, call `get_curriculum_graph` with the subject rather than `list_curriculum`, which returns every template in full.
