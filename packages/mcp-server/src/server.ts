#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CurriculumPackRevisionSchema, CurriculumRevisionProposalSchema, IdSchema, IsoDateTimeSchema } from "@child-learning/contracts";
import { createLocalService, resolveProjectRoot, type LocalService } from "./service.js";

/** Tool input for propose_curriculum_revision: a proposal wrapper whose ids and timestamps the service can fill in. */
export const CurriculumProposalInputSchema = CurriculumRevisionProposalSchema.omit({ id: true, createdAt: true, revision: true }).extend({
  id: IdSchema.optional(),
  createdAt: IsoDateTimeSchema.optional(),
  extendsRevisionId: IdSchema.optional().describe("Preferred: id of the active revision to extend. Only the new or changed subjects, concepts, edges, and activityTemplates need to be sent in `revision`; everything else is carried forward by id and the revision number is bumped automatically."),
  revision: CurriculumPackRevisionSchema.omit({ createdAt: true }).partial().extend({ createdAt: IsoDateTimeSchema.optional() }).describe("The CurriculumPackRevision. Complete when extendsRevisionId is absent; partial (new items only) when it is set.")
});

export { createLocalService, requireDataPath, resolveProjectRoot } from "./service.js";
export type { LocalService, LocalServiceOptions, DataStatus } from "./service.js";

const okSchema = z.object({ ok: z.literal(true), result: z.unknown() });
const text = (value: unknown): string => typeof value === "string" ? value : JSON.stringify(value);
const success = (result: unknown) => ({ content: [{ type: "text" as const, text: text(result) }], structuredContent: { ok: true as const, result } });
const failure = (error: unknown) => ({ content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }], isError: true as const });

function withErrors<T extends (...args: any[]) => any>(handler: T) {
  return async (...args: Parameters<T>) => {
    try { return success(await handler(...args)); } catch (error) { return failure(error); }
  };
}

const studentId = z.string().min(1);
const now = z.string().datetime({ offset: true }).optional();
const operationKey = z.string().min(1).optional();

