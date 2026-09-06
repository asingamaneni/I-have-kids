import { z } from "zod";

export const IdSchema = z.string().min(1);
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export const SubjectSchema = z.enum(["math", "english", "reasoning", "science"]);
export const ActivityGenerationRequestSchema = z.object({
  studentId: IdSchema.optional(),
  subject: SubjectSchema.optional(),
  conceptId: IdSchema.optional(),
  generator: IdSchema.optional(),
  seed: z.number().int().optional(),
  itemCount: z.number().int().min(1).max(40).optional(),
  representationStage: z.enum(["concrete", "pictorial", "abstract"]).optional(),
}).strict();
export type ActivityGenerationRequest = z.infer<typeof ActivityGenerationRequestSchema>;
export const EvidenceStatusSchema = z.enum(["confirmed", "unconfirmed", "ambiguous"]);
export const EvaluatorTypeSchema = z.enum(["deterministic", "review_gated_precheck", "human", "hybrid", "claude_code_assisted"]);
export const ActivityTypeSchema = z.enum(["introduction", "practice", "review", "assessment", "application"]);
export const RepresentationStageSchema = z.enum(["concrete", "pictorial", "abstract"]);
export type RepresentationStage = z.infer<typeof RepresentationStageSchema>;
export const DeliveryModeSchema = z.enum(["hands-on", "guided-screen", "worksheet"]);
export const EvidencePurposeSchema = z.enum(["exploration", "formative", "mastery", "review"]);
export const HandsOnPresentationSchema = z.object({
  materials: z.array(z.string().min(1)).min(1),
  childInvitation: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  adultGuide: z.string().min(1).optional(),
  observationPrompt: z.string().min(1).optional(),
});
export const VisualSupportSchema = z.union([
  z.boolean(),
  z.object({ enabled: z.boolean(), assetRefs: z.array(z.string()).default([]), description: z.string().optional() }),
]);
export const SourceMetadataSchema = z.object({
  origin: z.string().min(1),
  provenance: z.string().optional(),
  attribution: z.string().optional(),
  notes: z.string().optional(),
}).default({ origin: "original" });

export const CapabilityClaimSchema = z.enum([
  "math.counts-to-10",
  "math.recognizes-teen-numbers",
  "math.adds-with-objects",
  "math.adds-with-symbols",
  "math.subtracts-with-objects",
  "math.subtracts-with-symbols",
  "english.hears-beginning-sounds",
  "english.reads-short-text",
  "english.writes-letters-words",
  "reasoning.continues-patterns",
  "reasoning.sorts-and-explains",
  "science.observes-and-describes",
]);
export type CapabilityClaim = z.infer<typeof CapabilityClaimSchema>;

