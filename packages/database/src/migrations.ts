import type { SqliteDatabase } from "./db.js";

export const MIGRATION_001 = `
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  birth_date TEXT,
  grade TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS curriculum_metadata (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  concept_id TEXT,
  title TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  curriculum_id TEXT REFERENCES curriculum_metadata(id),
  subject TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  title TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  specification_json TEXT NOT NULL CHECK (json_valid(specification_json) AND json_extract(specification_json, '$.schemaVersion') = '1.0' AND json_extract(specification_json, '$.id') = id AND json_extract(specification_json, '$.studentId') = student_id AND json_extract(specification_json, '$.subject') = subject AND json_extract(specification_json, '$.conceptId') = concept_id AND json_type(specification_json, '$.items') = 'array' AND json_type(specification_json, '$.answerSpecs') = 'object'),
  artifact_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  relative_path TEXT NOT NULL UNIQUE,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifact_edges (
  parent_artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  child_artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  relation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (parent_artifact_id, child_artifact_id, relation),
  CHECK (parent_artifact_id <> child_artifact_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  activity_id TEXT NOT NULL REFERENCES activities(id),
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  submitted_at TEXT NOT NULL,
  artifact_id TEXT REFERENCES artifacts(id),
  payload_json TEXT NOT NULL DEFAULT '{}',
  operation_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  item_key TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (submission_id, item_key)
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  evaluator_type TEXT NOT NULL,
  score REAL CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  outcome TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  rationale TEXT,
  evaluation_json TEXT NOT NULL DEFAULT '{}',
  supersedes_evaluation_id TEXT REFERENCES evaluations(id),
  operation_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  concept_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  value_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress_events (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  concept_id TEXT NOT NULL,
  evaluation_id TEXT REFERENCES evaluations(id),
  score REAL CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  event_type TEXT NOT NULL,
  comparable INTEGER NOT NULL DEFAULT 1 CHECK (comparable IN (0,1)),
  evidence_status TEXT NOT NULL DEFAULT 'confirmed',
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  comparability_key TEXT,
  previous_state_json TEXT,
  new_state_json TEXT,
  policy_version TEXT,
  reason TEXT,
  value_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  operation_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS student_concept_state (
  student_id TEXT NOT NULL REFERENCES students(id),
  concept_id TEXT NOT NULL,
  step INTEGER NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 10),
  status TEXT NOT NULL DEFAULT 'new',
  recent_scores_json TEXT NOT NULL DEFAULT '[]',
  mastery REAL CHECK (mastery IS NULL OR (mastery >= 0 AND mastery <= 1)),
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  observation_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  last_event_at TEXT,
  updated_at TEXT NOT NULL,
  state_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (student_id, concept_id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  activity_id TEXT REFERENCES activities(id),
  reason TEXT NOT NULL,
  rank INTEGER,
  generated_at TEXT,
  policy_version TEXT,
  recommendation_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  expires_at TEXT,
  operation_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS recommendation_candidates (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL REFERENCES recommendations(id),
  activity_id TEXT NOT NULL REFERENCES activities(id),
  rationale_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS human_overrides (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  concept_id TEXT,
  target_step INTEGER,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  original_decision TEXT,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  actor TEXT NOT NULL,
  override_json TEXT NOT NULL DEFAULT '{}',
  operation_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS report_snapshots (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  report_type TEXT NOT NULL,
  as_of TEXT,
  artifact_id TEXT REFERENCES artifacts(id),
  report_json TEXT NOT NULL DEFAULT '{}',
  content_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  operation_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS operation_runs (
  operation_key TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_student_time ON submissions(student_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_submission_time ON evaluations(submission_id, evaluated_at);
CREATE INDEX IF NOT EXISTS idx_progress_student_concept_time ON progress_events(student_id, concept_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_student_time ON recommendations(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_student_time ON report_snapshots(student_id, created_at);

CREATE TRIGGER IF NOT EXISTS activities_no_update BEFORE UPDATE ON activities BEGIN SELECT RAISE(ABORT, 'activities are append-only'); END;
CREATE TRIGGER IF NOT EXISTS activities_no_delete BEFORE DELETE ON activities BEGIN SELECT RAISE(ABORT, 'activities are append-only'); END;
CREATE TRIGGER IF NOT EXISTS artifacts_no_update BEFORE UPDATE ON artifacts BEGIN SELECT RAISE(ABORT, 'artifacts are append-only'); END;
CREATE TRIGGER IF NOT EXISTS artifacts_no_delete BEFORE DELETE ON artifacts BEGIN SELECT RAISE(ABORT, 'artifacts are append-only'); END;
CREATE TRIGGER IF NOT EXISTS submissions_no_update BEFORE UPDATE ON submissions BEGIN SELECT RAISE(ABORT, 'submissions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS submissions_no_delete BEFORE DELETE ON submissions BEGIN SELECT RAISE(ABORT, 'submissions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS responses_no_update BEFORE UPDATE ON responses BEGIN SELECT RAISE(ABORT, 'responses are append-only'); END;
CREATE TRIGGER IF NOT EXISTS responses_no_delete BEFORE DELETE ON responses BEGIN SELECT RAISE(ABORT, 'responses are append-only'); END;
CREATE TRIGGER IF NOT EXISTS evaluations_no_update BEFORE UPDATE ON evaluations BEGIN SELECT RAISE(ABORT, 'evaluations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS evaluations_no_delete BEFORE DELETE ON evaluations BEGIN SELECT RAISE(ABORT, 'evaluations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS evidence_no_update BEFORE UPDATE ON evidence BEGIN SELECT RAISE(ABORT, 'evidence is append-only'); END;
CREATE TRIGGER IF NOT EXISTS evidence_no_delete BEFORE DELETE ON evidence BEGIN SELECT RAISE(ABORT, 'evidence is append-only'); END;
CREATE TRIGGER IF NOT EXISTS progress_events_no_update BEFORE UPDATE ON progress_events BEGIN SELECT RAISE(ABORT, 'progress_events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS progress_events_no_delete BEFORE DELETE ON progress_events BEGIN SELECT RAISE(ABORT, 'progress_events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS recommendations_no_update BEFORE UPDATE ON recommendations BEGIN SELECT RAISE(ABORT, 'recommendations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS recommendations_no_delete BEFORE DELETE ON recommendations BEGIN SELECT RAISE(ABORT, 'recommendations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS recommendation_candidates_no_update BEFORE UPDATE ON recommendation_candidates BEGIN SELECT RAISE(ABORT, 'recommendation_candidates are append-only'); END;
CREATE TRIGGER IF NOT EXISTS recommendation_candidates_no_delete BEFORE DELETE ON recommendation_candidates BEGIN SELECT RAISE(ABORT, 'recommendation_candidates are append-only'); END;
CREATE TRIGGER IF NOT EXISTS human_overrides_no_update BEFORE UPDATE ON human_overrides BEGIN SELECT RAISE(ABORT, 'human_overrides are append-only'); END;
CREATE TRIGGER IF NOT EXISTS human_overrides_no_delete BEFORE DELETE ON human_overrides BEGIN SELECT RAISE(ABORT, 'human_overrides are append-only'); END;
CREATE TRIGGER IF NOT EXISTS report_snapshots_no_update BEFORE UPDATE ON report_snapshots BEGIN SELECT RAISE(ABORT, 'report_snapshots are append-only'); END;
CREATE TRIGGER IF NOT EXISTS report_snapshots_no_delete BEFORE DELETE ON report_snapshots BEGIN SELECT RAISE(ABORT, 'report_snapshots are append-only'); END;
CREATE TRIGGER IF NOT EXISTS operation_runs_no_update BEFORE UPDATE ON operation_runs BEGIN SELECT RAISE(ABORT, 'operation_runs are append-only'); END;
CREATE TRIGGER IF NOT EXISTS operation_runs_no_delete BEFORE DELETE ON operation_runs BEGIN SELECT RAISE(ABORT, 'operation_runs are append-only'); END;
CREATE TRIGGER IF NOT EXISTS artifact_edges_no_update BEFORE UPDATE ON artifact_edges BEGIN SELECT RAISE(ABORT, 'artifact_edges are append-only'); END;
CREATE TRIGGER IF NOT EXISTS artifact_edges_no_delete BEFORE DELETE ON artifact_edges BEGIN SELECT RAISE(ABORT, 'artifact_edges are append-only'); END;
`;

