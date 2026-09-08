import { describe, expect, it } from "vitest";
import { generateAdditionWithinTen, generateAdditionWithinTwenty, generateEnglishBeginningSounds, generateSubtractionWithinTwenty, generateTeenNumbers, generateEqualGroups, generateFairSharing, generateHandwritingWriting, generateReadingForDetail, generateReasoningClassifyAndExplain, generateReasoningSequenceAndPattern, generateScienceObserveAndDescribe, generateScienceSortLivingThings, generateScienceObservation, ACTIVITY_GENERATORS, scoreResponse, scoreSubmission, projectProgression, projectStudentConceptState, reviewSchedule, rankRecommendations } from "./index.js";
import type { ProgressEvent, StudentConceptState } from "@child-learning/contracts";

const state: StudentConceptState = { studentId: "s1", conceptId: "math.addition-within-10", step: 2, status: "learning", recentScores: [], updatedAt: "2024-01-01T00:00:00.000Z" };
const event = (id: string, score: number, date: string): ProgressEvent => ({ id, studentId: "s1", conceptId: state.conceptId, evaluationId: `e-${id}`, score, eventType: "observation", comparable: true, evidenceStatus: "confirmed", occurredAt: date });

describe("deterministic generators", () => {
  it("repeats an addition activity for the same seed and stays within ten", () => {
    const a = generateAdditionWithinTen({ seed: 42, now: "2024-01-01T00:00:00.000Z" });
    const b = generateAdditionWithinTen({ seed: 42, now: "2024-01-01T00:00:00.000Z" });
    expect(a).toEqual(b);
    expect(a.items.every((item) => item.kind === "picture-addition-subtraction" && item.result <= 10)).toBe(true);
    expect(a).toMatchObject({ studentId: "unassigned", generator: { name: "addition-within-10", version: "1.0" }, activityType: "practice" });
    expect(a.items).toHaveLength(20);
    expect(new Set(a.items.map((item) => item.id)).size).toBe(20);
    expect(a.comparabilityKey).toContain("items:20");
    expect(a.childGuide?.example?.prompt).toBeTruthy();
  });
  it("defaults every generator to twenty unique items and honors overrides", () => {
    for (const generate of [generateAdditionWithinTen, generateEnglishBeginningSounds, generateHandwritingWriting, generateReadingForDetail, generateScienceObservation]) {
      const activity = generate({ seed: 7 });
      expect(activity.items).toHaveLength(20);
      expect(new Set(activity.items.map((item) => item.id)).size).toBe(20);
      expect(activity.childGuide?.conceptSummary).toBeTruthy();
      expect(generate({ seed: 7, itemCount: 7 }).items).toHaveLength(7);
    }
    expect(generateEnglishBeginningSounds({ seed: 7 })).toEqual(generateEnglishBeginningSounds({ seed: 7 }));
  });
  it("covers every registered pack with validated, child-safe output", () => {
    const identifiers = ["math.counting-to-10", "math.addition-within-10", "math.subtraction-within-10", "math.teen-numbers", "math.addition-within-20", "math.subtraction-within-20", "math.equal-groups", "math.fair-sharing", "english.beginning-sounds", "english.letter-formation", "english.reading-for-detail", "reasoning.sequence-and-pattern", "reasoning.classify-and-explain", "science.observe-and-describe", "science.sort-living-things"];
    for (const identifier of identifiers) {
      const activity = ACTIVITY_GENERATORS[identifier]!({ seed: 88, studentId: "s1", now: "2024-01-01T00:00:00.000Z", itemCount: 2 });
      expect(activity.generator?.name).toBeTruthy();
      expect(activity.sourceMetadata.origin).toBe("original");
      expect(activity.comparabilityKey).toContain("items:2");
    }
  });
  it("keeps subjective packs review-gated", () => {
    expect(generateHandwritingWriting({ seed: 1 }).items.every((item) => item.kind === "handwriting-writing" && item.mode && item.rubricId)).toBe(true);
    expect(generateReadingForDetail({ seed: 1 }).items.some((item) => item.kind === "reading-comprehension" && !item.choices)).toBe(true);
    expect(generateScienceObservation({ seed: 1 }).scoring.method).toBe("observation");
  });
  it("produces concrete equal groups and fair shares", () => {
    for (const activity of [generateEqualGroups({ seed: 1 }), generateFairSharing({ seed: 1 })]) {
      expect(activity.items.every((item) => item.kind === "equal-groups-fair-sharing" && item.total === item.groupCount * item.amountPerGroup)).toBe(true);
    }
  });
  it("extends the pathway through teen numbers and operations within twenty", () => {
    const teen = generateTeenNumbers({ seed: 5, itemCount: 6, representationStage: "pictorial" });
    expect(teen.items.every((item) => item.kind === "number-choice" && Number(item.metadata.dotCount) >= 11 && Number(item.metadata.dotCount) <= 20)).toBe(true);
    const additionPictures = generateAdditionWithinTwenty({ seed: 6, itemCount: 5, representationStage: "pictorial" });
    expect(additionPictures.items.every((item) => item.kind === "picture-addition-subtraction" && item.result <= 20)).toBe(true);
    expect(generateAdditionWithinTwenty({ seed: 6, representationStage: "abstract" }).items.every((item) => item.kind === "equation" && item.answer <= 20)).toBe(true);
    expect(generateSubtractionWithinTwenty({ seed: 7, representationStage: "abstract" }).items.every((item) => item.kind === "equation" && item.answer >= 0)).toBe(true);
  });
  it("normalizes negative science seeds without losing prompt selection", () => {
    const activity = generateScienceObserveAndDescribe({ seed: -1, itemCount: 8 });
    expect(activity.items).toHaveLength(8);
    expect(activity.items.every((item) => item.conceptId === activity.conceptId && item.prompt.length > 0)).toBe(true);
    expect(activity.items.every((item) => item.kind === "science-observation")).toBe(true);
  });
  it("keeps concept-native reasoning and science packs pure and readiness-gated", () => {
    const sequence = generateReasoningSequenceAndPattern({ seed: 3, itemCount: 6 });
    const classify = generateReasoningClassifyAndExplain({ seed: 3, itemCount: 6 });
    const observe = generateScienceObserveAndDescribe({ seed: 3, itemCount: 6 });
    const sort = generateScienceSortLivingThings({ seed: 3, itemCount: 6 });
    expect(sequence.items.every((item) => item.kind === "sequencing-reasoning" && item.conceptId === sequence.conceptId && item.reasoningType !== "classification")).toBe(true);
    expect(classify.items.every((item) => item.kind === "sequencing-reasoning" && item.conceptId === classify.conceptId && item.reasoningType === "classification")).toBe(true);
    expect(observe.items.every((item) => item.conceptId === observe.conceptId)).toBe(true);
    expect(sort.items.every((item) => item.conceptId === sort.conceptId)).toBe(true);
    expect(sequence.prerequisiteConceptIds).toEqual([]);
    expect(classify.prerequisiteConceptIds).toEqual(["reasoning.sequence-and-pattern"]);
    expect(observe.prerequisiteConceptIds).toEqual([]);
    expect(sort.prerequisiteConceptIds).toEqual(["science.observe-and-describe"]);
  });
  it("cycles every original reading passage while alternating selected and written responses", () => {
    const passages = new Set<string>();
    for (const seed of [-9, -1, 0, 1, 2, 3, 4]) {
      const activity = generateReadingForDetail({ seed, itemCount: 8 });
      activity.items.forEach((item, index) => {
        if (item.kind !== "reading-comprehension") throw new Error("unexpected item kind");
        passages.add(item.passage);
        expect(Boolean(item.choices)).toBe(index % 2 === 0);
      });
    }
    expect(passages.size).toBe(4);
  });
});