export const StudentSchema = z.object({
  id: IdSchema,
  displayName: z.string().min(1),
  birthDate: z.string().date().optional(),
  gradeBand: z.string().min(1).default("kindergarten"),
  preferredLanguage: z.string().min(2).default("en"),
  accommodations: z.array(z.string()).default([]),
  reportedCapabilities: z.array(CapabilityClaimSchema).default([]),
  baselineNotes: z.string().min(1).optional(),
  baselineStatus: z.enum(["unassessed", "diagnostic-in-progress", "established"]).default("unassessed"),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Student = z.infer<typeof StudentSchema>;
export const StudentCreateRequestSchema = z.object({ id: IdSchema.optional(), displayName: z.string().min(1), birthDate: z.string().date().optional(), schoolPlacement: z.string().min(1).optional(), preferredLanguage: z.string().min(2).optional(), accommodations: z.array(z.string().min(1)).optional(), currentCapabilities: z.array(CapabilityClaimSchema).max(12).optional(), baselineNotes: z.string().min(1).max(1000).optional() }).strict();
export type StudentCreateRequest = z.infer<typeof StudentCreateRequestSchema>;

export const ActivityKindSchema = z.enum([
  "picture-addition-subtraction",
  "number-choice",
  "equation",
  "equal-groups-fair-sharing",
  "phonics-picture-word",
  "handwriting-writing",
  "reading-comprehension",
  "sequencing-reasoning",
  "science-observation",
]);

const ItemBaseSchema = z.object({
  id: IdSchema,
  conceptId: IdSchema,
  prompt: z.string().min(1),
  directions: z.string().min(1).optional(),
  assetRefs: z.array(z.string()).default([]),
  difficulty: z.number().int().min(0).max(10).default(0),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const PictureAdditionSubtractionItemSchema = ItemBaseSchema.extend({
  kind: z.literal("picture-addition-subtraction"),
  operation: z.enum(["addition", "subtraction"]),
  leftCount: z.number().int().min(0).max(20),
  rightCount: z.number().int().min(0).max(20),
  result: z.number().int().min(0).max(20),
  representation: z.enum(["pictures", "pictures-and-equation"]).default("pictures"),
});
const NumberChoiceItemSchema = ItemBaseSchema.extend({
  kind: z.literal("number-choice"),
  choices: z.array(z.number().int()).min(2),
  correctChoice: z.number().int(),
});
const EquationItemSchema = ItemBaseSchema.extend({
  kind: z.literal("equation"),
  equation: z.string().min(1),
  answer: z.number(),
});
const EqualGroupsFairSharingItemSchema = ItemBaseSchema.extend({
  kind: z.literal("equal-groups-fair-sharing"),
  mode: z.enum(["equal-groups", "fair-sharing"]),
  total: z.number().int().min(1).max(100),
  groupCount: z.number().int().min(1).max(20),
  amountPerGroup: z.number().int().min(0).max(100),
  readinessConceptId: IdSchema.optional(),
});
const PhonicsPictureWordItemSchema = ItemBaseSchema.extend({
  kind: z.literal("phonics-picture-word"),
  targetWord: z.string().min(1),
  targetSound: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).optional(),
  imageAssetRef: z.string().min(1),
});
const HandwritingWritingItemSchema = ItemBaseSchema.extend({
  kind: z.literal("handwriting-writing"),
  mode: z.enum(["trace", "copy", "free-write"]),
  targetText: z.string().min(1),
  rubricId: IdSchema,
});
const ReadingComprehensionItemSchema = ItemBaseSchema.extend({
  kind: z.literal("reading-comprehension"),
  passage: z.string().min(1),
  question: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).optional(),
  correctAnswer: z.string().min(1),
});
const SequencingReasoningItemSchema = ItemBaseSchema.extend({
  kind: z.literal("sequencing-reasoning"),
  sequence: z.array(z.string().min(1)).min(2),
  answer: z.array(z.number().int().min(0)),
  reasoningType: z.enum(["sequence", "pattern", "classification", "cause-effect"]),
});
const ScienceObservationItemSchema = ItemBaseSchema.extend({
  kind: z.literal("science-observation"),
  observationPrompt: z.string().min(1),
  observableFeatures: z.array(z.string().min(1)).min(1),
  expectedObservations: z.array(z.string().min(1)).min(1),
  safetyNote: z.string().min(1).optional(),
});

export const ActivityItemSchema = z.discriminatedUnion("kind", [
  PictureAdditionSubtractionItemSchema,
  NumberChoiceItemSchema,
  EquationItemSchema,
  EqualGroupsFairSharingItemSchema,
  PhonicsPictureWordItemSchema,
  HandwritingWritingItemSchema,
  ReadingComprehensionItemSchema,
  SequencingReasoningItemSchema,
  ScienceObservationItemSchema,
]);
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const AnswerSpecSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("integer"), expected: z.number().int() }),
  z.object({ type: z.literal("number"), expected: z.number() }),
  z.object({ type: z.literal("text"), expected: z.string(), normalize: z.enum(["exact", "case-insensitive", "trimmed"]).default("trimmed") }),
  z.object({ type: z.literal("choice"), expected: z.string().min(1) }),
  z.object({ type: z.literal("sequence"), expected: z.array(z.number().int()) }),
  z.object({ type: z.literal("rubric"), rubricId: IdSchema, requiresHumanReview: z.literal(true).default(true) }),
  z.object({ type: z.literal("observation"), acceptedFeatures: z.array(z.string()).min(1), requiresHumanReview: z.literal(true).default(true) }),
]);
export type AnswerSpec = z.infer<typeof AnswerSpecSchema>;