export const MIGRATION_004 = `
CREATE TABLE IF NOT EXISTS curriculum_revisions (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  title TEXT NOT NULL,
  definition_json TEXT NOT NULL CHECK (json_valid(definition_json) AND json_extract(definition_json, '$.schemaVersion') = '2.0' AND json_extract(definition_json, '$.id') = id),
  sha256 TEXT NOT NULL,
  artifact_id TEXT REFERENCES artifacts(id),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (pack_id, revision_number),
  UNIQUE (sha256)
);

CREATE TABLE IF NOT EXISTS curriculum_proposals (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES curriculum_revisions(id),
  proposal_json TEXT NOT NULL CHECK (json_valid(proposal_json) AND json_extract(proposal_json, '$.id') = id),
  artifact_id TEXT REFERENCES artifacts(id),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_decisions (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES curriculum_proposals(id),
  revision_id TEXT NOT NULL REFERENCES curriculum_revisions(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  reviewer_id TEXT NOT NULL,
  note TEXT NOT NULL,
  decision_json TEXT NOT NULL CHECK (json_valid(decision_json)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_activations (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  revision_id TEXT NOT NULL REFERENCES curriculum_revisions(id),
  action TEXT NOT NULL CHECK (action IN ('activate','rollback')),
  actor_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  activation_json TEXT NOT NULL CHECK (json_valid(activation_json)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learner_roadmap_revisions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  subject TEXT NOT NULL,
  curriculum_revision_ids_json TEXT NOT NULL CHECK (json_valid(curriculum_revision_ids_json)),
  graph_json TEXT NOT NULL CHECK (json_valid(graph_json) AND json_extract(graph_json, '$.id') = id),
  artifact_id TEXT REFERENCES artifacts(id),
  source TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roadmap_reconciliation_runs (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  trigger_type TEXT NOT NULL,
  trigger_id TEXT,
  result_json TEXT NOT NULL CHECK (json_valid(result_json)),
  created_at TEXT NOT NULL,
  operation_key TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_curriculum_revisions_pack ON curriculum_revisions(pack_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_curriculum_activations_pack ON curriculum_activations(pack_id, created_at);
CREATE INDEX IF NOT EXISTS idx_curriculum_decisions_proposal ON curriculum_decisions(proposal_id, created_at);
CREATE INDEX IF NOT EXISTS idx_roadmap_revisions_student_subject ON learner_roadmap_revisions(student_id, subject, created_at);

CREATE TRIGGER IF NOT EXISTS curriculum_revisions_no_update BEFORE UPDATE ON curriculum_revisions BEGIN SELECT RAISE(ABORT, 'curriculum_revisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS curriculum_revisions_no_delete BEFORE DELETE ON curriculum_revisions BEGIN SELECT RAISE(ABORT, 'curriculum_revisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS curriculum_proposals_no_update BEFORE UPDATE ON curriculum_proposals BEGIN SELECT RAISE(ABORT, 'curriculum_proposals are append-only'); END;
CREATE TRIGGER IF NOT EXISTS curriculum_proposals_no_delete BEFORE DELETE ON curriculum_proposals BEGIN SELECT RAISE(ABORT, 'curriculum_proposals are append-only'); END;
CREATE TRIGGER IF NOT EXISTS curriculum_decisions_no_update BEFORE UPDATE ON curriculum_decisions BEGIN SELECT RAISE(ABORT, 'curriculum_decisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS curriculum_decisions_no_delete BEFORE DELETE ON curriculum_decisions BEGIN SELECT RAISE(ABORT, 'curriculum_decisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS curriculum_activations_no_update BEFORE UPDATE ON curriculum_activations BEGIN SELECT RAISE(ABORT, 'curriculum_activations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS curriculum_activations_no_delete BEFORE DELETE ON curriculum_activations BEGIN SELECT RAISE(ABORT, 'curriculum_activations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS learner_roadmap_revisions_no_update BEFORE UPDATE ON learner_roadmap_revisions BEGIN SELECT RAISE(ABORT, 'learner_roadmap_revisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS learner_roadmap_revisions_no_delete BEFORE DELETE ON learner_roadmap_revisions BEGIN SELECT RAISE(ABORT, 'learner_roadmap_revisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS roadmap_reconciliation_runs_no_update BEFORE UPDATE ON roadmap_reconciliation_runs BEGIN SELECT RAISE(ABORT, 'roadmap_reconciliation_runs are append-only'); END;
CREATE TRIGGER IF NOT EXISTS roadmap_reconciliation_runs_no_delete BEFORE DELETE ON roadmap_reconciliation_runs BEGIN SELECT RAISE(ABORT, 'roadmap_reconciliation_runs are append-only'); END;
`;

