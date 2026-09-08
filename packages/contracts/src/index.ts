import { z } from "zod";

export const IdSchema = z.string().min(1);
export const RegistryIdSchema = z.string().min(1).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export const SubjectSchema = RegistryIdSchema;
export const RepresentationStageSchema = RegistryIdSchema;
export type RepresentationStage = z.infer<typeof RepresentationStageSchema>;
export const DeliveryModeSchema = RegistryIdSchema;
export const ActivityGenerationRequestSchema = z.object({
  studentId: IdSchema.optional(),
  subject: SubjectSchema.optional(),
  conceptId: IdSchema.optional(),
  generator: IdSchema.optional(),
  seed: z.number().int().optional(),
  itemCount: z.number().int().min(1).max(40).optional(),
  representationStage: RepresentationStageSchema.optional(),
}).strict();
export type ActivityGenerationRequest = z.infer<typeof ActivityGenerationRequestSchema>;
export const EvidenceStatusSchema = z.enum(["confirmed", "unconfirmed", "ambiguous"]);
export const EvaluatorTypeSchema = z.enum(["deterministic", "review_gated_precheck", "human", "hybrid", "claude_code_assisted"]);
export const ActivityTypeSchema = z.enum(["introduction", "practice", "review", "assessment", "application"]);
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

export const CapabilityClaimSchema = RegistryIdSchema;
export type CapabilityClaim = z.infer<typeof CapabilityClaimSchema>;
export const DEFAULT_ACTIVITY_ITEM_COUNT = 20;
export const LearnerDataScopeSchema = z.enum(["household", "demo", "legacy-mixed"]);
export type LearnerDataScope = z.infer<typeof LearnerDataScopeSchema>;
export const BaselineStatusSchema = z.enum(["awaiting-intake", "unassessed", "diagnostic-in-progress", "established"]);
export const IntakeAnchorSchema = z.object({
  subject: SubjectSchema,
  capabilityId: CapabilityClaimSchema.optional(),
  entryDiagnostic: z.boolean().default(false),
}).refine((value) => Boolean(value.capabilityId) !== value.entryDiagnostic, { message: "Choose either a capability or the subject entry diagnostic." });
export const LearnerIntakeSchema = z.object({
  observedCapabilities: z.array(CapabilityClaimSchema).max(100).default([]),
  questionnaireAnchors: z.array(IntakeAnchorSchema).max(30).default([]),
  source: z.enum(["adult-observation", "questionnaire", "combined"]).default("adult-observation"),
}).strict();
export type LearnerIntake = z.infer<typeof LearnerIntakeSchema>;