describe("scoring and progression", () => {
  it("scores generated integer answers deterministically", () => {
    const activity = generateAdditionWithinTen({ seed: 4 });
    const item = activity.items.find((candidate) => candidate.kind === "picture-addition-subtraction")!;
    const submission = { id: "sub", activityId: activity.id, studentId: "s1", responses: [{ itemId: item.id, value: item.result, capturedAt: "2024-01-01T00:00:00.000Z" }], submittedAt: "2024-01-01T00:00:00.000Z" };
    expect(scoreResponse(activity, item.id, item.result).score).toBe(1);
    expect(scoreSubmission(activity, submission).score).toBeGreaterThan(0);
  });
  it("labels subjective scoring as a review-gated precheck rather than a completed evaluation", () => {
    const activity = generateHandwritingWriting({ seed: 1, studentId: "s1" });
    const evaluation = scoreSubmission(activity, { id: "subjective", activityId: activity.id, studentId: "s1", responses: [], submittedAt: "2024-01-01T00:00:00.000Z" });
    expect(evaluation).toMatchObject({ status: "needs-human-review", evaluatorType: "review_gated_precheck", confidence: 0.4 });
    expect(evaluation.items.every((item) => item.evidenceStatus === "unconfirmed")).toBe(true);
  });
  it("advances only one step after three comparable high results", () => {
    const result = projectProgression(state, [event("1", .95, "2024-01-01T00:00:00.000Z"), event("2", .92, "2024-01-02T00:00:00.000Z"), event("3", .9, "2024-01-03T00:00:00.000Z")]);
    expect(result).toMatchObject({ step: 3, status: "learning", decision: "advance" });
    expect(result.reason).toContain("previous step is secure");
  });
  it("consumes a high window once and waits for a fresh difficulty window", () => {
    let current = state;
    const observations: ProgressEvent[] = [];
    for (let index = 0; index < 6; index += 1) {
      observations.push(event(String(index + 1), 0.95, `2024-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`));
      const projection = projectProgression(current, observations);
      current = projectStudentConceptState(current, observations);
      if (index < 3) expect(projection.step).toBe(index === 2 ? 3 : 2);
      if (index >= 3) expect(projection.step).toBe(3);
    }
    expect(current.step).toBe(3);
  });
  it("allows the next controlled step only after three observations at a new difficulty", () => {
    let current = state;
    const observations: ProgressEvent[] = [];
    for (let index = 0; index < 3; index += 1) {
      observations.push({ ...event(`old-${index}`, 0.95, `2024-02-0${index + 1}T00:00:00.000Z`), comparabilityKey: "difficulty-2" });
      current = projectStudentConceptState(current, observations);
    }
    expect(current.step).toBe(3);
    for (let index = 0; index < 3; index += 1) {
      observations.push({ ...event(`new-${index}`, 0.95, `2024-02-1${index + 1}T00:00:00.000Z`), comparabilityKey: "difficulty-3" });
      const projection = projectProgression(current, observations);
      current = projectStudentConceptState(current, observations);
      expect(projection.step).toBe(index === 2 ? 4 : 3);
    }
  });
  it("does not change for ambiguous evidence", () => {
    expect(projectProgression(state, [{ ...event("1", .2, "2024-01-01T00:00:00.000Z"), evidenceStatus: "ambiguous" }]).step).toBe(2);
  });
  it("does not let a single 90% result mark the concept secure", () => {
    const result = projectProgression(state, [event("1", .95, "2024-01-01T00:00:00.000Z")]);
    expect(result).toMatchObject({ step: 2, status: "learning", decision: "maintain" });
    expect(result.reason).toContain("three consecutive");
  });
  it("only uses scored confirmed observation events", () => {
    const result = projectProgression(state, [
      { ...event("override", .99, "2024-01-01T00:00:00.000Z"), eventType: "human-override", previousState: { step: 2, status: "learning" }, newState: { step: 3, status: "learning" } },
      { ...event("decision", .99, "2024-01-02T00:00:00.000Z"), eventType: "state-decision" },
    ]);
    expect(result.step).toBe(2);
  });
  it("uses deterministic spaced reviews", () => {
    expect(reviewSchedule("2024-01-01T00:00:00.000Z", "2024-01-08T00:00:00.000Z").map((r) => r.due)).toEqual([true, true, false, false]);
  });
});

