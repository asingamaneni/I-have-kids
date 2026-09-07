import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { seedDemo } from "../src/index.js";
import { migrateDatabase, openDatabase } from "@child-learning/database";

describe("demo seed", () => {
  it("seeds four comparable addition observations and is replayable", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-demo-"));
    const databasePath = join(root, "demo.db");
    try {
      const first = await seedDemo({ databasePath, artifactsDir: join(root, "artifacts") });
      const second = await seedDemo({ databasePath, artifactsDir: join(root, "artifacts") });
      expect(first.observationScores).toEqual([0.7, 0.9, 0.9, 0.9]);
      expect(second.observationScores).toEqual(first.observationScores);
      expect(first.finalStep).toBe(1);
      expect(first.finalDecision).toBe("advance");
      const db = openDatabase({ filename: databasePath });
      const concepts = (db.prepare("SELECT concept_id FROM activities WHERE student_id = ? ORDER BY concept_id").all(first.studentId) as Array<{ concept_id: string }>).map((row) => row.concept_id);
      expect(concepts).toEqual(expect.arrayContaining(["math.subtraction-within-10", "math.equal-groups", "math.fair-sharing", "english.letter-formation", "english.reading-for-detail", "reasoning.sequence-and-pattern", "science.observe-and-describe"]));
      migrateDatabase(db);
      expect((db.prepare("SELECT COUNT(*) AS count FROM submissions WHERE student_id = ?").get(first.studentId) as { count: number }).count).toBe(5);
      expect((db.prepare("SELECT COUNT(*) AS count FROM progress_events WHERE student_id = ?").get(first.studentId) as { count: number }).count).toBe(6);
      const firstProgress = db.prepare("SELECT previous_state_json, new_state_json FROM progress_events WHERE operation_key = 'demo:addition:1:progress'").get() as { previous_state_json: string; new_state_json: string };
      const finalProgress = db.prepare("SELECT previous_state_json, new_state_json, policy_version, reason FROM progress_events WHERE operation_key = 'demo:addition:4:progress'").get() as { previous_state_json: string; new_state_json: string; policy_version: string; reason: string };
      expect(JSON.parse(firstProgress.new_state_json).step).toBe(0);
      expect(JSON.parse(finalProgress.previous_state_json).step).toBe(0);
      expect(JSON.parse(finalProgress.new_state_json).step).toBe(1);
      expect(finalProgress.policy_version).toBe("1.0");
      expect(finalProgress.reason).toMatch(/consecutive comparable/);
      expect((db.prepare("SELECT COUNT(*) AS count FROM student_concept_state WHERE student_id = ?").get(first.studentId) as { count: number }).count).toBe(2);
      db.close();
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