export function createMcpServer(service = createLocalService()): McpServer {
  const server = new McpServer({ name: "child-learning-local", version: "2.0.0" });
  const register = (name: string, description: string, inputSchema: z.ZodTypeAny, handler: (...args: any[]) => any) => {
    server.registerTool(name, { description, inputSchema, outputSchema: okSchema }, withErrors(handler));
  };

  register("list_students", "List local students without exposing answer keys.", z.object({}), async () => service.listStudents());
  register("create_student", "Create a local learner profile and, only when structured observed capabilities are supplied, place starting diagnostics near that reported level. Claims never count as mastery.", z.object({ id: studentId.optional(), displayName: z.string().min(1), birthDate: z.string().date().optional(), schoolPlacement: z.string().min(1).optional(), preferredLanguage: z.string().min(2).optional(), accommodations: z.array(z.string().min(1)).optional(), interests: z.array(z.string().min(1)).optional(), learningGoals: z.array(z.string().min(1)).optional(), selectedSubjects: z.array(z.string().min(1)).optional(), reportedCapabilities: z.array(z.string().min(1)).optional(), baselineNotes: z.string().min(1).optional() }), async ({ reportedCapabilities, ...input }: any) => service.createLearnerWithIntake({ ...input, ...(reportedCapabilities ? { currentCapabilities: reportedCapabilities } : {}) }));
  register("complete_student_intake", "Complete structured learner intake and generate diagnostics near the adult-reported or questionnaire-selected level.", z.object({ studentId, observedCapabilities: z.array(z.string().min(1)).default([]), questionnaireAnchors: z.array(z.object({ subject: z.string().min(1), capabilityId: z.string().min(1).optional(), entryDiagnostic: z.boolean().default(false) })).default([]), source: z.enum(["adult-observation", "questionnaire", "combined"]).default("adult-observation") }), async ({ studentId: id, ...intake }: any) => service.completeLearnerIntake(id, intake));
  register("get_student_context", "Get one student's activities, progress, and timeline in a child-safe form.", z.object({ studentId }), async ({ studentId: id }: { studentId: string }) => service.getStudentContext(id));
  register("generate_activity", "Generate deterministic original practice for an active curriculum concept and configured learning stage.", z.object({ subject: z.string().min(1).optional(), conceptId: studentId.optional(), generator: studentId.optional(), seed: z.number().int(), studentId: studentId.optional(), itemCount: z.number().int().min(1).max(40).optional(), representationStage: z.string().min(1).optional(), difficultyLevel: z.number().int().min(0).max(10).optional(), now }), async (input: any) => service.generateActivity(input));
  register("validate_and_store_activity", "Validate a proposed ActivitySpec, check item answers and difficulty bounds, then persist it locally.", z.object({ spec: z.unknown() }), async ({ spec }: { spec: unknown }) => service.validateAndStoreActivity(spec));
  register("get_activity", "Read an activity; answer specifications are returned only when adult is true.", z.object({ activityId: studentId, adult: z.boolean().default(false) }), async ({ activityId, adult }: { activityId: string; adult: boolean }) => service.getActivity(activityId, adult));
  register("record_digital_submission", "Persist a digital submission, deterministically score it, append progress evidence, and update the projected concept state.", z.object({ id: studentId, activityId: studentId, studentId, responses: z.array(z.object({ itemId: studentId, value: z.unknown(), capturedAt: z.string().datetime({ offset: true }) })).default([]), retryOfSubmissionId: studentId.optional(), submittedAt: now, operationKey }), async (input: any) => service.recordDigitalSubmission(input));
  register("propose_uploaded_work_evaluation", "Store Claude Code-assisted transcription evidence as an evaluation that always requires human review.", z.object({ submissionId: studentId, conceptId: studentId.optional(), score: z.number().min(0).max(1).optional(), evidence: z.array(z.string().min(1)).min(1), confidence: z.number().min(0).max(1), items: z.array(z.object({ itemId: studentId, score: z.number().min(0).max(1), mistakeTags: z.array(z.string()).default([]), evidenceStatus: z.enum(["confirmed", "unconfirmed", "ambiguous"]), rationale: z.string().min(1) })).optional(), rationale: z.string().optional(), now }), async (input: any) => service.proposeUploadedWorkEvaluation(input));
  register("confirm_evaluation", "Append an adult-reviewed score and rationale without changing the original evaluation row.", z.object({ evaluationId: studentId, reviewerId: studentId, score: z.number().min(0).max(1), rationale: z.string().min(1), now }), async (input: any) => service.confirmEvaluation(input));
  register("reject_evaluation", "Append a human rejection/superseding evaluation without changing the original evaluation row.", z.object({ evaluationId: studentId, reviewerId: studentId, reason: z.string().min(1), now }), async (input: any) => service.rejectEvaluation(input));
  register("get_evaluation", "Read one evaluation by id: per-item results, status, whether it is confirmed or needs human review, any adult confirm/reject chain, the linked submission and activity, and artifact ids. Use this instead of get_student_context when you already have an evaluation id. Rationale, confidence, and mistake tags are returned only when adult is true.", z.object({ evaluationId: studentId, adult: z.boolean().default(false) }), async ({ evaluationId, adult }: { evaluationId: string; adult: boolean }) => service.getEvaluation(evaluationId, adult));
  register("get_progress", "Read current projected concept progress and append-only progress history.", z.object({ studentId, conceptId: studentId.optional() }), async ({ studentId: id, conceptId }: { studentId: string; conceptId?: string }) => service.getProgress(id, conceptId));
  register("get_learning_path", "Read capability availability, configured learning stages, and active adult directives. Age and school placement are context only.", z.object({ studentId }), async ({ studentId: id }: { studentId: string }) => service.getLearningPath(id));
  register("list_curriculum", "List active immutable curriculum revisions, subjects, and pending adult-reviewed proposals.", z.object({}), async () => service.listCurriculum());
  register("get_curriculum_graph", "Read active curriculum nodes and typed edges for one subject or the full local registry.", z.object({ subject: z.string().min(1).optional() }), async ({ subject }: { subject?: string }) => service.getCurriculumGraph(subject));
  register("get_learning_roadmap", "Read a per-subject learner graph. Child output omits scores, evidence analytics, locked nodes, and adult rationale.", z.object({ studentId, adult: z.boolean().default(false) }), async ({ studentId: id, adult }: { studentId: string; adult: boolean }) => service.getLearningRoadmaps(id, adult));
  register("reconcile_learning_roadmap", "Deterministically refresh frontier and evidence-backed practice branches without inventing curriculum.", z.object({ studentId, triggerType: z.string().min(1).optional(), triggerId: studentId.optional() }), async ({ studentId: id, triggerType, triggerId }: { studentId: string; triggerType?: string; triggerId?: string }) => service.reconcileLearningRoadmaps(id, triggerType, triggerId));
  register("propose_curriculum_revision", "Validate and store an immutable curriculum graph proposal. Preferred usage: set `proposal.extendsRevisionId` to the active revision id (from list_curriculum or get_curriculum_graph) and put ONLY the new concepts, edges, subjects, and activityTemplates under `proposal.revision`; historical concepts are carried forward automatically and must not be resent. Put `rationale`, `createdBy`, and `affectedStudentIds` beside `revision`. Without extendsRevisionId, `revision` must be a complete CurriculumPackRevision. A proposal cannot affect active learner roadmaps until an adult approves and activates it.", z.object({ proposal: CurriculumProposalInputSchema }), async ({ proposal }: { proposal: z.infer<typeof CurriculumProposalInputSchema> }) => service.proposeCurriculumRevision(proposal as Parameters<LocalService["proposeCurriculumRevision"]>[0]));
  register("decide_curriculum_revision", "Append an explicit adult approval or rejection for one curriculum proposal.", z.object({ proposalId: studentId, decision: z.enum(["approved", "rejected"]), reviewerId: studentId, note: z.string().min(1), now }), async (input: any) => service.decideCurriculumRevision(input));
  register("activate_curriculum_revision", "Activate an approved immutable revision, or append a rollback activation to a previously approved revision.", z.object({ proposalId: studentId.optional(), revisionId: studentId.optional(), actorId: studentId, reason: z.string().min(1), action: z.enum(["activate", "rollback"]).optional(), now }), async (input: any) => service.activateCurriculumRevision(input));
  register("apply_learning_directive", "Append an adult directive to introduce, prioritize, defer, or clear a concept without claiming prerequisite mastery.", z.object({ id: studentId, studentId, conceptId: studentId, action: z.enum(["introduce", "assess", "prioritize", "defer", "clear"]), reason: z.string().min(1), authorId: studentId, requestedStage: z.string().min(1).optional(), priority: z.number().int().min(1).max(5).optional(), expiresAt: now, operationKey }), async (input: any) => service.applyLearningDirective(input));
  register("recommend_next_activity", "Rank locally stored activities using progress, review timing, session length, recent repetition, subject balance, and adult goals.", z.object({ studentId, now, availableMinutes: z.number().int().min(1).max(120).optional(), preferredSubject: z.string().min(1).optional(), adultGoalConceptIds: z.array(studentId).optional() }), async ({ studentId: id, ...options }: { studentId: string; now?: string; availableMinutes?: number; preferredSubject?: string; adultGoalConceptIds?: string[] }) => service.recommendNextActivity(id, options));
  register("get_timeline", "Read the append-only student timeline.", z.object({ studentId }), async ({ studentId: id }: { studentId: string }) => service.getTimeline(id));
  register("get_artifact_lineage", "Inspect local parent and child edges for a stored artifact.", z.object({ artifactId: studentId }), async ({ artifactId }: { artifactId: string }) => service.getArtifactLineage(artifactId));
  register("apply_override", "Append a clearly attributed adult override; never edit prior decisions.", z.object({ id: studentId, studentId, conceptId: studentId, targetStep: z.number().int().min(0).max(10), targetId: studentId.optional(), reason: z.string().min(1), authorId: studentId, operationKey }), async (input: any) => service.applyOverride(input));
  register("reverse_override", "Append a reversal of an override; never delete or mutate the original.", z.object({ id: studentId, studentId, conceptId: studentId, targetId: studentId, reason: z.string().min(1), authorId: studentId, operationKey }), async (input: any) => service.reverseOverride(input));
  register("generate_progress_report", "Create an immutable current, monthly, or quarterly report using only evidence available by the selected cutoff.", z.object({ studentId, kind: z.enum(["current", "monthly", "quarterly"]).default("current"), selectedDate: z.string().date(), timeZone: z.string().min(1).default("UTC") }), async ({ studentId: id, ...options }: { studentId: string; kind: "current" | "monthly" | "quarterly"; selectedDate: string; timeZone: string }) => service.generateProgressReport(id, options));
  register("compose_visual_asset", "Compose original local SVG from allow-listed semantic shapes and store it locally; no external assets.", z.object({ id: studentId.optional(), width: z.number().int().min(1).max(2000).optional(), height: z.number().int().min(1).max(2000).optional(), shapes: z.array(z.record(z.string(), z.unknown())).min(1), metadata: z.record(z.string(), z.unknown()).optional() }), async (input: any) => service.composeVisualAsset(input));

  server.registerResource("data-status", "child-learning://data/status", { title: "Child learning data status", description: "Local database status and counts", mimeType: "application/json" }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(service.dataStatus()) }] }));
  const studentTemplate = new ResourceTemplate("child-learning://students/{studentId}/progress", { list: undefined });
  server.registerResource("student-progress", studentTemplate, { title: "Student progress", description: "Child-safe local progress state", mimeType: "application/json" }, async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(service.getProgress(String(variables.studentId))) }] }));
  const learningPathTemplate = new ResourceTemplate("child-learning://students/{studentId}/learning-path", { list: undefined });
  server.registerResource("student-learning-path", learningPathTemplate, { title: "Student learning path", description: "Capability-based concept availability and representation stages", mimeType: "application/json" }, async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(service.getLearningPath(String(variables.studentId))) }] }));
  const activityTemplate = new ResourceTemplate("child-learning://activities/{activityId}", { list: undefined });
  server.registerResource("activity-spec", activityTemplate, { title: "Activity specification", description: "Child-safe activity specification", mimeType: "application/json" }, async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(service.getActivity(String(variables.activityId), false)) }] }));
  const roadmapTemplate = new ResourceTemplate("child-learning://students/{studentId}/roadmap", { list: undefined });
  server.registerResource("student-roadmap", roadmapTemplate, { title: "Student learning roadmap", description: "Child-safe per-subject graph with completed, current, and upcoming learning", mimeType: "application/json" }, async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(service.getLearningRoadmaps(String(variables.studentId), false)) }] }));
  const lineageTemplate = new ResourceTemplate("child-learning://artifacts/{artifactId}/lineage", { list: undefined });
  server.registerResource("artifact-lineage", lineageTemplate, { title: "Artifact lineage", description: "Local artifact ancestry and descendants", mimeType: "application/json" }, async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(await service.getArtifactLineage(String(variables.artifactId))) }] }));

  const legacyProgress = new ResourceTemplate("kindergarten://students/{studentId}/progress", { list: undefined });
  server.registerResource("legacy-student-progress", legacyProgress, { title: "Legacy student progress alias", description: "Read-only compatibility alias", mimeType: "application/json" }, async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(service.getProgress(String(variables.studentId))) }] }));
  const legacyPath = new ResourceTemplate("kindergarten://students/{studentId}/learning-path", { list: undefined });
  server.registerResource("legacy-student-learning-path", legacyPath, { title: "Legacy learning path alias", description: "Read-only compatibility alias", mimeType: "application/json" }, async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(service.getLearningPath(String(variables.studentId))) }] }));
  const legacyActivity = new ResourceTemplate("kindergarten://activities/{activityId}", { list: undefined });
  server.registerResource("legacy-activity-spec", legacyActivity, { title: "Legacy activity alias", description: "Read-only compatibility alias", mimeType: "application/json" }, async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(service.getActivity(String(variables.activityId), false)) }] }));
  const legacyLineage = new ResourceTemplate("kindergarten://artifacts/{artifactId}/lineage", { list: undefined });
  server.registerResource("legacy-artifact-lineage", legacyLineage, { title: "Legacy artifact lineage alias", description: "Read-only compatibility alias", mimeType: "application/json" }, async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(await service.getArtifactLineage(String(variables.artifactId))) }] }));
  return server;
}

export async function runStdio(service?: LocalService): Promise<void> {
  const ownedService = service ?? createLocalService({ projectRoot: resolveProjectRoot() });
  const server = createMcpServer(ownedService);
  const transport = new StdioServerTransport();
  process.once("SIGINT", () => { ownedService.close(); process.exit(0); });
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) runStdio().catch((error: unknown) => { process.stderr.write(`child-learning-local MCP failed: ${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
