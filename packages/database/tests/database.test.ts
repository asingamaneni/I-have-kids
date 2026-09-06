import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { generateAdditionWithinTen } from "@kindergarten/domain";
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
    for (const table of ["students", "activities", "artifacts", "artifact_edges", "submissions", "responses", "evaluations", "evidence", "progress_events", "student_concept_state", "recommendations", "recommendation_candidates", "human_overrides", "report_snapshots", "operation_runs"]) {
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