export const ScoringSpecSchema = z.object({
  method: z.enum(["exact", "normalized-text", "sequence", "rubric", "observation"]),
  maxScore: z.number().positive().default(1),
  passThreshold: z.number().min(0).max(1).default(0.9),
  mistakeTags: z.array(z.string()).default([]),
});
export type ScoringSpec = z.infer<typeof ScoringSpecSchema>;

export const ActivitySpecSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: IdSchema,
  studentId: IdSchema.default("unassigned"),
  subject: SubjectSchema,
  conceptId: IdSchema,
  title: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1).default(["Practice the target concept."]),
  difficultyLevel: z.number().int().min(0).max(10).default(0),
  estimatedMinutes: z.number().int().positive().default(10),
  activityType: ActivityTypeSchema.default("practice"),
  representationStage: RepresentationStageSchema.optional(),
  deliveryMode: DeliveryModeSchema.optional(),
  evidencePurpose: EvidencePurposeSchema.optional(),
  presentation: HandsOnPresentationSchema.optional(),
  curriculumVersion: z.string().min(1).optional(),
  visualSupport: VisualSupportSchema.default(true),
  instructions: z.array(z.string().min(1)).min(1).default(["Try each item."]),
  items: z.array(ActivityItemSchema).min(1).max(40),
  answerSpecs: z.record(z.string(), AnswerSpecSchema),
  scoring: ScoringSpecSchema,
  prerequisiteConceptIds: z.array(IdSchema).default([]),
  comparabilityKey: z.string().min(1).default("unspecified"),
  rationale: z.string().min(1).default("Selected from the curriculum.") ,
  source: z.enum(["curriculum", "generated", "human"]).default("curriculum"),
  sourceMetadata: SourceMetadataSchema,
  generator: z.object({ name: z.string().min(1), version: z.string().min(1) }).optional(),
  seed: z.number().int().optional(),
  createdAt: IsoDateTimeSchema,
});
export type ActivitySpec = z.infer<typeof ActivitySpecSchema>;

