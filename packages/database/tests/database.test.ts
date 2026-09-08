import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { CurriculumPackRevisionSchema, CurriculumRevisionProposalSchema, LearnerRoadmapSchema } from "@child-learning/contracts";
import { generateAdditionWithinTen } from "@child-learning/domain";
import { LearningRepository, migrateDatabase } from "../src/index.js";

describe("database persistence", () => {
  function setup() {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    migrateDatabase(db);
    return db;
  }

  it("runs idempotent migrations and exposes all durable tables", () => {
    const db = setup();
    migrateDatabase(db);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
    for (const table of ["students", "activities", "artifacts", "artifact_edges", "submissions", "responses", "evaluations", "evidence", "progress_events", "student_concept_state", "recommendations", "recommendation_candidates", "human_overrides", "report_snapshots", "operation_runs", "curriculum_revisions", "curriculum_proposals", "curriculum_decisions", "curriculum_activations", "learner_roadmap_revisions", "roadmap_reconciliation_runs", "synthetic_datasets"]) {
      expect(tables.map((entry) => entry.name)).toContain(table);
    }
    db.close();
  });

  it("rejects edits to historical rows while allowing concept projection updates", () => {
    const db = setup();
    const repo = new LearningRepository(db, () => "2026-01-01T00:00:00.000Z");
    repo.saveStudent({ id: "s1", displayName: "Test" });
    const spec = { ...generateAdditionWithinTen({ seed: 1, studentId: "s1", itemCount: 2 }), id: "a1" };
    repo.saveActivity({ id: "a1", studentId: "s1", specification: spec });
    repo.recordSubmission({ id: "sub1", studentId: "s1", activityId: "a1" });
    expect(() => db.prepare("UPDATE submissions SET payload_json = '{}' WHERE id = 'sub1'").run()).toThrow(/append-only/);
    expect(() => db.prepare("DELETE FROM submissions WHERE id = 'sub1'").run()).toThrow(/append-only/);
    repo.upsertConceptState({ studentId: "s1", conceptId: "addition", mastery: 0.8, observationCount: 1 });
    repo.upsertConceptState({ studentId: "s1", conceptId: "addition", mastery: 0.9, observationCount: 2 });
    expect((db.prepare("SELECT mastery FROM student_concept_state WHERE student_id = 's1'").get() as { mastery: number }).mastery).toBe(0.9);
    db.close();
  });

  it("stores immutable curriculum and learner roadmap revisions", () => {
    const db = setup();
    const repo = new LearningRepository(db, () => "2026-01-01T00:00:00.000Z");
    repo.saveStudent({ id: "s1", displayName: "Test" });
    const revision = CurriculumPackRevisionSchema.parse({ schemaVersion: "2.0", id: "pack-r1", packId: "pack", revision: 1, title: "Open pack", description: "A subject graph.", subjects: [{ id: "social-studies", title: "Social Studies", description: "Communities and places." }], concepts: [{ id: "social-studies.communities", subject: "social-studies", title: "Communities", description: "Describe communities.", step: 0, activityKinds: ["selected-response"], stages: [{ stage: "guided", deliveryMode: "guided-screen", evidencePurpose: "formative", generator: "template-bank" }] }], provenance: { origin: "original" }, createdBy: "adult", createdAt: "2026-01-01T00:00:00.000Z" });
    repo.saveCurriculumRevision(revision, "a".repeat(64));
    const proposal = CurriculumRevisionProposalSchema.parse({ id: "proposal-1", revision, rationale: "Add the subject.", createdBy: "adult", createdAt: "2026-01-01T00:00:00.000Z" });
    repo.saveCurriculumProposal(proposal);
    expect(() => repo.saveCurriculumProposal({ ...proposal, rationale: "Different content." })).toThrow(/conflicts/);
    repo.saveCurriculumActivation({ id: "activation-1", packId: "pack", revisionId: revision.id, action: "activate", actorId: "adult", reason: "Approved starter", createdAt: "2026-01-01T00:00:00.000Z" });
    const roadmap = LearnerRoadmapSchema.parse({ schemaVersion: "1.0", id: "roadmap-1", studentId: "s1", subject: "social-studies", title: "Social Studies", curriculumRevisionIds: [revision.id], nodes: [{ id: "roadmap-node-1", conceptId: "social-studies.communities", subject: "social-studies", title: "Communities", description: "Describe communities.", stage: "guided", status: "current", branchKind: "core", depth: 0, reason: "Starting point", curriculumRevisionId: revision.id }], edges: [], currentNodeIds: ["roadmap-node-1"], completedNodeIds: [], frontierNodeIds: ["roadmap-node-1"], generatedAt: "2026-01-01T00:00:00.000Z" });
    repo.saveLearnerRoadmap(roadmap, { source: "reconcile", reason: "Starting point" });
    expect(repo.listActiveCurriculumRevisions()).toEqual([revision]);
    expect(repo.getLatestLearnerRoadmap("s1", "social-studies")?.id).toBe("roadmap-1");
    expect(() => db.prepare("UPDATE curriculum_revisions SET title = 'Changed' WHERE id = 'pack-r1'").run()).toThrow(/append-only/);
    expect(() => db.prepare("DELETE FROM learner_roadmap_revisions WHERE id = 'roadmap-1'").run()).toThrow(/append-only/);
    db.close();
  });

  it("preserves data scope and records immutable retry lineage", () => {
    const db = setup();
    const repo = new LearningRepository(db, () => "2026-01-01T00:00:00.000Z");
    repo.saveStudent({ id: "s1", displayName: "Test" });
    expect(repo.getStudent("s1")?.data_scope).toBe("household");
    expect(() => repo.saveStudent({ id: "s1", displayName: "Changed", dataScope: "demo" })).toThrow(/scope/);
    expect(() => repo.saveStudent({ id: "synthetic-demo-v2-student", displayName: "Reserved" })).toThrow(/reserved/);
    const spec = { ...generateAdditionWithinTen({ seed: 1, studentId: "s1", itemCount: 2 }), id: "a1" };
    repo.saveActivity({ id: "a1", studentId: "s1", specification: spec });
    const first = repo.recordSubmission({ id: "sub1", studentId: "s1", activityId: "a1" });
    const retry = repo.recordSubmission({ id: "sub2", studentId: "s1", activityId: "a1", retryOfSubmissionId: String(first.id) });
    expect(retry.attempt_number).toBe(2);
    expect(retry.retry_of_submission_id).toBe("sub1");
    repo.recordSyntheticDataset({ id: "demo-v2", version: "2", studentId: "s1", manifest: { activityIds: ["a1"] } });
    expect(repo.getSyntheticDataset("demo-v2")?.version).toBe("2");
    expect(() => db.prepare("DELETE FROM synthetic_datasets WHERE id = 'demo-v2'").run()).toThrow(/append-only/);
    db.close();
  });

  it("replays an idempotent operation without a second historical row", () => {
    const db = setup();
    const repo = new LearningRepository(db, () => "2026-01-01T00:00:00.000Z");
    repo.saveStudent({ id: "s1", displayName: "Test" });
    const spec = { ...generateAdditionWithinTen({ seed: 1, studentId: "s1", itemCount: 2 }), id: "a1" };
    repo.saveActivity({ id: "a1", studentId: "s1", specification: spec });
    const first = repo.recordSubmission({ id: "sub1", studentId: "s1", activityId: "a1", operationKey: "op-1" });
    const second = repo.recordSubmission({ id: "different", studentId: "s1", activityId: "a1", operationKey: "op-1" });
    expect(second.id).toBe(first.id);
    expect((db.prepare("SELECT COUNT(*) AS count FROM submissions").get() as { count: number }).count).toBe(1);
    expect(repo.operationResult("op-1")?.id).toBe("sub1");
    db.close();
  });
});
