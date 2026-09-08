import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalService } from "../../../packages/mcp-server/src/service.ts";

describe("web application service flows", () => {
  it("persists generated activities and digital evidence through the local service", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-worktable-"));
    const service = createLocalService({ projectRoot: root, databasePath: join(root, "learning.db"), artifactsDir: join(root, "artifacts"), clock: () => "2026-01-01T00:00:00.000Z" });
    try {
      service.repo.saveStudent({ id: "student-test", displayName: "Test Student", grade: "School-age, mixed level" });
      const spec = service.generateActivity({ subject: "math", conceptId: "math.counting-to-10", seed: 401, studentId: "student-test", itemCount: 2 });
      const stored = await service.validateAndStoreActivity(spec);
      expect(service.repo.listActivities("student-test")).toHaveLength(1);
      const submission = await service.recordDigitalSubmission({ id: "submission-test", activityId: spec.id, studentId: "student-test", responses: spec.items.map((item) => ({ itemId: item.id, value: spec.answerSpecs[item.id]?.type === "integer" ? spec.answerSpecs[item.id].expected : "", capturedAt: "2026-01-01T00:00:00.000Z" })), submittedAt: "2026-01-01T00:00:00.000Z" });
      expect((submission as { progress: { state: { recentScores: number[] } } }).progress.state.recentScores).toHaveLength(0);
      expect((submission as { unlockedActivity?: { activity?: { representationStage?: string } } }).unlockedActivity?.activity?.representationStage).toBe("pictorial");
      expect(service.repo.progressHistory("student-test")[0]).toMatchObject({ comparable: 0, evidence_status: "confirmed" });
      expect((service.getLearningPath("student-test") as { availability: Array<{ conceptId: string; currentStage: string }> }).availability.find((concept) => concept.conceptId === "math.counting-to-10")?.currentStage).toBe("pictorial");
      const report = await service.generateProgressReport("student-test", "2026-01-01T00:00:00.000Z");
      expect((report.report as { worksheetSummaries: Array<{ submissionId: string }>; learningPath: unknown[] }).worksheetSummaries).toEqual([expect.objectContaining({ submissionId: "submission-test" })]);
      expect((report.report as { learningPath: unknown[] }).learningPath.length).toBeGreaterThan(0);
      const reportLineage = await service.getArtifactLineage((report.artifact as { id: string }).id);
      expect((reportLineage.parents as unknown[]).length).toBeGreaterThanOrEqual(2);
      const lineage = await service.getArtifactLineage(stored.artifact.id);
      expect(lineage.children).toHaveLength(1);
    } finally { service.close(); await rm(root, { recursive: true, force: true }); }
  });

  it("opens only a concrete early introduction and stores worksheet lineage", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-worktable-"));
    const service = createLocalService({ projectRoot: root, databasePath: join(root, "learning.db"), artifactsDir: join(root, "artifacts"), clock: () => "2026-01-01T00:00:00.000Z" });
    try {
      service.repo.saveStudent({ id: "student-test", displayName: "Test Student", grade: "School-age, mixed level" });
      expect((service.getLearningPath("student-test") as { availability: Array<{ conceptId: string; status: string }> }).availability.find((concept) => concept.conceptId === "math.subtraction-within-10")?.status).toBe("locked");
      await service.applyLearningDirective({ id: "directive-test", studentId: "student-test", conceptId: "math.subtraction-within-10", action: "introduce", reason: "The child separates counters during play.", authorId: "adult-test", requestedStage: "concrete" });
      const spec = service.generateActivity({ conceptId: "math.subtraction-within-10", seed: 91, studentId: "student-test", itemCount: 2, representationStage: "concrete" });
      const stored = await service.validateAndStoreActivity(spec);
      expect(spec).toMatchObject({ representationStage: "concrete", deliveryMode: "hands-on", evidencePurpose: "exploration" });
      await service.storeActivityRender({ activityId: spec.id, bytes: new TextEncoder().encode("<main>original worksheet render</main>"), mediaType: "text/html", fileExtension: ".html", renderKind: "worksheet-html" });
      const lineage = await service.getArtifactLineage((stored.artifact as { id: string }).id);
      expect(lineage).toMatchObject({ authoritativeSource: "sqlite" });
      expect((lineage.children as Array<{ relation: string }>).some((edge) => edge.relation === "generated-from")).toBe(true);
    } finally { service.close(); await rm(root, { recursive: true, force: true }); }
  });

  it("applies an override to current state and creates an exact report snapshot", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-worktable-"));
    const service = createLocalService({ projectRoot: root, databasePath: join(root, "learning.db"), artifactsDir: join(root, "artifacts"), clock: () => "2026-01-01T00:00:00.000Z" });
    try {
      service.repo.saveStudent({ id: "student-test", displayName: "Test Student", grade: "School-age, mixed level" });
      service.repo.saveConceptState({ studentId: "student-test", conceptId: "math.addition-within-10", step: 0, status: "new", recentScores: [] });
      const override = service.applyOverride({ id: "override-test", studentId: "student-test", conceptId: "math.addition-within-10", targetStep: 3, reason: "Adult observed consistent counting.", authorId: "adult-test" });
      expect((override as { newState: { step: number } }).newState.step).toBe(3);
      expect(service.getProgress("student-test", "math.addition-within-10").states[0]).toMatchObject({ step: 3 });
      const report = await service.generateProgressReport("student-test", "2026-01-01T00:00:00.000Z");
      const exact = service.db.prepare("SELECT id FROM report_snapshots WHERE id = ?").get((report.report as { id: string }).id);
      expect(exact).toBeTruthy();
    } finally { service.close(); await rm(root, { recursive: true, force: true }); }
  });
});