describe("recommendations", () => {
  it("uses session length, recent repetition, subject balance, and adult goals", () => {
    const math = generateAdditionWithinTen({ seed: 10, itemCount: 5 });
    const english = generateEnglishBeginningSounds({ seed: 11, itemCount: 2 });
    const states = [{ studentId: "s1", conceptId: "math.counting-to-10", step: 0, status: "secure" as const, recentScores: [1], updatedAt: "2024-01-01T00:00:00.000Z" }];
    const shortSession = rankRecommendations([math, english], { studentId: "s1", now: "2024-01-02T00:00:00.000Z", states, availableMinutes: 5, recentActivities: [{ id: math.id, subject: math.subject, conceptId: math.conceptId }, { id: math.id, subject: math.subject, conceptId: math.conceptId }] });
    expect(shortSession.selectedActivityId).toBe(english.id);
    expect(shortSession.candidates.find((candidate) => candidate.activityId === math.id)?.reasons.some((reason) => reason.code === "recent-repetition")).toBe(true);
    const adultGoal = rankRecommendations([math, english], { studentId: "s1", now: "2024-01-02T00:00:00.000Z", states, availableMinutes: 5, adultGoalConceptIds: [math.conceptId] });
    expect(adultGoal.selectedActivityId).toBe(math.id);
    expect(adultGoal.conciseReason).toContain("adult");
  });

  it("ranks due or revisit work before unrelated work", () => {
    const dueActivity = generateAdditionWithinTen({ seed: 1 });
    const other = generateEnglishBeginningSounds({ seed: 1 });
    const recommendation = rankRecommendations([other, dueActivity], { studentId: "s1", now: "2024-01-09T00:00:00.000Z", states: [{ ...state, lastReviewedAt: "2024-01-01T00:00:00.000Z" }, { studentId: "s1", conceptId: "math.counting-to-10", step: 0, status: "secure", recentScores: [], updatedAt: "2024-01-01T00:00:00.000Z" }] });
    expect(recommendation.candidates[0]?.activityId).toBe(dueActivity.id);
    expect(recommendation.selectedActivityId).toBe(dueActivity.id);
    expect(recommendation.conciseReason).toContain("Review is due");
    expect(recommendation.candidates[0]?.reasons.length).toBeGreaterThan(0);
  });
});
