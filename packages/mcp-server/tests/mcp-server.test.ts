import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createLocalService } from "../src/service.js";

async function withService(test: (service: ReturnType<typeof createLocalService>) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "kindergarten-mcp-"));
  const service = createLocalService({ projectRoot: root, databasePath: join(root, "learning.db"), artifactsDir: join(root, "artifacts"), clock: () => "2026-02-01T00:00:00.000Z" });
  try { await test(service); } finally { service.close(); await rm(root, { recursive: true, force: true }); }
}

describe("local MCP service", () => {
  it("uses adult-reported capabilities to choose diagnostics without recording mastery", async () => {
    await withService(async (service) => {
      const student = service.createStudent({ id: "student-baseline", displayName: "Baseline Learner", reportedCapabilities: ["math.adds-with-symbols"], baselineNotes: "Builds number stories with blocks.", baselineStatus: "diagnostic-in-progress" });
      expect(student).toMatchObject({ reportedCapabilities: ["math.adds-with-symbols"], baselineStatus: "diagnostic-in-progress" });
      expect(service.getProgress(student.id).states).toHaveLength(0);
      service.applyLearningDirective({ id: "baseline-directive", studentId: student.id, conceptId: "math.addition-within-10", action: "assess", reason: "Verify the reported capability.", authorId: "adult", requestedStage: "abstract" });
      const path = service.getLearningPath(student.id) as { availability: Array<{ conceptId: string; status: string; currentStage: string; priority: number; reason: string }> };
      expect(path.availability.find((concept) => concept.conceptId === "math.addition-within-10")).toMatchObject({ status: "available", currentStage: "abstract", priority: 5 });
      expect(path.availability.find((concept) => concept.conceptId === "math.addition-within-10")?.reason).toContain("does not count as mastery");
      expect(service.getProgress(student.id).states).toHaveLength(0);
    });
  });

  it("initializes idempotently and protects child activity output", async () => {
    await withService(async (service) => {
      await service.initializeDemo("2026-02-01T00:00:00.000Z");
      const first = service.demoStatus();
      await service.initializeDemo("2026-02-01T00:00:00.000Z");
      const second = service.demoStatus();
      expect(second.students).toBe(first.students);
      expect(second.activities).toBe(first.activities);
      const child = service.getActivity("activity-addition-01");
      const adult = service.getActivity("activity-addition-01", true);
      expect(child).not.toHaveProperty("answerSpecs");
      expect((child.items as Array<Record<string, unknown>>)[0]).not.toHaveProperty("result");
      expect(adult).toHaveProperty("answerSpecs");
      expect((adult.items as Array<Record<string, unknown>>)[0]).toHaveProperty("result");
    });
  });

  it("validates proposed specs, scores submissions, and appends progress", async () => {
    await withService(async (service) => {
      await service.initializeDemo("2026-02-01T00:00:00.000Z");
      const generated = service.generateActivity({ subject: "math", seed: 77, studentId: "student-demo-ava", itemCount: 2, now: "2026-02-01T00:00:00.000Z" });
      const subtraction = service.generateActivity({ conceptId: "math.subtraction-within-10", seed: 78, studentId: "student-demo-ava", itemCount: 2, now: "2026-02-01T00:00:00.000Z" });
      const science = service.generateActivity({ generator: "science.observe-and-describe", seed: 79, studentId: "student-demo-ava", itemCount: 2, now: "2026-02-01T00:00:00.000Z" });
      expect(subtraction.conceptId).toBe("math.subtraction-within-10");
      expect(science.scoring.method).toBe("observation");
      await service.validateAndStoreActivity(generated);
      const result = await service.recordDigitalSubmission({ id: "mcp-submission-1", activityId: generated.id, studentId: "student-demo-ava", responses: generated.items.map((item) => ({ itemId: item.id, value: generated.answerSpecs[item.id]?.type === "integer" ? generated.answerSpecs[item.id].expected : "wrong", capturedAt: "2026-02-01T00:00:00.000Z" })) });
      expect(result.evaluation).toHaveProperty("score", 1);
      expect(service.getProgress("student-demo-ava", generated.conceptId).history.length).toBeGreaterThan(0);
      await expect(service.validateAndStoreActivity({ ...generated, answerSpecs: { [generated.items[0]!.id]: { type: "integer", expected: 999 } } })).rejects.toThrow(/answerSpecs|answer does not match/);
    });
  });

  it("keeps assisted evaluation reviewable and overrides append-only", async () => {
    await withService(async (service) => {
      await service.initializeDemo("2026-02-01T00:00:00.000Z");
      await service.recordDigitalSubmission({ id: "mcp-submission-upload", activityId: "activity-addition-01", studentId: "student-demo-ava", responses: [] });
      const beforeProposal = service.getProgress("student-demo-ava", "math.addition-within-10");
      const proposed = await service.proposeUploadedWorkEvaluation({ submissionId: "mcp-submission-upload", evidence: ["photo: visible numeral"], confidence: 0.72 });
      expect(proposed.requiresHumanReview).toBe(true);
      const proposalId = (proposed.evaluation as { id: string }).id;
      const originalRow = service.db.prepare("SELECT evaluation_json FROM evaluations WHERE id = ?").get(proposalId);
      expect(service.getProgress("student-demo-ava", "math.addition-within-10").history.length).toBe(beforeProposal.history.length);
      const confirmed = await service.confirmEvaluation({ evaluationId: proposalId, reviewerId: "adult-1", score: 0.8, rationale: "Adult verified eight of ten responses." });
      expect(confirmed.originalEvaluationId).toBe(proposalId);
      expect(service.getProgress("student-demo-ava", "math.addition-within-10").history.length).toBe(beforeProposal.history.length + 1);
      expect(confirmed).toHaveProperty("artifact");
      const lineage = await service.getArtifactLineage((confirmed.artifact as { id: string }).id);
      expect((lineage.parents as Array<{ artifactId?: string; childArtifactId?: string }>).length).toBeGreaterThan(0);
      expect(originalRow).toBeDefined();
      const originalAfter = service.db.prepare("SELECT evaluation_json FROM evaluations WHERE id = ?").get(proposalId);
      expect(originalAfter).toEqual(originalRow);

      const beforeOverrideHistory = service.getProgress("student-demo-ava", "math.addition-within-10").history as Array<{ event_type: string }>;
      const stateBeforeOverride = (service.getProgress("student-demo-ava", "math.addition-within-10").states as Array<{ step: number; status: string }>)[0]!;
      const override = service.applyOverride({ id: "override-1", studentId: "student-demo-ava", conceptId: "math.addition-within-10", targetStep: 2, reason: "Teacher reviewed work", authorId: "adult-1" });
      expect((service.getProgress("student-demo-ava", "math.addition-within-10").states as Array<{ step: number }>)[0]!.step).toBe(2);
      const reversed = service.reverseOverride({ id: "override-2", studentId: "student-demo-ava", conceptId: "math.addition-within-10", targetId: String(override.id), reason: "Correction", authorId: "adult-1" });
      expect((reversed.newState as { step: number }).step).toBe(stateBeforeOverride.step);
      expect((service.getProgress("student-demo-ava", "math.addition-within-10").states as Array<{ step: number }>)[0]!.step).toBe(stateBeforeOverride.step);
      const history = service.getProgress("student-demo-ava", "math.addition-within-10").history as Array<{ event_type: string }>;
      expect(history.filter((entry) => entry.event_type === "human-override").length).toBe(beforeOverrideHistory.filter((entry) => entry.event_type === "human-override").length + 2);
    });
  });

  it("rejects assisted evaluation without changing graded state", async () => {
    await withService(async (service) => {
      await service.initializeDemo("2026-02-01T00:00:00.000Z");
      await service.recordDigitalSubmission({ id: "mcp-reject-submission", activityId: "activity-addition-01", studentId: "student-demo-ava", responses: [] });
      const before = service.getProgress("student-demo-ava", "math.addition-within-10");
      const proposed = await service.proposeUploadedWorkEvaluation({ submissionId: "mcp-reject-submission", evidence: ["photo: unclear"], confidence: 0.2 });
      const rejected = await service.rejectEvaluation({ evaluationId: (proposed.evaluation as { id: string }).id, reviewerId: "adult-2", reason: "Image is not legible." });
      const after = service.getProgress("student-demo-ava", "math.addition-within-10");
      expect(after.states).toEqual(before.states);
      expect(after.history.length).toBe(before.history.length + 1);
      expect(rejected.gradedStateChanged).toBe(false);
      expect((after.history.at(-1) as { event_type: string; comparable: number }).event_type).toBe("review");
      expect((after.history.at(-1) as { comparable: number }).comparable).toBe(0);
    });
  });

  it("stores only allow-listed local semantic SVG shapes", async () => {
    await withService(async (service) => {
      const artifact = await service.composeVisualAsset({ width: 100, height: 100, shapes: [{ kind: "circle", x: 20, y: 20, radius: 10 }] });
      expect(artifact.mediaType).toBe("image/svg+xml");
      await expect(service.composeVisualAsset({ shapes: [{ kind: "script", text: "network" }] })).rejects.toThrow(/unsupported semantic shape/);
    });
  });
});