export const StudentSchema = z.object({
  id: IdSchema,
  displayName: z.string().min(1),
  birthDate: z.string().date().optional(),
  gradeBand: z.string().min(1).default("school-age"),
  preferredLanguage: z.string().min(2).default("en"),
  accommodations: z.array(z.string()).default([]),
  interests: z.array(z.string().min(1)).default([]),
  learningGoals: z.array(z.string().min(1)).default([]),
  selectedSubjects: z.array(SubjectSchema).default([]),
  reportedCapabilities: z.array(CapabilityClaimSchema).default([]),
  baselineNotes: z.string().min(1).optional(),
  baselineStatus: BaselineStatusSchema.default("awaiting-intake"),
  dataScope: LearnerDataScopeSchema.default("household"),
  sourceDatasetId: IdSchema.optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Student = z.infer<typeof StudentSchema>;
export const StudentCreateRequestSchema = z.object({ id: IdSchema.optional(), displayName: z.string().min(1), birthDate: z.string().date().optional(), schoolPlacement: z.string().min(1).optional(), preferredLanguage: z.string().min(2).optional(), accommodations: z.array(z.string().min(1)).optional(), interests: z.array(z.string().min(1)).max(30).optional(), learningGoals: z.array(z.string().min(1)).max(30).optional(), selectedSubjects: z.array(SubjectSchema).max(30).optional(), currentCapabilities: z.array(CapabilityClaimSchema).max(100).optional(), intake: LearnerIntakeSchema.optional(), baselineNotes: z.string().min(1).max(2000).optional() }).strict();
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
  "selected-response",
  "numeric-response",
  "short-response",
  "extended-response",
  "ordering",
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
const SelectedResponseItemSchema = ItemBaseSchema.extend({
  kind: z.literal("selected-response"),
  choices: z.array(z.string().min(1)).min(2),
  correctChoice: z.string().min(1),
  content: z.string().min(1).optional(),
});
const NumericResponseItemSchema = ItemBaseSchema.extend({
  kind: z.literal("numeric-response"),
  expected: z.number(),
  tolerance: z.number().min(0).default(0),
  unit: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});
const ShortResponseItemSchema = ItemBaseSchema.extend({
  kind: z.literal("short-response"),
  expectedAnswers: z.array(z.string().min(1)).min(1),
  normalize: z.enum(["exact", "case-insensitive", "trimmed"]).default("trimmed"),
  content: z.string().min(1).optional(),
});
const ExtendedResponseItemSchema = ItemBaseSchema.extend({
  kind: z.literal("extended-response"),
  rubricId: IdSchema,
  content: z.string().min(1).optional(),
  minimumLines: z.number().int().min(1).max(20).default(3),
});
const OrderingItemSchema = ItemBaseSchema.extend({
  kind: z.literal("ordering"),
  options: z.array(z.string().min(1)).min(2),
  correctOrder: z.array(z.number().int().min(0)).min(2),
  content: z.string().min(1).optional(),
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
  SelectedResponseItemSchema,
  NumericResponseItemSchema,
  ShortResponseItemSchema,
  ExtendedResponseItemSchema,
  OrderingItemSchema,
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

export const CurriculumReferenceSchema = z.object({
  packId: RegistryIdSchema,
  revisionId: IdSchema,
  nodeRevisionId: IdSchema,
});
export const ChildGuideSchema = z.object({
  title: z.string().min(1),
  conceptSummary: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  example: z.object({ prompt: z.string().min(1), explanation: z.string().min(1) }).optional(),
  remember: z.string().min(1).optional(),
  visualAssetRefs: z.array(z.string().min(1)).default([]),
  printable: z.boolean().default(true),
});
export type ChildGuide = z.infer<typeof ChildGuideSchema>;

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
  childGuide: ChildGuideSchema.optional(),
  curriculumVersion: z.string().min(1).optional(),
  curriculumRef: CurriculumReferenceSchema.optional(),
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
const ChildSelectedResponseItemSchema = SelectedResponseItemSchema.omit({ correctChoice: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildNumericResponseItemSchema = NumericResponseItemSchema.omit({ expected: true, tolerance: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildShortResponseItemSchema = ShortResponseItemSchema.omit({ expectedAnswers: true, normalize: true }).extend({ metadata: ChildItemMetadataSchema });
const ChildExtendedResponseItemSchema = ExtendedResponseItemSchema.extend({ metadata: ChildItemMetadataSchema });
const ChildOrderingItemSchema = OrderingItemSchema.omit({ correctOrder: true }).extend({ metadata: ChildItemMetadataSchema });

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
  ChildSelectedResponseItemSchema,
  ChildNumericResponseItemSchema,
  ChildShortResponseItemSchema,
  ChildExtendedResponseItemSchema,
  ChildOrderingItemSchema,
]);
export type ChildActivityItem = z.infer<typeof ChildActivityItemSchema>;

const ChildHandsOnPresentationSchema = HandsOnPresentationSchema.omit({ adultGuide: true, observationPrompt: true });
export const ChildActivitySpecSchema = ActivitySpecSchema.pick({
  schemaVersion: true,
  id: true,
  studentId: true,
  subject: true,
  conceptId: true,
  title: true,
  objectives: true,
  estimatedMinutes: true,
  activityType: true,
  representationStage: true,
  deliveryMode: true,
  visualSupport: true,
  instructions: true,
  childGuide: true,
  createdAt: true,
}).extend({
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
  retryOfSubmissionId: IdSchema.optional(),
});
export type Submission = z.infer<typeof SubmissionSchema>;
export const ActivityLifecycleStatusSchema = z.enum(["not-attempted", "awaiting-validation", "corrections-needed", "complete"]);
export type ActivityLifecycleStatus = z.infer<typeof ActivityLifecycleStatusSchema>;
export const ChildActivityLifecycleSchema = z.object({
  activity: ChildActivitySpecSchema,
  status: ActivityLifecycleStatusSchema,
  statusLabel: z.string().min(1),
  actionLabel: z.string().min(1),
  attemptCount: z.number().int().min(0),
  latestSubmissionId: IdSchema.optional(),
  latestAttemptAt: IsoDateTimeSchema.optional(),
  recommended: z.boolean().default(false),
  recommendationRank: z.number().int().positive().optional(),
});
export type ChildActivityLifecycle = z.infer<typeof ChildActivityLifecycleSchema>;

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
  relation: z.enum(["derived-from", "generated-from", "submitted-from", "retry-of", "evaluated-from", "corrected-from", "exported-from", "supports", "revises", "activates", "projects"]).default("derived-from"),
  operation: z.enum(["generated", "submitted", "evaluated", "corrected", "exported", "overridden", "reviewed", "proposed", "approved", "activated", "reconciled"]).default("generated"),
  actor: z.enum(["system", "student", "caregiver", "teacher", "claude_code_assisted"]).default("system"),
  createdAt: IsoDateTimeSchema,
});
export const ArtifactSchema = z.object({ id: IdSchema, studentId: IdSchema, kind: z.enum(["activity", "activity-spec", "worksheet", "submission", "evaluation", "report", "report-snapshot", "asset", "override", "progress-event", "curriculum-revision", "curriculum-proposal", "roadmap-revision"]), uri: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(), lineage: z.array(ArtifactLineageSchema).min(1), createdAt: IsoDateTimeSchema });
export type Artifact = z.infer<typeof ArtifactSchema>;

export const HumanOverrideSchema = z.object({ id: IdSchema, studentId: IdSchema, conceptId: IdSchema, targetStep: z.number().int().min(0).max(10), reason: z.string().min(1), authorId: IdSchema, createdAt: IsoDateTimeSchema, expiresAt: IsoDateTimeSchema.optional() });
export type HumanOverride = z.infer<typeof HumanOverrideSchema>;

export const ConceptAvailabilitySchema = z.object({
  conceptId: IdSchema,
  subject: SubjectSchema,
  title: z.string().min(1),
  status: z.enum(["locked", "available", "active", "secure", "deferred"]),
  currentStage: RepresentationStageSchema,
  stageOrder: z.array(RepresentationStageSchema).min(1).default(["concrete", "pictorial", "abstract"]),
  branchKind: z.enum(["core", "extension", "review", "interest"]).default("core"),
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
export const ReportKindSchema = z.enum(["current", "monthly", "quarterly"]);
export const ReportPeriodSchema = z.object({
  startInclusive: IsoDateTimeSchema,
  endExclusive: IsoDateTimeSchema,
  timeZone: z.string().min(1),
  label: z.string().min(1),
}).refine((period) => Date.parse(period.startInclusive) < Date.parse(period.endExclusive), { message: "Report period must end after it starts." });
export const ReportSnapshotSchema = z.object({
  id: IdSchema,
  studentId: IdSchema,
  asOf: IsoDateTimeSchema,
  kind: ReportKindSchema.default("current"),
  period: ReportPeriodSchema.optional(),
  conceptStates: z.array(StudentConceptStateSchema),
  evidence: z.array(ReportEvidenceSchema).default([]),
  strengths: z.array(z.string()).default([]),
  needsPractice: z.array(z.string()).default([]),
  recommendedNextSteps: z.array(z.string()).default([]),
  worksheetSummaries: z.array(ReportWorksheetSummarySchema).default([]),
  learningPath: z.array(ConceptAvailabilitySchema).default([]),
  roadmapRevisionIds: z.array(IdSchema).default([]),
  recommendation: RecommendationSchema.optional(),
  summary: z.string().min(1),
  artifactId: IdSchema.optional(),
}).superRefine((report, context) => {
  if (report.kind !== "current" && !report.period) context.addIssue({ code: "custom", message: `${report.kind} reports require a period`, path: ["period"] });
});
export type ReportSnapshot = z.infer<typeof ReportSnapshotSchema>;

export const CurriculumAssessmentTargetSchema = z.object({
  claim: CapabilityClaimSchema,
  stage: RepresentationStageSchema,
  questionnairePrompt: z.string().min(1).optional(),
});
export const CurriculumStageSchema = z.object({
  stage: RepresentationStageSchema,
  title: z.string().min(1).optional(),
  childGuide: ChildGuideSchema.optional(),
  deliveryMode: DeliveryModeSchema,
  evidencePurpose: EvidencePurposeSchema,
  generator: RegistryIdSchema,
  evaluator: RegistryIdSchema.default("deterministic"),
  renderer: RegistryIdSchema.default("worksheet"),
  activityKinds: z.array(ActivityKindSchema).default([]),
  minimumConfirmed: z.number().int().min(1).max(20).default(1),
  minimumAverage: z.number().min(0).max(1).default(0.8),
  difficultyParameters: z.record(z.string(), z.unknown()).default({}),
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
  branchKind: z.enum(["core", "extension", "review", "interest"]).default("core"),
  advisoryAgeRange: z.object({ minimum: z.number().int().min(3).max(21).optional(), maximum: z.number().int().min(3).max(21).optional() }).optional(),
  assessmentClaims: z.array(CapabilityClaimSchema).default([]),
  assessmentTargets: z.array(CurriculumAssessmentTargetSchema).default([]),
  strand: RegistryIdSchema.optional(),
  phase: RegistryIdSchema.optional(),
  advisoryPracticeMinutes: z.number().int().min(1).max(180).optional(),
  consolidation: z.boolean().default(false),
  templateIds: z.array(IdSchema).default([]),
  allowEarlyIntroduction: z.boolean().default(true),
  stages: z.array(CurriculumStageSchema).min(1).default([{ stage: "pictorial", deliveryMode: "worksheet", evidencePurpose: "mastery", generator: "default", evaluator: "deterministic", renderer: "worksheet", activityKinds: [], minimumConfirmed: 3, minimumAverage: 0.9, difficultyParameters: {} }]),
});
export const CurriculumDefinitionSchema = z.object({ schemaVersion: z.literal("1.0"), subject: SubjectSchema, title: z.string().min(1), concepts: z.array(CurriculumConceptSchema).min(1) });
export type CurriculumDefinition = z.infer<typeof CurriculumDefinitionSchema>;
export type CurriculumConcept = z.infer<typeof CurriculumConceptSchema>;

export const CurriculumSubjectSchema = z.object({
  id: SubjectSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1).optional(),
});
export const CurriculumEdgeSchema = z.object({
  id: IdSchema,
  from: IdSchema,
  to: IdSchema,
  type: z.enum(["requires", "readiness", "extends", "supports", "cross-subject"]),
  label: z.string().min(1).optional(),
});
export const CurriculumActivityTemplateSchema = z.object({
  id: IdSchema,
  conceptId: IdSchema,
  stage: RepresentationStageSchema,
  title: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  instructions: z.array(z.string().min(1)).min(1),
  childGuide: ChildGuideSchema.optional(),
  activityType: ActivityTypeSchema.default("practice"),
  estimatedMinutes: z.number().int().min(1).max(180).default(15),
  items: z.array(ActivityItemSchema).min(1).max(40),
  answerSpecs: z.record(z.string(), AnswerSpecSchema),
  scoring: ScoringSpecSchema,
});
export type CurriculumActivityTemplate = z.infer<typeof CurriculumActivityTemplateSchema>;
export const CurriculumPackRevisionSchema = z.object({
  schemaVersion: z.literal("2.0"),
  id: IdSchema,
  packId: RegistryIdSchema,
  revision: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  subjects: z.array(CurriculumSubjectSchema).min(1),
  concepts: z.array(CurriculumConceptSchema).min(1),
  edges: z.array(CurriculumEdgeSchema).default([]),
  activityTemplates: z.array(CurriculumActivityTemplateSchema).default([]),
  provenance: SourceMetadataSchema,
  createdBy: IdSchema,
  createdAt: IsoDateTimeSchema,
});
export type CurriculumPackRevision = z.infer<typeof CurriculumPackRevisionSchema>;

export const CurriculumRevisionProposalSchema = z.object({
  id: IdSchema,
  revision: CurriculumPackRevisionSchema,
  rationale: z.string().min(1),
  basedOnRevisionIds: z.array(IdSchema).default([]),
  affectedStudentIds: z.array(IdSchema).default([]),
  createdBy: IdSchema,
  createdAt: IsoDateTimeSchema,
});
export type CurriculumRevisionProposal = z.infer<typeof CurriculumRevisionProposalSchema>;
export const CurriculumRevisionDecisionSchema = z.object({
  id: IdSchema,
  proposalId: IdSchema,
  revisionId: IdSchema,
  decision: z.enum(["approved", "rejected"]),
  reviewerId: IdSchema,
  note: z.string().min(1),
  createdAt: IsoDateTimeSchema,
});
export type CurriculumRevisionDecision = z.infer<typeof CurriculumRevisionDecisionSchema>;
export const CurriculumActivationSchema = z.object({
  id: IdSchema,
  packId: RegistryIdSchema,
  revisionId: IdSchema,
  action: z.enum(["activate", "rollback"]),
  actorId: IdSchema,
  reason: z.string().min(1),
  createdAt: IsoDateTimeSchema,
});
export type CurriculumActivation = z.infer<typeof CurriculumActivationSchema>;

export const RoadmapBranchKindSchema = z.enum(["core", "extension", "extra-practice", "review", "interest"]);
export const RoadmapNodeSchema = z.object({
  id: IdSchema,
  conceptId: IdSchema,
  subject: SubjectSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  stage: RepresentationStageSchema,
  status: z.enum(["completed", "current", "ready", "planned", "locked", "deferred"]),
  branchKind: RoadmapBranchKindSchema,
  depth: z.number().int().min(0),
  reason: z.string().min(1),
  evidenceCount: z.number().int().min(0).default(0),
  recentScore: z.number().min(0).max(1).optional(),
  reviewDue: z.boolean().default(false),
  curriculumRevisionId: IdSchema,
  parentConceptId: IdSchema.optional(),
  rejoinsConceptId: IdSchema.optional(),
});
export const RoadmapEdgeSchema = z.object({
  id: IdSchema,
  from: IdSchema,
  to: IdSchema,
  type: z.enum(["requires", "readiness", "extends", "supports", "cross-subject", "branches", "rejoins"]),
});
export type RoadmapNode = z.infer<typeof RoadmapNodeSchema>;
export type RoadmapEdge = z.infer<typeof RoadmapEdgeSchema>;
export const LearnerRoadmapSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: IdSchema,
  studentId: IdSchema,
  subject: SubjectSchema,
  title: z.string().min(1),
  curriculumRevisionIds: z.array(IdSchema).min(1),
  nodes: z.array(RoadmapNodeSchema),
  edges: z.array(RoadmapEdgeSchema),
  currentNodeIds: z.array(IdSchema),
  completedNodeIds: z.array(IdSchema),
  frontierNodeIds: z.array(IdSchema),
  expansionNeeded: z.boolean().default(false),
  expansionReason: z.string().min(1).optional(),
  generatedAt: IsoDateTimeSchema,
});
export type LearnerRoadmap = z.infer<typeof LearnerRoadmapSchema>;
const ChildRoadmapNodeSchema = RoadmapNodeSchema.pick({ id: true, conceptId: true, subject: true, title: true, description: true, stage: true, status: true, branchKind: true, depth: true, reviewDue: true, parentConceptId: true, rejoinsConceptId: true }).extend({ message: z.string().min(1) });
export const ChildLearnerRoadmapSchema = LearnerRoadmapSchema.omit({ nodes: true, expansionReason: true }).extend({
  nodes: z.array(ChildRoadmapNodeSchema),
});
export type ChildLearnerRoadmap = z.infer<typeof ChildLearnerRoadmapSchema>;
export function toChildLearnerRoadmap(roadmap: LearnerRoadmap): ChildLearnerRoadmap {
  const nodes = roadmap.nodes.filter((node) => node.status !== "deferred").map((node) => ({
    id: node.id, conceptId: node.conceptId, subject: node.subject, title: node.title, description: node.description,
    stage: node.stage, status: node.status === "locked" ? "planned" as const : node.status, branchKind: node.branchKind, depth: node.depth, reviewDue: node.reviewDue,
    ...(node.parentConceptId ? { parentConceptId: node.parentConceptId } : {}), ...(node.rejoinsConceptId ? { rejoinsConceptId: node.rejoinsConceptId } : {}),
    message: node.status === "completed" ? "Completed" : node.status === "current" ? "You are working here" : node.branchKind === "extra-practice" || node.branchKind === "review" ? "A practice stop" : "Coming next",
  }));
  const visible = new Set(nodes.map((node) => node.id));
  return ChildLearnerRoadmapSchema.parse({ ...roadmap, nodes, edges: roadmap.edges.filter((edge) => visible.has(edge.from) && visible.has(edge.to)) });
}

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
