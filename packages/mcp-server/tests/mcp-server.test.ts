import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createLocalService, resolveProjectRoot } from "../src/service.js";

async function withService(test: (service: ReturnType<typeof createLocalService>) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "kindergarten-mcp-"));
  const service = createLocalService({ projectRoot: root, databasePath: join(root, "learning.db"), artifactsDir: join(root, "artifacts"), clock: () => "2026-02-01T00:00:00.000Z" });
  try { await test(service); } finally { service.close(); await rm(root, { recursive: true, force: true }); }
}

describe("local MCP service", () => {
  it("shares one workspace database between the web app and Claude Code", async () => {
    const root = await mkdtemp(join(tmpdir(), "kindergarten-shared-data-"));
    try {
      await writeFile(join(root, "pnpm-workspace.yaml"), "packages: []\n");
      const legacyDatabase = join(root, "apps/web/.data/learning-worktable.db");
      const legacyArtifacts = join(root, "apps/web/.data/artifacts");
      const webService = createLocalService({ projectRoot: root, databasePath: legacyDatabase, artifactsDir: legacyArtifacts, env: {} });
      webService.createStudent({ id: "shared-student", displayName: "Shared Student" });
      webService.close();
      expect(resolveProjectRoot({}, join(root, "apps/web"))).toBe(root);
      const claudeService = createLocalService({ projectRoot: root, env: {} });
      expect(claudeService.demoStatus()).toMatchObject({ dataLocation: "legacy-web", databasePath: legacyDatabase, artifactsDir: legacyArtifacts });
      expect(claudeService.listStudents()).toEqual([expect.objectContaining({ id: "shared-student" })]);
      claudeService.close();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("uses the workspace data directory for both new web and Claude processes", async () => {
    const root = await mkdtemp(join(tmpdir(), "kindergarten-workspace-data-"));
    try {
      await writeFile(join(root, "pnpm-workspace.yaml"), "packages: []\n");
      const webRoot = resolveProjectRoot({}, join(root, "apps/web"));
      const webService = createLocalService({ projectRoot: webRoot, env: {} });
      webService.createStudent({ id: "workspace-student", displayName: "Workspace Student" });
      expect(webService.demoStatus()).toMatchObject({ dataLocation: "workspace", databasePath: join(root, ".data/learning-worktable.db"), artifactsDir: join(root, ".data/artifacts") });
      webService.close();

      const claudeService = createLocalService({ projectRoot: root, env: {} });
      expect(claudeService.listStudents()).toEqual([expect.objectContaining({ id: "workspace-student" })]);
      claudeService.close();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("resolves configured relative data paths from the workspace root", async () => {
    const root = await mkdtemp(join(tmpdir(), "kindergarten-explicit-data-"));
    try {
      const service = createLocalService({ projectRoot: root, databasePath: "family/learning.db", artifactsDir: "family/artifacts", env: {} });
      expect(service.demoStatus()).toMatchObject({ dataLocation: "explicit", databasePath: join(root, "family/learning.db"), artifactsDir: join(root, "family/artifacts") });
      service.close();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("prefers child-learning environment names and preserves legacy fallbacks", async () => {
    const root = await mkdtemp(join(tmpdir(), "child-learning-env-"));
    try {
      const preferred = createLocalService({ projectRoot: root, env: { CHILD_LEARNING_DB_PATH: "preferred/learning.db", CHILD_LEARNING_ARTIFACTS_DIR: "preferred/artifacts", KINDERGARTEN_DB_PATH: "legacy/learning.db", KINDERGARTEN_ARTIFACTS_DIR: "legacy/artifacts" } });
      expect(preferred.demoStatus()).toMatchObject({ databasePath: join(root, "preferred/learning.db"), artifactsDir: join(root, "preferred/artifacts") });
      preferred.close();
      const legacy = createLocalService({ projectRoot: root, env: { KINDERGARTEN_DB_PATH: "legacy/learning.db", KINDERGARTEN_ARTIFACTS_DIR: "legacy/artifacts" } });
      expect(legacy.demoStatus()).toMatchObject({ databasePath: join(root, "legacy/learning.db"), artifactsDir: join(root, "legacy/artifacts") });
      legacy.close();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("uses adult-reported capabilities to choose diagnostics without recording mastery", async () => {
    await withService(async (service) => {
      const student = service.createStudent({ id: "student-baseline", displayName: "Baseline Learner", reportedCapabilities: ["math.adds-with-symbols"], baselineNotes: "Builds number stories with blocks.", baselineStatus: "diagnostic-in-progress" });
      expect(student).toMatchObject({ reportedCapabilities: ["math.adds-with-symbols"], baselineStatus: "diagnostic-in-progress" });
      expect(service.getProgress(student.id).states).toHaveLength(0);
      await service.applyLearningDirective({ id: "baseline-directive", studentId: student.id, conceptId: "math.addition-within-10", action: "assess", reason: "Verify the reported capability.", authorId: "adult", requestedStage: "abstract" });
      const path = service.getLearningPath(student.id) as { availability: Array<{ conceptId: string; status: string; currentStage: string; priority: number; reason: string }> };
      expect(path.availability.find((concept) => concept.conceptId === "math.addition-within-10")).toMatchObject({ status: "available", currentStage: "abstract", priority: 5 });
      expect(path.availability.find((concept) => concept.conceptId === "math.addition-within-10")?.reason).toContain("does not count as mastery");
      expect(service.getProgress(student.id).states).toHaveLength(0);
    });
  });

  it("removes expired adult directives from active learning and recommendation context", async () => {
    await withService(async (service) => {
      service.createStudent({ id: "expired-directive-student", displayName: "Expired Directive Learner", selectedSubjects: ["math"] });
      const result = await service.applyLearningDirective({ id: "expired-priority", studentId: "expired-directive-student", conceptId: "math.counting-to-10", action: "prioritize", reason: "A past short-term goal.", authorId: "adult", expiresAt: "2026-01-31T00:00:00.000Z" });
      expect((result.learningPath as { directives: unknown[] }).directives).toHaveLength(0);
      expect((service.getLearningPath("expired-directive-student") as { directives: unknown[] }).directives).toHaveLength(0);
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

  it("rejects submissions for activities outside the learner's current shelf", async () => {
    await withService(async (service) => {
      await service.initializeDemo("2026-02-01T00:00:00.000Z");
      await expect(service.recordDigitalSubmission({ id: "locked-submission", activityId: "activity-subtraction-01", studentId: "student-demo-ava", responses: [] })).rejects.toThrow(/not currently available/);
      expect(service.db.prepare("SELECT 1 FROM submissions WHERE id = ?").get("locked-submission")).toBeUndefined();
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

  it("requires adult approval before activating an open-ended subject graph", async () => {
    await withService(async (service) => {
      service.createStudent({ id: "student-roadmap", displayName: "Roadmap Learner", selectedSubjects: ["civics"] });
      const proposal = await service.proposeCurriculumRevision({ id: "proposal-communities", revision: { schemaVersion: "2.0", id: "communities-r1", packId: "communities", revision: 1, title: "Communities", description: "An original civics path.", subjects: [{ id: "civics", title: "Civics", description: "People, places, and communities." }], concepts: [{ id: "civics.communities", subject: "civics", title: "Communities", description: "Describe what communities share.", step: 0, activityKinds: ["selected-response"], templateIds: ["civics-communities-guided"], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }], edges: [], activityTemplates: [{ id: "civics-communities-guided", conceptId: "civics.communities", stage: "guided", title: "Communities", objectives: ["Identify something communities share."], instructions: ["Read the question. Choose one answer."], items: [{ id: "community-choice", conceptId: "civics.communities", kind: "selected-response", prompt: "Which place can be part of a community?", choices: ["a library", "the moon"], correctChoice: "a library", difficulty: 2 }], answerSpecs: { "community-choice": { type: "choice", expected: "a library" } }, scoring: { method: "exact" } }], provenance: { origin: "original" }, createdBy: "adult-author", createdAt: "2026-02-01T00:00:00.000Z" }, rationale: "Add the learner's requested civics subject.", basedOnRevisionIds: [], affectedStudentIds: ["student-roadmap"], createdBy: "adult-author" });
      expect((service.listCurriculum().subjects as Array<{ id: string }>).some((subject) => subject.id === "civics")).toBe(false);
      await expect(service.activateCurriculumRevision({ proposalId: "proposal-communities", actorId: "adult", reason: "Too early" })).rejects.toThrow(/approval/);
      service.decideCurriculumRevision({ proposalId: "proposal-communities", decision: "approved", reviewerId: "adult", note: "Original and appropriate." });
      await service.activateCurriculumRevision({ proposalId: "proposal-communities", actorId: "adult", reason: "Add the requested subject." });
      const roadmaps = service.getLearningRoadmaps("student-roadmap", true) as { roadmaps: Array<{ subject: string; nodes: unknown[] }> };
      expect(roadmaps.roadmaps).toEqual([expect.objectContaining({ subject: "civics" })]);
      expect(roadmaps.roadmaps[0]?.nodes).toHaveLength(1);
      const path = service.getLearningPath("student-roadmap") as { availability: Array<{ subject: string }> };
      expect(path.availability.every((concept) => concept.subject === "civics")).toBe(true);
      await expect(service.applyLearningDirective({ id: "bad-stage", studentId: "student-roadmap", conceptId: "civics.communities", action: "introduce", requestedStage: "missing-stage", reason: "Invalid stage test", authorId: "adult" })).rejects.toThrow(/does not define/);
      const activity = service.generateActivity({ studentId: "student-roadmap", conceptId: "civics.communities", representationStage: "guided", seed: 8 });
      expect(activity).toMatchObject({ subject: "civics", curriculumRef: { packId: "communities", revisionId: "communities-r1" } });
      expect(await service.validateAndStoreActivity(activity)).toHaveProperty("activity.id", activity.id);
      expect(proposal.validation).toMatchObject({ valid: true, addedConceptIds: ["civics.communities"] });
    });
  });

  it("rolls a curriculum pack back to a previously active immutable revision", async () => {
    await withService(async (service) => {
      service.createStudent({ id: "history-student", displayName: "History Learner", selectedSubjects: ["history"] });
      const firstRevision = {
        schemaVersion: "2.0" as const,
        id: "history-r1",
        packId: "history-path",
        revision: 1,
        title: "History path",
        description: "An original history path.",
        subjects: [{ id: "history", title: "History", description: "People and events over time." }],
        concepts: [{ id: "history.timelines", subject: "history", title: "Timelines", description: "Place events in time order.", step: 0, activityKinds: ["ordering" as const], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }],
        edges: [],
        provenance: { origin: "original" as const },
        createdBy: "adult-author",
        createdAt: "2026-02-01T00:00:00.000Z"
      };
      await service.proposeCurriculumRevision({ id: "history-proposal-r1", revision: firstRevision, rationale: "Add history.", basedOnRevisionIds: [], affectedStudentIds: [], createdBy: "adult-author" });
      service.decideCurriculumRevision({ proposalId: "history-proposal-r1", decision: "approved", reviewerId: "adult", note: "Approved." });
      await service.activateCurriculumRevision({ proposalId: "history-proposal-r1", actorId: "adult", reason: "Start the path." });
      const firstActivity = {
        schemaVersion: "1.0" as const,
        id: "history-r1-activity",
        studentId: "history-student",
        subject: "history",
        conceptId: "history.timelines",
        title: "Timeline practice",
        representationStage: "guided",
        deliveryMode: "guided-screen",
        evidencePurpose: "formative" as const,
        curriculumVersion: "history-r1",
        curriculumRef: { packId: "history-path", revisionId: "history-r1", nodeRevisionId: "history-r1:history.timelines" },
        items: [{ id: "history-item", conceptId: "history.timelines", kind: "ordering" as const, prompt: "Put the events in order.", options: ["first", "second"], correctOrder: [0, 1] }],
        answerSpecs: { "history-item": { type: "sequence" as const, expected: [0, 1] } },
        scoring: { method: "sequence" as const },
        comparabilityKey: "history|history.timelines|stage:guided|purpose:formative|difficulty:0|activity:practice|items:1|support:on|kinds:ordering",
        createdAt: "2026-02-01T00:00:00.000Z"
      };
      await service.validateAndStoreActivity(firstActivity);

      const secondRevision = { ...firstRevision, id: "history-r2", revision: 2, title: "Expanded history path" };
      await service.proposeCurriculumRevision({ id: "history-proposal-r2", revision: secondRevision, rationale: "Expand history.", basedOnRevisionIds: [firstRevision.id], affectedStudentIds: [], createdBy: "adult-author" });
      service.decideCurriculumRevision({ proposalId: "history-proposal-r2", decision: "approved", reviewerId: "adult", note: "Approved." });
      const activated = await service.activateCurriculumRevision({ proposalId: "history-proposal-r2", actorId: "adult", reason: "Use revision two." });
      expect(activated.activeRevisionIds).toContain("history-r2");
      expect(() => service.getActivity(firstActivity.id)).toThrow(/not currently available/);

      const rolledBack = await service.activateCurriculumRevision({ revisionId: "history-r1", action: "rollback", actorId: "adult", reason: "Restore revision one." });
      expect(rolledBack.activation).toMatchObject({ action: "rollback", revisionId: "history-r1" });
      expect(rolledBack.activeRevisionIds).toContain("history-r1");
      expect(rolledBack.activeRevisionIds).not.toContain("history-r2");
      expect(service.getActivity(firstActivity.id)).toHaveProperty("id", firstActivity.id);
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
