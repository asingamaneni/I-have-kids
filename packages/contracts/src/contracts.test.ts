import { describe, expect, it } from "vitest";
import { ActivityItemSchema, ActivitySpecSchema, ChildActivityLifecycleSchema, CurriculumDefinitionSchema, CurriculumPackRevisionSchema, EvaluationSchema, LearnerIntakeSchema, LearnerRoadmapSchema, ProgressEventSchema, ReportSnapshotSchema, StudentSchema, SubmissionSchema, toChildActivitySpec, toChildLearnerRoadmap } from "./index.js";

describe("versioned learning contracts", () => {
  it("accepts the subject-neutral activity item kinds", () => {
    const base = { id: "item", conceptId: "concept", prompt: "Try this", assetRefs: [], difficulty: 0, metadata: {} };
    const items = [
      { ...base, kind: "picture-addition-subtraction", operation: "addition", leftCount: 1, rightCount: 2, result: 3 },
      { ...base, kind: "number-choice", choices: [1, 2], correctChoice: 2 },
      { ...base, kind: "equation", equation: "1 + 1", answer: 2 },
      { ...base, kind: "equal-groups-fair-sharing", mode: "equal-groups", total: 4, groupCount: 2, amountPerGroup: 2 },
      { ...base, kind: "phonics-picture-word", targetWord: "sun", targetSound: "s", imageAssetRef: "sun.svg" },
      { ...base, kind: "handwriting-writing", mode: "copy", targetText: "A", rubricId: "r" },
      { ...base, kind: "reading-comprehension", passage: "A short text.", question: "What?", correctAnswer: "A" },
      { ...base, kind: "sequencing-reasoning", sequence: ["first", "last"], answer: [0, 1], reasoningType: "sequence" },
      { ...base, kind: "science-observation", observationPrompt: "Look closely.", observableFeatures: ["color"], expectedObservations: ["green"] },
      { ...base, kind: "selected-response", choices: ["A", "B"], correctChoice: "B" },
      { ...base, kind: "numeric-response", expected: 12, tolerance: 0 },
      { ...base, kind: "short-response", expectedAnswers: ["habitat"] },
      { ...base, kind: "extended-response", rubricId: "paragraph-v1", minimumLines: 3 },
      { ...base, kind: "ordering", options: ["first", "second"], correctOrder: [0, 1] },
    ];
    expect(items.every((item) => ActivityItemSchema.safeParse(item).success)).toBe(true);
  });
  it("keeps activity specs versioned and rejects unknown item kinds", () => {
    const activity = { schemaVersion: "1.0", id: "a", subject: "math", conceptId: "c", title: "A", items: [{ id: "i", conceptId: "c", kind: "number-choice", prompt: "Pick", choices: [1, 2], correctChoice: 1 }], answerSpecs: { i: { type: "integer", expected: 1 } }, scoring: { method: "exact" }, createdAt: "2024-01-01T00:00:00.000Z" };
    expect(ActivitySpecSchema.safeParse(activity).success).toBe(true);
    expect(ActivityItemSchema.safeParse({ ...activity.items[0], kind: "made-up" }).success).toBe(false);
  });
  it("removes answer contracts and hidden item answers from child activity data", () => {
    const activity = ActivitySpecSchema.parse({ schemaVersion: "1.0", id: "a", studentId: "s", subject: "math", conceptId: "c", title: "A", representationStage: "concrete", deliveryMode: "hands-on", evidencePurpose: "exploration", presentation: { materials: ["counters"], childInvitation: "Try it.", steps: ["Move the counters."], adultGuide: "Private adult guidance.", observationPrompt: "Private observation criteria." }, childGuide: { title: "How addition works", conceptSummary: "Joining groups makes a larger total.", steps: ["Make two groups.", "Join them.", "Count all."], example: { prompt: "Join 2 and 3.", explanation: "Count all five objects." }, remember: "The total tells how many altogether." }, items: [{ id: "i", conceptId: "c", kind: "number-choice", prompt: "Pick", choices: [1, 2], correctChoice: 1 }], answerSpecs: { i: { type: "choice", expected: "1" } }, scoring: { method: "exact" }, rationale: "Private adult rationale.", sourceMetadata: { origin: "human", notes: "Private adult notes." }, generator: { name: "private-generator", version: "1" }, seed: 42, createdAt: "2024-01-01T00:00:00.000Z" });
    const child = toChildActivitySpec({ ...activity, items: [{ ...activity.items[0]!, metadata: { answer: "secret", dotCount: 2 } }] });
    expect(child).not.toHaveProperty("answerSpecs");
    for (const hiddenField of ["scoring", "curriculumVersion", "curriculumRef", "prerequisiteConceptIds", "comparabilityKey", "rationale", "source", "sourceMetadata", "generator", "seed"]) {
      expect(child).not.toHaveProperty(hiddenField);
    }
    expect(child.items[0]).not.toHaveProperty("correctChoice");
    expect(child.items[0]?.metadata).toEqual({ dotCount: 2 });
    expect(child.presentation).toEqual({ materials: ["counters"], childInvitation: "Try it.", steps: ["Move the counters."] });
    expect(child.presentation).not.toHaveProperty("adultGuide");
    expect(child.presentation).not.toHaveProperty("observationPrompt");
    expect(child.childGuide?.conceptSummary).toContain("Joining groups");
    expect(JSON.stringify(child.childGuide)).not.toContain("Private");
  });

  it("accepts open subjects and removes roadmap analytics from child output", () => {
    const roadmap = LearnerRoadmapSchema.parse({ schemaVersion: "1.0", id: "roadmap-1", studentId: "s", subject: "social-studies", title: "Communities", curriculumRevisionIds: ["revision-1"], nodes: [{ id: "node-1", conceptId: "social-studies.communities", subject: "social-studies", title: "Communities", description: "Learn how communities work.", stage: "guided", status: "current", branchKind: "core", depth: 0, reason: "Confirmed starting assessment.", evidenceCount: 2, recentScore: .8, curriculumRevisionId: "revision-1" }, { id: "node-2", conceptId: "social-studies.maps", subject: "social-studies", title: "Maps", description: "Read simple maps.", stage: "independent", status: "locked", branchKind: "core", depth: 1, reason: "Complete communities first.", evidenceCount: 0, curriculumRevisionId: "revision-1" }], edges: [{ id: "edge-1", from: "node-1", to: "node-2", type: "requires" }], currentNodeIds: ["node-1"], completedNodeIds: [], frontierNodeIds: ["node-1"], generatedAt: "2024-01-01T00:00:00.000Z" });
    const child = toChildLearnerRoadmap(roadmap);
    expect(child.nodes).toHaveLength(2);
    expect(child.nodes[0]).not.toHaveProperty("recentScore");
    expect(child.nodes[0]).not.toHaveProperty("reason");
    expect(child.nodes[1]).toMatchObject({ id: "node-2", status: "planned", message: "Coming next" });
    expect(child.edges).toHaveLength(1);
  });

  it("validates immutable curriculum pack revisions for new subjects", () => {
    const revision = CurriculumPackRevisionSchema.parse({ schemaVersion: "2.0", id: "communities-r1", packId: "communities", revision: 1, title: "Communities", description: "An original social studies starter path.", subjects: [{ id: "social-studies", title: "Social Studies", description: "People, places, and communities." }], concepts: [{ id: "social-studies.communities", subject: "social-studies", title: "Communities", description: "Describe what communities share.", step: 0, activityKinds: ["selected-response"], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }], edges: [], provenance: { origin: "original" }, createdBy: "local-adult", createdAt: "2024-01-01T00:00:00.000Z" });
    expect(revision.subjects[0]?.id).toBe("social-studies");
    expect(revision.concepts[0]?.stages[0]?.stage).toBe("guided");
  });

  it("validates intake, lifecycle, retries, and report periods", () => {
    expect(LearnerIntakeSchema.safeParse({ observedCapabilities: ["math.adds-with-symbols"], questionnaireAnchors: [], source: "adult-observation" }).success).toBe(true);
    expect(StudentSchema.parse({ id: "s", displayName: "A", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" })).toMatchObject({ baselineStatus: "awaiting-intake", dataScope: "household" });
    expect(SubmissionSchema.safeParse({ id: "s2", activityId: "a", studentId: "s", responses: [], submittedAt: "2024-01-02T00:00:00.000Z", retryOfSubmissionId: "s1" }).success).toBe(true);
    const activity = toChildActivitySpec(ActivitySpecSchema.parse({ schemaVersion: "1.0", id: "a", studentId: "s", subject: "math", conceptId: "c", title: "A", items: [{ id: "i", conceptId: "c", kind: "equation", prompt: "Add", equation: "1 + 1 =", answer: 2 }], answerSpecs: { i: { type: "integer", expected: 2 } }, scoring: { method: "exact" }, createdAt: "2024-01-01T00:00:00.000Z" }));
    expect(ChildActivityLifecycleSchema.safeParse({ activity, status: "not-attempted", statusLabel: "Not started", actionLabel: "Start", attemptCount: 0 }).success).toBe(true);
    expect(ReportSnapshotSchema.safeParse({ id: "r", studentId: "s", asOf: "2024-04-01T00:00:00.000Z", kind: "quarterly", period: { startInclusive: "2024-01-01T00:00:00.000Z", endExclusive: "2024-04-01T00:00:00.000Z", timeZone: "America/New_York", label: "Q1 2024" }, conceptStates: [], summary: "Quarterly summary" }).success).toBe(true);
    expect(ReportSnapshotSchema.safeParse({ id: "bad", studentId: "s", asOf: "2024-04-01T00:00:00.000Z", kind: "monthly", conceptStates: [], summary: "Missing period" }).success).toBe(false);
  });

  it("validates student, evaluation, and curriculum documents", () => {
    expect(StudentSchema.safeParse({ id: "s", displayName: "A", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }).success).toBe(true);
    expect(EvaluationSchema.safeParse({ id: "e", submissionId: "sub", studentId: "s", conceptId: "c", score: .8, items: [{ itemId: "i", score: .8, mistakeTags: [], evidenceStatus: "confirmed", rationale: "matched" }], evidence: ["i"], confidence: 1, evaluatorType: "claude_code_assisted", status: "final", version: "1.0", followUp: { required: false, recommendedActivityIds: [] }, evaluatedAt: "2024-01-01T00:00:00.000Z" }).success).toBe(true);
    expect(ProgressEventSchema.safeParse({ id: "override", studentId: "s", conceptId: "c", eventType: "human-override", evidenceStatus: "confirmed", previousState: { step: 1, status: "learning" }, newState: { step: 2, status: "learning" }, policyVersion: "1.0", reason: "Teacher review" , occurredAt: "2024-01-01T00:00:00.000Z" }).success).toBe(true);
    expect(CurriculumDefinitionSchema.safeParse({ schemaVersion: "1.0", subject: "math", title: "Math", concepts: [{ id: "c", subject: "math", title: "Count", description: "Count things.", step: 0, prerequisites: [], readinessConceptIds: [], activityKinds: ["number-choice"] }] }).success).toBe(true);
  });
});
