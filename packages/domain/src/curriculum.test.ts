import { describe, expect, it } from "vitest";
import math from "../../../curriculum/math.json";
import { CurriculumDefinitionSchema, type LearningDirective, type ProgressEvent, type StudentConceptState } from "@child-learning/contracts";
import { DEFAULT_CURRICULUM, deriveConceptAvailability, filterAvailableActivities, filterReadyActivities, generateAdditionWithinTen, validateCurriculumRegistry } from "./index.js";

const at = "2026-01-01T00:00:00.000Z";
const observation = (id: string, conceptId: string, stage: "concrete" | "pictorial" | "abstract", score = 1): ProgressEvent => ({ id, studentId: "s", conceptId, evaluationId: `evaluation-${id}`, score, eventType: "observation", comparable: stage !== "concrete", evidenceStatus: "confirmed", confidence: 1, comparabilityKey: `math|${conceptId}|stage:${stage}|purpose:${stage === "concrete" ? "exploration" : "mastery"}|difficulty:0`, occurredAt: at });
const stageEvidence = (conceptId: string, stage: "concrete" | "pictorial" | "abstract", count: number): ProgressEvent[] => Array.from({ length: count }, (_, index) => observation(`${conceptId}-${stage}-${index}`, conceptId, stage));

describe("curriculum readiness", () => {
  it("validates the complete runtime curriculum registry", () => {
    const registry = validateCurriculumRegistry(DEFAULT_CURRICULUM);
    expect(registry.has("math.addition-within-10")).toBe(true);
    expect(registry.has("math.subtraction-within-10")).toBe(true);
    expect(registry.has("math.teen-numbers")).toBe(true);
    expect(registry.has("math.addition-within-20")).toBe(true);
    expect(registry.has("math.subtraction-within-20")).toBe(true);
    expect(registry.get("math.addition-within-10")?.stages.map((stage) => stage.stage)).toEqual(["concrete", "pictorial", "abstract"]);
  });

  it("keeps the legacy readiness helper strict instead of treating a difficulty step as mastery", () => {
    const definition = CurriculumDefinitionSchema.parse(math);
    const activity = generateAdditionWithinTen({ seed: 1, representationStage: "pictorial" });
    const steppedState: StudentConceptState = { studentId: "s", conceptId: "math.counting-to-10", step: 2, status: "learning", recentScores: [0.7], updatedAt: at };
    expect(filterReadyActivities([activity], definition, [steppedState])).toHaveLength(0);
    expect(filterReadyActivities([activity], definition, [{ ...steppedState, status: "secure" }])).toHaveLength(1);
  });

  it("requires evidence for every configured stage even when an older projection was secure", () => {
    const priorState: StudentConceptState = { studentId: "s", conceptId: "math.addition-within-10", step: 2, status: "secure", recentScores: [1], updatedAt: at };
    const path = deriveConceptAvailability({ states: [priorState], events: [observation("add-concrete", "math.addition-within-10", "concrete")], now: at });
    expect(path.find((concept) => concept.conceptId === "math.addition-within-10")).toMatchObject({ status: "active", currentStage: "pictorial" });
  });

  it("moves from concrete to pictorial to abstract and then opens subtraction", () => {
    const countingEvidence = [observation("count-concrete", "math.counting-to-10", "concrete"), ...stageEvidence("math.counting-to-10", "pictorial", 3)];
    let path = deriveConceptAvailability({ states: [], events: countingEvidence, now: at });
    expect(path.find((concept) => concept.conceptId === "math.counting-to-10")?.status).toBe("secure");
    expect(path.find((concept) => concept.conceptId === "math.addition-within-10")).toMatchObject({ status: "available", currentStage: "concrete" });

    const additionPictorial = [observation("add-concrete", "math.addition-within-10", "concrete"), ...stageEvidence("math.addition-within-10", "pictorial", 3)];
    path = deriveConceptAvailability({ states: [], events: [...countingEvidence, ...additionPictorial], now: at });
    expect(path.find((concept) => concept.conceptId === "math.addition-within-10")).toMatchObject({ status: "active", currentStage: "abstract" });
    expect(path.find((concept) => concept.conceptId === "math.subtraction-within-10")?.status).toBe("locked");

    path = deriveConceptAvailability({ states: [], events: [...countingEvidence, ...additionPictorial, ...stageEvidence("math.addition-within-10", "abstract", 3)], now: at });
    expect(path.find((concept) => concept.conceptId === "math.addition-within-10")?.status).toBe("secure");
    expect(path.find((concept) => concept.conceptId === "math.subtraction-within-10")).toMatchObject({ status: "available", currentStage: "concrete" });
  });

  it("lets an adult introduce a locked concept early without pretending prerequisites are mastered", () => {
    const directive: LearningDirective = { id: "directive-1", studentId: "s", conceptId: "math.subtraction-within-10", action: "introduce", reason: "The child is already separating real objects during play.", authorId: "adult", requestedStage: "concrete", createdAt: at };
    const path = deriveConceptAvailability({ states: [], events: [], directives: [directive], now: at });
    expect(path.find((concept) => concept.conceptId === "math.subtraction-within-10")).toMatchObject({ status: "available", currentStage: "concrete", introducedEarly: true });
    expect(path.find((concept) => concept.conceptId === "math.addition-within-10")?.status).not.toBe("secure");
    const concrete = generateAdditionWithinTen({ seed: 2, representationStage: "concrete" });
    const abstract = generateAdditionWithinTen({ seed: 2, representationStage: "abstract" });
    const additionAvailability = path.find((concept) => concept.conceptId === "math.addition-within-10")!;
    expect(filterAvailableActivities([concrete, abstract], [{ ...additionAvailability, status: "available", currentStage: "concrete" }])).toEqual([concrete]);
  });

  it("treats deferment as a hard exclusion", () => {
    const directive: LearningDirective = { id: "directive-2", studentId: "s", conceptId: "math.counting-to-10", action: "defer", reason: "Pause number work this week.", authorId: "adult", createdAt: at };
    const path = deriveConceptAvailability({ states: [], events: [], directives: [directive], now: at });
    const counting = generateAdditionWithinTen({ seed: 4, representationStage: "concrete" });
    expect(path.find((concept) => concept.conceptId === "math.counting-to-10")?.status).toBe("deferred");
    expect(filterAvailableActivities([{ ...counting, conceptId: "math.counting-to-10", prerequisiteConceptIds: [] }], path)).toHaveLength(0);
  });
});