const ChildItemMetadataSchema = z.object({ generator: z.string().optional(), seed: z.number().int().optional(), dotCount: z.number().int().min(0).max(100).optional() });
const ChildPictureAdditionSubtractionItemSchema = PictureAdditionSubtractionItemSchema.omit({ result: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildNumberChoiceItemSchema = NumberChoiceItemSchema.omit({ correctChoice: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildEquationItemSchema = EquationItemSchema.omit({ answer: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildEqualGroupsFairSharingItemSchema = EqualGroupsFairSharingItemSchema.omit({ amountPerGroup: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildPhonicsPictureWordItemSchema = PhonicsPictureWordItemSchema.omit({ targetSound: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildHandwritingWritingItemSchema = HandwritingWritingItemSchema.extend({ metadata: ChildItemMetadataSchema });
const ChildReadingComprehensionItemSchema = ReadingComprehensionItemSchema.omit({ correctAnswer: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildSequencingReasoningItemSchema = SequencingReasoningItemSchema.omit({ answer: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildScienceObservationItemSchema = ScienceObservationItemSchema.omit({ expectedObservations: true }).extend({ metadata: ChildItemMetadataSchema });

export const ChildActivityItemSchema = z.discriminatedUnion("kind", [
  ChildPictureAdditionSubtractionItemSchema,
  ChildNumberChoiceItemSchema,
  ChildEquationItemSchema,
  ChildEqualGroupsFairSharingItemSchema,
  ChildPhonicsPictureWordItemSchema,
  ChildHandwritingWritingItemSchema,
  ChildReadingComprehensionItemSchema,
  ChildSequencingReasoningItemSchema,
  ChildScienceObservationItemSchema,
]);
export type ChildActivityItem = z.infer<typeof ChildActivityItemSchema>;

const ChildHandsOnPresentationSchema = HandsOnPresentationSchema.omit({ adultGuide: true, observationPrompt: true });
export const ChildActivitySpecSchema = ActivitySpecSchema.omit({ answerSpecs: true, items: true, presentation: true }).extend({
  items: z.array(ChildActivityItemSchema).min(1).max(40),
  presentation: ChildHandsOnPresentationSchema.optional(),
});
export type ChildActivitySpec = z.infer<typeof ChildActivitySpecSchema>;

export function toChildActivitySpec(activity: ActivitySpec): ChildActivitySpec {
  const items = activity.items.map((item) => ChildActivityItemSchema.parse(item));
  return ChildActivitySpecSchema.parse({ ...activity, items });
}

export const SubmissionResponseSchema = z.object({ itemId: IdSchema, value: z.unknown(), capturedAt: IsoDateTimeSchema });
const SubmissionResponsesSchema = z.array(SubmissionResponseSchema).max(40).superRefine((responses, context) => {
  const ids = new Set<string>();
  for (const [index, response] of responses.entries()) {
    if (ids.has(response.itemId)) context.addIssue({ code: "custom", message: "response item ids must be unique", path: [index, "itemId"] });
    ids.add(response.itemId);
  }
});
export const SubmissionSchema = z.object({
  id: IdSchema,
  activityId: IdSchema,
  studentId: IdSchema,
  responses: SubmissionResponsesSchema,
  submittedAt: IsoDateTimeSchema,
  artifactId: IdSchema.optional(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export const EvaluationItemSchema = z.object({
  itemId: IdSchema,
  score: z.number().min(0).max(1),
  mistakeTags: z.array(z.string()).default([]),
  evidenceStatus: EvidenceStatusSchema,
  rationale: z.string().min(1),
});
export const EvaluationFollowUpSchema = z.object({
  required: z.boolean().default(false),
  reason: z.string().optional(),
  recommendedActivityIds: z.array(IdSchema).default([]),
});
export const EvaluationSchema = z.object({
  id: IdSchema,
  submissionId: IdSchema,
  studentId: IdSchema,
  conceptId: IdSchema,
  score: z.number().min(0).max(1),
  items: z.array(EvaluationItemSchema).min(1),
  evidence: z.array(z.string().min(1)).default([]),
  confidence: z.number().min(0).max(1),
  evaluatorType: EvaluatorTypeSchema,
  status: z.enum(["draft", "final", "needs-human-review", "superseded"]).default("final"),
  version: z.string().min(1).default("1.0"),
  supersedesEvaluationId: IdSchema.optional(),
  followUp: EvaluationFollowUpSchema.default({ required: false, recommendedActivityIds: [] }),
  evaluatedAt: IsoDateTimeSchema,
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const ProgressStateSnapshotSchema = z.object({
  step: z.number().int().min(0).max(10),
  status: z.enum(["new", "learning", "secure", "revisit"]),
});
export const ProgressEventSchema = z.object({
  id: IdSchema,
  studentId: IdSchema,
  conceptId: IdSchema,
  evaluationId: IdSchema.optional(),
  score: z.number().min(0).max(1).optional(),
  eventType: z.enum(["observation", "evaluation", "human-override", "state-decision", "review", "reset"]).default("observation"),
  comparable: z.boolean().default(true),
  evidenceStatus: EvidenceStatusSchema,
  confidence: z.number().min(0).max(1).optional(),
  previousState: ProgressStateSnapshotSchema.optional(),
  newState: ProgressStateSnapshotSchema.optional(),
  policyVersion: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  comparabilityKey: z.string().min(1).optional(),
  occurredAt: IsoDateTimeSchema,
});
export type ProgressEvent = z.infer<typeof ProgressEventSchema>;

export const StudentConceptStateSchema = z.object({
  studentId: IdSchema,
  conceptId: IdSchema,
  step: z.number().int().min(0).max(10),
  status: z.enum(["new", "learning", "secure", "revisit"]),
  recentScores: z.array(z.number().min(0).max(1)).max(60).default([]),
  lastEvidenceAt: IsoDateTimeSchema.optional(),
  lastReviewedAt: IsoDateTimeSchema.optional(),
  updatedAt: IsoDateTimeSchema,
});
export type StudentConceptState = z.infer<typeof StudentConceptStateSchema>;

export const ProgressionPolicySchema = z.object({
  schemaVersion: z.literal("1.0"),
  consecutiveToAdvance: z.literal(3),
  advanceThreshold: z.literal(0.9),
  maintainMin: z.literal(0.75),
  targetedPracticeMin: z.literal(0.6),
  evidenceMinForRevisit: z.number().min(0).max(1).default(0.7),
  maxStepChange: z.literal(1),
});
export type ProgressionPolicy = z.infer<typeof ProgressionPolicySchema>;

export const RecommendationReasonSchema = z.object({ code: z.enum(["review-due", "targeted-practice", "revisit", "next-step", "prerequisite", "variety", "session-fit", "subject-balance", "recent-repetition", "adult-goal"]), message: z.string().min(1), weight: z.number() });
export const RecommendationCandidateSchema = z.object({ activityId: IdSchema, conceptId: IdSchema, score: z.number(), reasons: z.array(RecommendationReasonSchema).min(1) });
export const RecommendationSchema = z.object({
  id: IdSchema,
  studentId: IdSchema,
  candidates: z.array(RecommendationCandidateSchema),
  selectedActivityId: IdSchema.optional(),
  conciseReason: z.string().min(1).default("Selected to support the next learning step."),
  generatedAt: IsoDateTimeSchema,
  policyVersion: z.string().min(1),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const ArtifactLineageSchema = z.object({
  artifactId: IdSchema,
  parentArtifactId: IdSchema.optional(),
  relation: z.enum(["derived-from", "generated-from", "submitted-from", "evaluated-from", "corrected-from", "exported-from", "supports"]).default("derived-from"),
  operation: z.enum(["generated", "submitted", "evaluated", "corrected", "exported", "overridden", "reviewed"]).default("generated"),
  actor: z.enum(["system", "student", "caregiver", "teacher", "claude_code_assisted"]).default("system"),
  createdAt: IsoDateTimeSchema,
});
export const ArtifactSchema = z.object({ id: IdSchema, studentId: IdSchema, kind: z.enum(["activity", "activity-spec", "worksheet", "submission", "evaluation", "report", "report-snapshot", "asset", "override", "progress-event"]), uri: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(), lineage: z.array(ArtifactLineageSchema).min(1), createdAt: IsoDateTimeSchema });
export type Artifact = z.infer<typeof ArtifactSchema>;

export const HumanOverrideSchema = z.object({ id: IdSchema, studentId: IdSchema, conceptId: IdSchema, targetStep: z.number().int().min(0).max(10), reason: z.string().min(1), authorId: IdSchema, createdAt: IsoDateTimeSchema, expiresAt: IsoDateTimeSchema.optional() });
export type HumanOverride = z.infer<typeof HumanOverrideSchema>;

export const ConceptAvailabilitySchema = z.object({
  conceptId: IdSchema,
  subject: SubjectSchema,
  title: z.string().min(1),
  status: z.enum(["locked", "available", "active", "secure", "deferred"]),
  currentStage: RepresentationStageSchema,
  unmetPrerequisiteIds: z.array(IdSchema),
  reason: z.string().min(1),
  introducedEarly: z.boolean().default(false),
  priority: z.number().int().min(0).max(5).default(0),
});
export type ConceptAvailability = z.infer<typeof ConceptAvailabilitySchema>;

export const ReportEvidenceSchema = z.object({ conceptId: IdSchema, recentScores: z.array(z.number().min(0).max(1)), trend: z.enum(["up", "down", "flat", "insufficient-data"]), evidenceCount: z.number().int().min(0) });
export const ReportWorksheetSummarySchema = z.object({
  submissionId: IdSchema,
  activityId: IdSchema,
  title: z.string().min(1),
  subject: SubjectSchema,
  conceptId: IdSchema,
  submittedAt: IsoDateTimeSchema,
  evaluationId: IdSchema.optional(),
  score: z.number().min(0).max(1).optional(),
  status: z.enum(["not-evaluated", "draft", "needs-human-review", "final", "superseded"]),
  correctItems: z.number().int().min(0).optional(),
  totalItems: z.number().int().min(0),
});
export const ReportSnapshotSchema = z.object({
  id: IdSchema,
  studentId: IdSchema,
  asOf: IsoDateTimeSchema,
  conceptStates: z.array(StudentConceptStateSchema),
  evidence: z.array(ReportEvidenceSchema).default([]),
  strengths: z.array(z.string()).default([]),
  needsPractice: z.array(z.string()).default([]),
  recommendedNextSteps: z.array(z.string()).default([]),
  worksheetSummaries: z.array(ReportWorksheetSummarySchema).default([]),
  learningPath: z.array(ConceptAvailabilitySchema).default([]),
  recommendation: RecommendationSchema.optional(),
  summary: z.string().min(1),
  artifactId: IdSchema.optional(),
});
export type ReportSnapshot = z.infer<typeof ReportSnapshotSchema>;

export const CurriculumStageSchema = z.object({
  stage: RepresentationStageSchema,
  deliveryMode: DeliveryModeSchema,
  evidencePurpose: EvidencePurposeSchema,
  generator: IdSchema,
  minimumConfirmed: z.number().int().min(1).max(10).default(1),
  minimumAverage: z.number().min(0).max(1).default(0.8),
});
export const CurriculumConceptSchema = z.object({
  id: IdSchema,
  subject: SubjectSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  step: z.number().int().min(0).max(100),
  prerequisites: z.array(IdSchema).default([]),
  readinessConceptIds: z.array(IdSchema).default([]),
  activityKinds: z.array(ActivityKindSchema).min(1),
  allowEarlyIntroduction: z.boolean().default(true),
  stages: z.array(CurriculumStageSchema).min(1).default([{ stage: "pictorial", deliveryMode: "worksheet", evidencePurpose: "mastery", generator: "default", minimumConfirmed: 3, minimumAverage: 0.9 }]),
});
export const CurriculumDefinitionSchema = z.object({ schemaVersion: z.literal("1.0"), subject: SubjectSchema, title: z.string().min(1), concepts: z.array(CurriculumConceptSchema).min(1) });
export type CurriculumDefinition = z.infer<typeof CurriculumDefinitionSchema>;
export type CurriculumConcept = z.infer<typeof CurriculumConceptSchema>;

export const LearningDirectiveSchema = z.object({
  id: IdSchema,
  studentId: IdSchema,
  conceptId: IdSchema,
  action: z.enum(["introduce", "assess", "prioritize", "defer", "clear"]),
  reason: z.string().min(1),
  authorId: IdSchema,
  requestedStage: RepresentationStageSchema.optional(),
  priority: z.number().int().min(1).max(5).optional(),
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema.optional(),
});
export type LearningDirective = z.infer<typeof LearningDirectiveSchema>;
export const LearningDirectiveRequestSchema = LearningDirectiveSchema.omit({ id: true, createdAt: true }).extend({ id: IdSchema.optional(), authorId: IdSchema.default("local-adult") }).strict();

export type PictureAdditionSubtractionItem = z.infer<typeof PictureAdditionSubtractionItemSchema>;
export type PhonicsPictureWordItem = z.infer<typeof PhonicsPictureWordItemSchema>;
