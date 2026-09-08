import { describe, expect, it } from "vitest";
import { ActivitySpecSchema, CurriculumPackRevisionSchema, type ProgressEvent, type StudentConceptState } from "@child-learning/contracts";
import { DEFAULT_CURRICULUM } from "./curriculum.js";
import { CurriculumRegistry, curriculumDefinitionsToPackRevision } from "./registry.js";
import { projectLearnerRoadmaps } from "./roadmap.js";
import { ACTIVITY_GENERATORS } from "./generators.js";
import { GROWING_PATHS_REVISION, REFERENCE_PROGRESSIONS_REVISION } from "./sample-packs.js";

const at = "2026-03-01T00:00:00.000Z";

describe("adaptive learner roadmaps", () => {
  it("projects built-in subjects and creates evidence-backed practice branches", () => {
    const registry = new CurriculumRegistry([curriculumDefinitionsToPackRevision(DEFAULT_CURRICULUM)]);
    const state: StudentConceptState = { studentId: "s", conceptId: "math.addition-within-10", step: 1, status: "learning", recentScores: [.6, .7], updatedAt: at };
    const events: ProgressEvent[] = [.6, .7].map((score, index) => ({ id: `e-${index}`, studentId: "s", conceptId: "math.addition-within-10", score, eventType: "observation", comparable: true, evidenceStatus: "confirmed", comparabilityKey: "math|math.addition-within-10|stage:pictorial", occurredAt: at }));
    const initial = projectLearnerRoadmaps({ studentId: "s", registry, states: [], now: at }).find((roadmap) => roadmap.subject === "math")!;
    const math = projectLearnerRoadmaps({ studentId: "s", registry, states: [state], events, now: at }).find((roadmap) => roadmap.subject === "math")!;
    expect(math.id).not.toBe(initial.id);
    expect(math.nodes.some((node) => node.id === "math.addition-within-10::extra-practice" && node.branchKind === "extra-practice")).toBe(true);
    expect(math.edges.some((edge) => edge.type === "branches")).toBe(true);
    expect(math.edges.some((edge) => edge.type === "rejoins")).toBe(true);
  });

  it("loads cross-pack concepts independently of revision order and normalizes built-in subject labels", () => {
    const extension = CurriculumPackRevisionSchema.parse({ schemaVersion: "2.0", id: "a-extension-r1", packId: "a-extension", revision: 1, title: "Math extension", description: "Extends another pack's math path.", subjects: [{ id: "extension-topics", title: "Extension Topics", description: "Additional topics." }], concepts: [{ id: "math.extension", subject: "math", title: "Math extension", description: "Continue the math path.", step: 1, prerequisites: ["math.base"], activityKinds: ["selected-response"] }], edges: [], provenance: { origin: "original" }, createdBy: "adult", createdAt: at });
    const base = CurriculumPackRevisionSchema.parse({ schemaVersion: "2.0", id: "z-base-r1", packId: "z-base", revision: 1, title: "Math base", description: "Defines the math subject.", subjects: [{ id: "math", title: "Capability-based math pathway", description: "Historical math description." }], concepts: [{ id: "math.base", subject: "math", title: "Math base", description: "Start the math path.", step: 0, activityKinds: ["selected-response"] }], edges: [], provenance: { origin: "original" }, createdBy: "adult", createdAt: at });

    const registry = new CurriculumRegistry([extension, base]);

    expect(registry.concepts.has("math.extension")).toBe(true);
    expect(registry.subjects.get("math")?.title).toBe("Math");
  });

  it("does not treat an activity from an inactive curriculum revision as current", () => {
    const first = CurriculumPackRevisionSchema.parse({ schemaVersion: "2.0", id: "revisioned-r1", packId: "revisioned", revision: 1, title: "Revision one", description: "First revision.", subjects: [{ id: "history", title: "History", description: "Events over time." }], concepts: [{ id: "history.timelines", subject: "history", title: "Timelines", description: "Order events.", step: 0, activityKinds: ["selected-response"], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }], edges: [], provenance: { origin: "original" }, createdBy: "adult", createdAt: at });
    const second = CurriculumPackRevisionSchema.parse({ ...first, id: "revisioned-r2", revision: 2, title: "Revision two" });
    const activity = ActivitySpecSchema.parse({ schemaVersion: "1.0", id: "history-r1-activity", studentId: "s", subject: "history", conceptId: "history.timelines", title: "Timeline practice", representationStage: "guided", curriculumVersion: first.id, curriculumRef: { packId: first.packId, revisionId: first.id, nodeRevisionId: `${first.id}:history.timelines` }, items: [{ id: "item", conceptId: "history.timelines", kind: "selected-response", prompt: "What comes first?", choices: ["before", "after"], correctChoice: "before" }], answerSpecs: { item: { type: "choice", expected: "before" } }, scoring: { method: "exact" }, createdAt: at });
    const firstRegistry = new CurriculumRegistry([first]);
    expect(firstRegistry.activityMatchesActiveRevision(activity)).toBe(true);
    expect(firstRegistry.activityMatchesActiveRevision({ ...activity, curriculumRef: { ...activity.curriculumRef!, nodeRevisionId: "revisioned-r1:other-concept" } })).toBe(false);
    expect(new CurriculumRegistry([second]).activityMatchesActiveRevision(activity)).toBe(false);
  });

  it("uses typed requires edges for availability gating", () => {
    const revision = CurriculumPackRevisionSchema.parse({ schemaVersion: "2.0", id: "edge-pack-r1", packId: "edge-pack", revision: 1, title: "Edge pack", description: "Tests typed graph dependencies.", subjects: [{ id: "coding", title: "Coding", description: "Algorithms and programs." }], concepts: [{ id: "coding.sequence", subject: "coding", title: "Sequences", description: "Order steps.", step: 0, activityKinds: ["ordering"], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }, { id: "coding.loops", subject: "coding", title: "Loops", description: "Repeat steps.", step: 1, activityKinds: ["selected-response"], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }], edges: [{ id: "sequence-requires-loops", from: "coding.sequence", to: "coding.loops", type: "requires" }], provenance: { origin: "original" }, createdBy: "adult", createdAt: at });
    const registry = new CurriculumRegistry([revision]);
    const roadmap = projectLearnerRoadmaps({ studentId: "s", registry, states: [], now: at })[0]!;
    expect(roadmap.nodes.find((node) => node.conceptId === "coding.loops")?.status).toBe("locked");
  });

  it("uses an explicit assessment directive as the initial roadmap focus", () => {
    const registry = new CurriculumRegistry([curriculumDefinitionsToPackRevision(DEFAULT_CURRICULUM), GROWING_PATHS_REVISION]);
    const roadmaps = projectLearnerRoadmaps({ studentId: "s", registry, states: [], directives: [{ id: "assess-place-value", studentId: "s", conceptId: "math.place-value", action: "assess", reason: "Parent reports place-value work.", authorId: "adult", requestedStage: "pictorial", priority: 5, createdAt: at }], now: at });
    expect(roadmaps.find((roadmap) => roadmap.subject === "math")?.currentNodeIds).toEqual(["math.place-value"]);
  });

  it("keeps every per-subject roadmap edge connected to visible nodes", () => {
    const revision = CurriculumPackRevisionSchema.parse({ schemaVersion: "2.0", id: "cross-subject-r1", packId: "cross-subject", revision: 1, title: "Cross-subject path", description: "Coordinates two subjects.", subjects: [{ id: "math", title: "Math", description: "Numbers." }, { id: "history", title: "History", description: "Events." }], concepts: [{ id: "math.timeline-scale", subject: "math", title: "Timeline scale", description: "Read equal intervals.", step: 0, activityKinds: ["numeric-response"] }, { id: "history.timelines", subject: "history", title: "Timelines", description: "Order events.", step: 0, readinessConceptIds: ["math.timeline-scale"], activityKinds: ["ordering"] }], edges: [{ id: "scale-supports-timeline", from: "math.timeline-scale", to: "history.timelines", type: "cross-subject" }], provenance: { origin: "original" }, createdBy: "adult", createdAt: at });
    const roadmaps = projectLearnerRoadmaps({ studentId: "s", registry: new CurriculumRegistry([revision]), states: [], now: at });
    for (const roadmap of roadmaps) {
      const nodeIds = new Set(roadmap.nodes.map((node) => node.id));
      expect(roadmap.edges.every((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))).toBe(true);
    }
  });

  it("loads continuous Math and Language Arts progressions with diagnostic anchors", () => {
    const registry = new CurriculumRegistry([curriculumDefinitionsToPackRevision(DEFAULT_CURRICULUM), GROWING_PATHS_REVISION, REFERENCE_PROGRESSIONS_REVISION], { generators: new Set(["template-bank", ...Object.keys(ACTIVITY_GENERATORS)]), evaluators: new Set(["deterministic", "review-gated"]), renderers: new Set(["worksheet"]) });
    expect(registry.concepts.has("math.differentiation")).toBe(true);
    expect(registry.concepts.has("math.statistics")).toBe(true);
    expect(registry.concepts.has("english.critical-reading")).toBe(true);
    expect(registry.concepts.has("english.evidence-based-writing")).toBe(true);
    expect(registry.assessmentTargets.get("math.solves-linear-equations")).toEqual(expect.objectContaining({ conceptId: "math.linear-equations", stage: "independent" }));
    expect(registry.assessmentTargets.get("english.evaluates-texts")).toEqual(expect.objectContaining({ conceptId: "english.critical-reading", stage: "independent" }));
    expect(registry.concepts.get("math.integration")?.phase).toBe("advanced");
    expect(registry.concepts.get("english.summarizing")?.strand).toBe("synthesis");
    expect(registry.templates.has("math.integration.diagnostic")).toBe(true);
  });

  it("rejects ambiguous assessment anchors", () => {
    const revision = CurriculumPackRevisionSchema.parse({ schemaVersion: "2.0", id: "duplicate-anchor-r1", packId: "duplicate-anchor", revision: 1, title: "Duplicate anchors", description: "Invalid duplicate assessment claims.", subjects: [{ id: "music", title: "Music", description: "Rhythm and melody." }], concepts: [{ id: "music.rhythm", subject: "music", title: "Rhythm", description: "Keep a beat.", step: 0, activityKinds: ["selected-response"], assessmentTargets: [{ claim: "music.keeps-beat", stage: "guided" }], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }, { id: "music.meter", subject: "music", title: "Meter", description: "Group beats.", step: 1, activityKinds: ["selected-response"], assessmentTargets: [{ claim: "music.keeps-beat", stage: "guided" }], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }], provenance: { origin: "original" }, createdBy: "adult", createdAt: at });
    expect(() => new CurriculumRegistry([revision])).toThrow(/assigned to both/);
  });

  it("accepts a runtime-added subject with configurable stage names", () => {
    const revision = CurriculumPackRevisionSchema.parse({ schemaVersion: "2.0", id: "communities-r1", packId: "communities", revision: 1, title: "Communities", description: "Social studies roadmap.", subjects: [{ id: "social-studies", title: "Social Studies", description: "People and places." }], concepts: [{ id: "social-studies.communities", subject: "social-studies", title: "Communities", description: "Describe a community.", step: 0, activityKinds: ["selected-response"], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }, { stage: "independent", deliveryMode: "worksheet", evidencePurpose: "mastery", generator: "template-bank" }] }, { id: "social-studies.maps", subject: "social-studies", title: "Maps", description: "Use a map key.", step: 1, prerequisites: ["social-studies.communities"], activityKinds: ["selected-response"], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }], edges: [{ id: "community-to-map", from: "social-studies.communities", to: "social-studies.maps", type: "requires" }], provenance: { origin: "original" }, createdBy: "adult", createdAt: at });
    const registry = new CurriculumRegistry([revision]);
    const roadmap = projectLearnerRoadmaps({ studentId: "s", registry, states: [], now: at })[0]!;
    expect(roadmap.subject).toBe("social-studies");
    expect(roadmap.nodes.find((node) => node.conceptId === "social-studies.communities")?.stage).toBe("guided");
    expect(roadmap.nodes.find((node) => node.conceptId === "social-studies.maps")?.status).toBe("locked");
  });
});
