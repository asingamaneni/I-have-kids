import { describe, expect, it } from "vitest";
import { ActivityItemSchema, ActivitySpecSchema, CurriculumDefinitionSchema, EvaluationSchema, ProgressEventSchema, StudentSchema, toChildActivitySpec } from "./index.js";

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
    ];
    expect(items.every((item) => ActivityItemSchema.safeParse(item).success)).toBe(true);
  });
  it("keeps activity specs versioned and rejects unknown item kinds", () => {
    const activity = { schemaVersion: "1.0", id: "a", subject: "math", conceptId: "c", title: "A", items: [{ id: "i", conceptId: "c", kind: "number-choice", prompt: "Pick", choices: [1, 2], correctChoice: 1 }], answerSpecs: { i: { type: "integer", expected: 1 } }, scoring: { method: "exact" }, createdAt: "2024-01-01T00:00:00.000Z" };
    expect(ActivitySpecSchema.safeParse(activity).success).toBe(true);
    expect(ActivityItemSchema.safeParse({ ...activity.items[0], kind: "made-up" }).success).toBe(false);
  });
  it("removes answer contracts and hidden item answers from child activity data", () => {
    const activity = ActivitySpecSchema.parse({ schemaVersion: "1.0", id: "a", studentId: "s", subject: "math", conceptId: "c", title: "A", representationStage: "concrete", deliveryMode: "hands-on", evidencePurpose: "exploration", presentation: { materials: ["counters"], childInvitation: "Try it.", steps: ["Move the counters."], adultGuide: "Private adult guidance.", observationPrompt: "Private observation criteria." }, items: [{ id: "i", conceptId: "c", kind: "number-choice", prompt: "Pick", choices: [1, 2], correctChoice: 1 }], answerSpecs: { i: { type: "choice", expected: "1" } }, scoring: { method: "exact" }, createdAt: "2024-01-01T00:00:00.000Z" });
    const child = toChildActivitySpec({ ...activity, items: [{ ...activity.items[0]!, metadata: { answer: "secret", dotCount: 2 } }] });
    expect(child).not.toHaveProperty("answerSpecs");
    expect(child.items[0]).not.toHaveProperty("correctChoice");
    expect(child.items[0]?.metadata).toEqual({ dotCount: 2 });
    expect(child.presentation).toEqual({ materials: ["counters"], childInvitation: "Try it.", steps: ["Move the counters."] });
    expect(child.presentation).not.toHaveProperty("adultGuide");
    expect(child.presentation).not.toHaveProperty("observationPrompt");
  });

  it("validates student, evaluation, and curriculum documents", () => {
    expect(StudentSchema.safeParse({ id: "s", displayName: "A", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }).success).toBe(true);
    expect(EvaluationSchema.safeParse({ id: "e", submissionId: "sub", studentId: "s", conceptId: "c", score: .8, items: [{ itemId: "i", score: .8, mistakeTags: [], evidenceStatus: "confirmed", rationale: "matched" }], evidence: ["i"], confidence: 1, evaluatorType: "claude_code_assisted", status: "final", version: "1.0", followUp: { required: false, recommendedActivityIds: [] }, evaluatedAt: "2024-01-01T00:00:00.000Z" }).success).toBe(true);
    expect(ProgressEventSchema.safeParse({ id: "override", studentId: "s", conceptId: "c", eventType: "human-override", evidenceStatus: "confirmed", previousState: { step: 1, status: "learning" }, newState: { step: 2, status: "learning" }, policyVersion: "1.0", reason: "Teacher review" , occurredAt: "2024-01-01T00:00:00.000Z" }).success).toBe(true);
    expect(CurriculumDefinitionSchema.safeParse({ schemaVersion: "1.0", subject: "math", title: "Math", concepts: [{ id: "c", subject: "math", title: "Count", description: "Count things.", step: 0, prerequisites: [], readinessConceptIds: [], activityKinds: ["number-choice"] }] }).success).toBe(true);
  });
});