export const MIGRATION_005 = `
CREATE TABLE IF NOT EXISTS synthetic_datasets (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id),
  manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
  seeded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_student_activity_time ON submissions(student_id, activity_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_reports_student_as_of ON report_snapshots(student_id, as_of DESC, created_at DESC);
CREATE TRIGGER IF NOT EXISTS synthetic_datasets_no_update BEFORE UPDATE ON synthetic_datasets BEGIN SELECT RAISE(ABORT, 'synthetic_datasets are append-only'); END;
CREATE TRIGGER IF NOT EXISTS synthetic_datasets_no_delete BEFORE DELETE ON synthetic_datasets BEGIN SELECT RAISE(ABORT, 'synthetic_datasets are append-only'); END;
`;

function hasColumn(db: SqliteDatabase, table: string, column: string): boolean {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((entry) => entry.name === column);
}

function addColumnIfMissing(db: SqliteDatabase, table: string, column: string, definition: string): void {
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function migrateExpandedColumns(db: SqliteDatabase): void {
  addColumnIfMissing(db, "activities", "student_id", "TEXT REFERENCES students(id)");
  addColumnIfMissing(db, "evaluations", "evaluation_json", "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing(db, "evaluations", "supersedes_evaluation_id", "TEXT REFERENCES evaluations(id)");
  for (const [column, definition] of ([["evaluation_id", "TEXT"], ["score", "REAL"], ["comparable", "INTEGER NOT NULL DEFAULT 1"], ["evidence_status", "TEXT NOT NULL DEFAULT 'confirmed'"], ["confidence", "REAL"], ["comparability_key", "TEXT"], ["previous_state_json", "TEXT"], ["new_state_json", "TEXT"], ["policy_version", "TEXT"], ["reason", "TEXT"]] as const)) addColumnIfMissing(db, "progress_events", column, definition);
  for (const [column, definition] of ([["step", "INTEGER NOT NULL DEFAULT 0"], ["status", "TEXT NOT NULL DEFAULT 'new'"], ["recent_scores_json", "TEXT NOT NULL DEFAULT '[]'"]] as const)) addColumnIfMissing(db, "student_concept_state", column, definition);
  for (const [column, definition] of ([["generated_at", "TEXT"], ["policy_version", "TEXT"], ["recommendation_json", "TEXT NOT NULL DEFAULT '{}'" ]] as const)) addColumnIfMissing(db, "recommendations", column, definition);
  for (const [column, definition] of ([["concept_id", "TEXT"], ["target_step", "INTEGER"], ["original_decision", "TEXT"], ["override_json", "TEXT NOT NULL DEFAULT '{}'" ]] as const)) addColumnIfMissing(db, "human_overrides", column, definition);
  for (const [column, definition] of ([["as_of", "TEXT"], ["report_json", "TEXT NOT NULL DEFAULT '{}'" ]] as const)) addColumnIfMissing(db, "report_snapshots", column, definition);
}

function classifyLegacyDemo(db: SqliteDatabase): void {
  const demo = db.prepare("SELECT 1 FROM students WHERE id = 'student-demo-ava'").get();
  if (!demo) return;
  const canonicalActivityIds = ["activity-addition-01", "activity-addition-02", "activity-addition-03", "activity-addition-04", "activity-addition-next", "activity-english-letter-sounds", "activity-subtraction-01", "activity-equal-groups-01", "activity-fair-sharing-01", "activity-handwriting-01", "activity-reading-detail-01", "activity-reasoning-01", "activity-science-observation-01"];
  const canonicalSubmissionIds = ["submission-demo-addition-1", "submission-demo-addition-2", "submission-demo-addition-3", "submission-demo-addition-4", "submission-demo-english"];
  const placeholders = (values: readonly string[]) => values.map(() => "?").join(",");
  const count = (sql: string, ...args: unknown[]) => Number((db.prepare(sql).get(...args) as { count: number }).count);
  const activityCount = count("SELECT COUNT(*) AS count FROM activities WHERE student_id = 'student-demo-ava'");
  const submissionCount = count("SELECT COUNT(*) AS count FROM submissions WHERE student_id = 'student-demo-ava'");
  const extraActivities = count(`SELECT COUNT(*) AS count FROM activities WHERE student_id = 'student-demo-ava' AND id NOT IN (${placeholders(canonicalActivityIds)})`, ...canonicalActivityIds);
  const extraSubmissions = count(`SELECT COUNT(*) AS count FROM submissions WHERE student_id = 'student-demo-ava' AND id NOT IN (${placeholders(canonicalSubmissionIds)})`, ...canonicalSubmissionIds);
  const evaluationCount = count("SELECT COUNT(*) AS count FROM evaluations e JOIN submissions s ON s.id = e.submission_id WHERE s.student_id = 'student-demo-ava'");
  const progressCount = count("SELECT COUNT(*) AS count FROM progress_events WHERE student_id = 'student-demo-ava'");
  const recommendationCount = count("SELECT COUNT(*) AS count FROM recommendations WHERE student_id = 'student-demo-ava'");
  const overrideCount = count("SELECT COUNT(*) AS count FROM human_overrides WHERE student_id = 'student-demo-ava'");
  const reportCount = count("SELECT COUNT(*) AS count FROM report_snapshots WHERE student_id = 'student-demo-ava'");
  const canonical = activityCount === canonicalActivityIds.length && submissionCount === canonicalSubmissionIds.length && extraActivities === 0 && extraSubmissions === 0 && evaluationCount === 5 && progressCount === 6 && recommendationCount === 1 && overrideCount === 1 && reportCount === 1;
  const scope = canonical ? "demo" : "legacy-mixed";
  db.prepare("UPDATE students SET data_scope = ?, source_dataset_id = ? WHERE id = 'student-demo-ava'").run(scope, scope === "demo" ? "legacy-demo-v1" : null);
}

function migrateIntegrityColumns(db: SqliteDatabase): void {
  addColumnIfMissing(db, "students", "data_scope", "TEXT NOT NULL DEFAULT 'household' CHECK (data_scope IN ('household','demo','legacy-mixed'))");
  addColumnIfMissing(db, "students", "source_dataset_id", "TEXT");
  addColumnIfMissing(db, "submissions", "retry_of_submission_id", "TEXT REFERENCES submissions(id)");
  addColumnIfMissing(db, "report_snapshots", "period_start", "TEXT");
  addColumnIfMissing(db, "report_snapshots", "period_end", "TEXT");
  addColumnIfMissing(db, "report_snapshots", "time_zone", "TEXT");
  classifyLegacyDemo(db);
}

export function migrateDatabase(db: SqliteDatabase): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);`);
  const applied = db.prepare("SELECT 1 FROM schema_migrations WHERE id = 1").get();
  if (!applied) {
    const apply = db.transaction(() => {
      db.exec(MIGRATION_001);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (1, ?)").run(new Date().toISOString());
    });
    apply();
  }
  const expanded = db.prepare("SELECT 1 FROM schema_migrations WHERE id = 2").get();
  if (!expanded) {
    const applyExpanded = db.transaction(() => {
      migrateExpandedColumns(db);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (2, ?)").run(new Date().toISOString());
    });
    applyExpanded();
  }
  const evaluationResolution = db.prepare("SELECT 1 FROM schema_migrations WHERE id = 3").get();
  if (!evaluationResolution) {
    const applyEvaluationResolution = db.transaction(() => {
      addColumnIfMissing(db, "evaluations", "supersedes_evaluation_id", "TEXT REFERENCES evaluations(id)");
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (3, ?)").run(new Date().toISOString());
    });
    applyEvaluationResolution();
  }
  const adaptiveCurriculum = db.prepare("SELECT 1 FROM schema_migrations WHERE id = 4").get();
  if (!adaptiveCurriculum) {
    const applyAdaptiveCurriculum = db.transaction(() => {
      db.exec(MIGRATION_004);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (4, ?)").run(new Date().toISOString());
    });
    applyAdaptiveCurriculum();
  }
  const integrityRefinement = db.prepare("SELECT 1 FROM schema_migrations WHERE id = 5").get();
  if (!integrityRefinement) {
    const applyIntegrityRefinement = db.transaction(() => {
      migrateIntegrityColumns(db);
      db.exec(MIGRATION_005);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (5, ?)").run(new Date().toISOString());
    });
    applyIntegrityRefinement();
  }
}

export const runMigrations = migrateDatabase;
