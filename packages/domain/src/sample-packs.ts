import growingPathsJson from "../../../curriculum/growing-paths.json";
import { CurriculumPackRevisionSchema, type CurriculumActivityTemplate, type CurriculumConcept, type CurriculumPackRevision } from "@child-learning/contracts";

export const GROWING_PATHS_REVISION = CurriculumPackRevisionSchema.parse(growingPathsJson);

type ProgressionNode = {
  id: string;
  title: string;
  description: string;
  prerequisite: string;
  strand: string;
  phase: string;
  claim?: string;
  prompt?: string;
  choices?: [string, string, string];
  answer?: string;
};

const mathNodes: ProgressionNode[] = [
  { id: "math.multi-digit-subtraction", title: "Multi-digit subtraction", description: "Subtract larger numbers by regrouping place-value units when needed.", prerequisite: "math.multi-digit-addition", strand: "whole-number-operations", phase: "fluency" },
  { id: "math.multiplication-facts", title: "Multiplication facts", description: "Use equal groups, arrays, and known relationships to multiply whole numbers fluently.", prerequisite: "math.equal-groups", strand: "whole-number-operations", phase: "fluency", claim: "math.multiplies-whole-numbers", prompt: "Which equation represents 6 equal groups of 4?", choices: ["6 × 4 = 24", "6 + 4 = 10", "24 − 6 = 18"], answer: "6 × 4 = 24" },
  { id: "math.multi-digit-multiplication", title: "Multi-digit multiplication", description: "Multiply multi-digit whole numbers using place value and partial products.", prerequisite: "math.multiplication-facts", strand: "whole-number-operations", phase: "application" },
  { id: "math.division-with-remainders", title: "Division with remainders", description: "Interpret division as sharing or grouping and explain a remainder in context.", prerequisite: "math.fair-sharing", strand: "whole-number-operations", phase: "fluency" },
  { id: "math.long-division", title: "Multi-digit division", description: "Divide multi-digit whole numbers using place value, estimation, and multiplication facts.", prerequisite: "math.division-with-remainders", strand: "whole-number-operations", phase: "application" },
  { id: "math.equivalent-fractions", title: "Equivalent fractions", description: "Generate and recognize fractions that name the same quantity.", prerequisite: "math.fraction-foundations", strand: "fractions", phase: "foundations" },
  { id: "math.fraction-comparison", title: "Compare fractions", description: "Compare fractions using common wholes, benchmarks, and equivalent forms.", prerequisite: "math.equivalent-fractions", strand: "fractions", phase: "reasoning" },
  { id: "math.fraction-addition-subtraction", title: "Add and subtract fractions", description: "Combine and separate fractions by reasoning about common units.", prerequisite: "math.fraction-comparison", strand: "fractions", phase: "application", claim: "math.operates-with-fractions", prompt: "What common denominator can be used for 1/3 and 1/4?", choices: ["12", "7", "1"], answer: "12" },
  { id: "math.fraction-multiplication-division", title: "Multiply and divide fractions", description: "Use scaling, area, and sharing models to multiply and divide fractions.", prerequisite: "math.fraction-addition-subtraction", strand: "fractions", phase: "application" },
  { id: "math.decimal-place-value", title: "Decimal place value", description: "Read, compare, and represent decimals as extensions of base-ten place value.", prerequisite: "math.fraction-comparison", strand: "decimals", phase: "foundations" },
  { id: "math.decimal-operations", title: "Decimal operations", description: "Add, subtract, multiply, and divide decimals with place-value reasoning.", prerequisite: "math.decimal-place-value", strand: "decimals", phase: "application" },
  { id: "math.ratios-and-percent", title: "Ratios and percent", description: "Represent multiplicative comparisons with ratios, rates, proportions, and percent.", prerequisite: "math.fraction-multiplication-division", strand: "proportional-reasoning", phase: "application" },
  { id: "math.signed-numbers", title: "Signed numbers", description: "Locate and operate with positive and negative numbers on number lines and in context.", prerequisite: "math.decimal-operations", strand: "number-systems", phase: "reasoning" },
  { id: "math.algebraic-expressions", title: "Algebraic expressions", description: "Translate, evaluate, and simplify expressions containing variables.", prerequisite: "math.signed-numbers", strand: "algebra", phase: "foundations" },
  { id: "math.linear-equations", title: "Linear equations", description: "Solve and justify one-variable linear equations and inequalities.", prerequisite: "math.algebraic-expressions", strand: "algebra", phase: "application", claim: "math.solves-linear-equations", prompt: "Which value solves 3x + 5 = 20?", choices: ["5", "8", "15"], answer: "5" },
  { id: "math.systems-of-equations", title: "Systems of equations", description: "Represent and solve situations involving two related linear equations.", prerequisite: "math.linear-equations", strand: "algebra", phase: "analysis" },
  { id: "math.functions-and-graphs", title: "Functions and graphs", description: "Connect rules, tables, equations, and graphs of relationships between quantities.", prerequisite: "math.linear-equations", strand: "functions", phase: "analysis", claim: "math.interprets-functions", prompt: "For y = 2x + 1, what is y when x = 3?", choices: ["7", "6", "5"], answer: "7" },
  { id: "math.polynomials-factorization", title: "Polynomials and factorization", description: "Operate with polynomials and rewrite them as useful products.", prerequisite: "math.algebraic-expressions", strand: "algebra", phase: "analysis" },
  { id: "math.quadratic-functions", title: "Quadratic functions", description: "Analyze quadratic equations, graphs, roots, and equivalent forms.", prerequisite: "math.polynomials-factorization", strand: "functions", phase: "analysis" },
  { id: "math.geometry-measurement", title: "Geometry and measurement", description: "Reason about angle, length, area, volume, similarity, and geometric relationships.", prerequisite: "math.ratios-and-percent", strand: "geometry", phase: "application" },
  { id: "math.coordinate-geometry", title: "Coordinate geometry", description: "Use coordinates and algebra to analyze lines, distance, slope, and figures.", prerequisite: "math.functions-and-graphs", strand: "geometry", phase: "analysis" },
  { id: "math.trigonometry", title: "Trigonometry", description: "Use triangle ratios and periodic relationships to solve geometric problems.", prerequisite: "math.coordinate-geometry", strand: "geometry", phase: "advanced" },
  { id: "math.sequences-series", title: "Sequences and series", description: "Describe arithmetic, geometric, recursive, and infinite patterns.", prerequisite: "math.functions-and-graphs", strand: "advanced-functions", phase: "advanced" },
  { id: "math.limits-continuity", title: "Limits and continuity", description: "Reason about how function values behave near a point or without bound.", prerequisite: "math.trigonometry", strand: "calculus", phase: "advanced" },
  { id: "math.differentiation", title: "Differentiation", description: "Interpret and calculate instantaneous rates of change and tangent slopes.", prerequisite: "math.limits-continuity", strand: "calculus", phase: "advanced", claim: "math.uses-derivatives", prompt: "What does the derivative of a position function represent?", choices: ["Instantaneous velocity", "Total distance only", "Initial position"], answer: "Instantaneous velocity" },
  { id: "math.integration", title: "Integration", description: "Accumulate change and connect antiderivatives with area and total quantity.", prerequisite: "math.differentiation", strand: "calculus", phase: "advanced" },
  { id: "math.vectors-matrices", title: "Vectors and matrices", description: "Represent transformations, systems, and multidimensional quantities with vectors and matrices.", prerequisite: "math.systems-of-equations", strand: "linear-algebra", phase: "advanced" },
  { id: "math.combinatorics-probability", title: "Combinatorics and probability", description: "Count structured possibilities and reason about chance, dependence, and expected outcomes.", prerequisite: "math.ratios-and-percent", strand: "probability", phase: "analysis" },
  { id: "math.statistics", title: "Statistics and inference", description: "Summarize data, model variation, sample responsibly, and evaluate evidence-based claims.", prerequisite: "math.combinatorics-probability", strand: "statistics", phase: "advanced", claim: "math.interprets-statistics", prompt: "Which measure describes the middle value of ordered data?", choices: ["Median", "Range", "Maximum"], answer: "Median" }
];

const englishNodes: ProgressionNode[] = [
  { id: "english.fluent-oral-reading", title: "Fluent oral reading", description: "Read connected text accurately, smoothly, and with phrasing that supports meaning.", prerequisite: "english.reading-for-detail", strand: "reading-fluency", phase: "fluency" },
  { id: "english.sentence-structure", title: "Sentence structure", description: "Recognize and construct complete sentences with clear subjects and predicates.", prerequisite: "english.reading-for-detail", strand: "language-conventions", phase: "foundations", claim: "english.uses-complete-sentences", prompt: "Which option is a complete sentence?", choices: ["The bright kite rose.", "Across the field", "Because the wind"], answer: "The bright kite rose." },
  { id: "english.parts-of-speech", title: "Word roles in sentences", description: "Use nouns, verbs, adjectives, adverbs, pronouns, and connecting words purposefully.", prerequisite: "english.sentence-structure", strand: "language-conventions", phase: "fluency" },
  { id: "english.modifiers-and-phrases", title: "Modifiers and phrases", description: "Use words and phrases to add precise detail and clarify relationships.", prerequisite: "english.parts-of-speech", strand: "language-conventions", phase: "application" },
  { id: "english.complex-sentences", title: "Complex sentences", description: "Interpret and write sentences that connect ideas through clauses and transitions.", prerequisite: "english.modifiers-and-phrases", strand: "language-conventions", phase: "analysis" },
  { id: "english.story-sequence", title: "Story sequence", description: "Track events, time order, and cause across a narrative.", prerequisite: "english.fluent-oral-reading", strand: "narrative-comprehension", phase: "application" },
  { id: "english.contextual-vocabulary", title: "Vocabulary in context", description: "Infer word meaning from surrounding language, word parts, and reference tools.", prerequisite: "english.reading-for-detail", strand: "vocabulary", phase: "application" },
  { id: "english.paragraph-topic", title: "Paragraph topic", description: "Identify the topic and distinguish it from supporting information.", prerequisite: "english.main-idea", strand: "paragraph-comprehension", phase: "foundations" },
  { id: "english.paragraph-development", title: "Paragraph development", description: "Explain how details, examples, and transitions develop one controlling idea.", prerequisite: "english.paragraph-topic", strand: "paragraph-comprehension", phase: "analysis", claim: "english.analyzes-paragraphs", prompt: "What is the main job of a supporting detail?", choices: ["Develop the central idea", "Introduce an unrelated topic", "Replace every transition"], answer: "Develop the central idea" },
  { id: "english.compare-contrast", title: "Compare and contrast", description: "Analyze meaningful similarities and differences within and across texts.", prerequisite: "english.paragraph-development", strand: "text-relationships", phase: "analysis" },
  { id: "english.cause-effect", title: "Cause and effect", description: "Trace reasons, results, and interactions across sentences and paragraphs.", prerequisite: "english.paragraph-development", strand: "text-relationships", phase: "analysis" },
  { id: "english.information-organization", title: "Organizing information", description: "Recognize and use sequence, description, comparison, cause, and problem-solution structures.", prerequisite: "english.compare-contrast", strand: "text-structure", phase: "analysis" },
  { id: "english.summarizing", title: "Summarizing", description: "Condense a text by preserving its central ideas and essential relationships.", prerequisite: "english.information-organization", strand: "synthesis", phase: "application", claim: "english.summarizes-text", prompt: "A strong summary should include which information?", choices: ["Central ideas and essential details", "Every sentence in order", "Only the reader's opinion"], answer: "Central ideas and essential details" },
  { id: "english.inference", title: "Inference", description: "Combine textual evidence with relevant knowledge to reach a supported conclusion.", prerequisite: "english.text-evidence", strand: "interpretation", phase: "analysis", claim: "english.makes-inferences", prompt: "What makes an inference well supported?", choices: ["Relevant evidence and reasoning", "A guess without the text", "One unfamiliar word"], answer: "Relevant evidence and reasoning" },
  { id: "english.author-purpose-perspective", title: "Author purpose and perspective", description: "Analyze how purpose, viewpoint, language, and selection of details shape a text.", prerequisite: "english.inference", strand: "interpretation", phase: "analysis" },
  { id: "english.question-requirements", title: "Answering what a question asks", description: "Identify a question's task and construct a complete, relevant response.", prerequisite: "english.text-evidence", strand: "response-writing", phase: "application" },
  { id: "english.concise-writing", title: "Concise writing", description: "Express the central meaning precisely while removing repetition and distraction.", prerequisite: "english.paragraph-writing", strand: "response-writing", phase: "analysis" },
  { id: "english.multi-paragraph-writing", title: "Multi-paragraph writing", description: "Organize a sustained explanation or argument with connected paragraphs and evidence.", prerequisite: "english.concise-writing", strand: "composition", phase: "advanced" },
  { id: "english.literary-elements", title: "Literary elements", description: "Analyze character, setting, plot, conflict, imagery, tone, and theme.", prerequisite: "english.author-purpose-perspective", strand: "literary-analysis", phase: "advanced" },
  { id: "english.critical-reading", title: "Critical reading", description: "Evaluate claims, evidence, assumptions, organization, and language across complex texts.", prerequisite: "english.author-purpose-perspective", strand: "critical-literacy", phase: "advanced", claim: "english.evaluates-texts", prompt: "Which question best tests the strength of a claim?", choices: ["What evidence supports it?", "How long is the paragraph?", "Is the title printed first?"], answer: "What evidence supports it?" },
  { id: "english.evidence-based-writing", title: "Evidence-based critical writing", description: "Develop and substantiate interpretations or arguments using precise evidence and reasoning.", prerequisite: "english.critical-reading", strand: "critical-literacy", phase: "advanced" }
];

function guide(node: ProgressionNode) {
  return {
    title: `How to approach ${node.title.toLocaleLowerCase()}`,
    conceptSummary: node.description,
    steps: ["Read the task and name what is known.", "Choose a method that matches the relationship in the task.", "Check that the result answers the exact question."],
    remember: "Explain the relationship, not only the final response.",
    visualAssetRefs: [],
    printable: true,
  };
}

function concept(node: ProgressionNode, subject: "math" | "english", index: number): CurriculumConcept {
  return {
    id: node.id,
    subject,
    title: node.title,
    description: node.description,
    step: 30 + index,
    prerequisites: [node.prerequisite],
    readinessConceptIds: [],
    activityKinds: ["selected-response"],
    branchKind: "core",
    assessmentClaims: node.claim ? [node.claim] : [],
    assessmentTargets: node.claim ? [{ claim: node.claim, stage: "independent", questionnairePrompt: `Can the learner independently demonstrate ${node.title.toLocaleLowerCase()}?` }] : [],
    strand: node.strand,
    phase: node.phase,
    advisoryPracticeMinutes: node.phase === "advanced" ? 30 : 20,
    consolidation: node.id.endsWith("statistics") || node.id.endsWith("evidence-based-writing"),
    templateIds: [`${node.id}.diagnostic`],
    allowEarlyIntroduction: true,
    stages: [{ stage: "independent", title: "Independent application", deliveryMode: "worksheet", evidencePurpose: "mastery", generator: "template-bank", evaluator: "deterministic", renderer: "worksheet", activityKinds: ["selected-response"], minimumConfirmed: 3, minimumAverage: .85, difficultyParameters: {}, childGuide: guide(node) }],
  };
}

function template(node: ProgressionNode): CurriculumActivityTemplate {
  const itemId = `${node.id}.diagnostic.item`;
  const correct = node.answer ?? node.description;
  const choices = node.choices ?? [node.description, `Use an unrelated rule before reading the task.`, `Skip the relationship and choose a response at random.`] as [string, string, string];
  return {
    id: `${node.id}.diagnostic`,
    conceptId: node.id,
    stage: "independent",
    title: `${node.title} starting check`,
    objectives: [`Check current readiness for ${node.title.toLocaleLowerCase()}.`],
    instructions: ["Read each question carefully.", "Choose the best answer."],
    childGuide: guide(node),
    activityType: "assessment",
    estimatedMinutes: 20,
    items: [{ id: itemId, conceptId: node.id, kind: "selected-response", prompt: node.prompt ?? `Which statement best describes ${node.title.toLocaleLowerCase()}?`, choices, correctChoice: correct, assetRefs: [], difficulty: node.phase === "advanced" ? 9 : 6, metadata: {} }],
    answerSpecs: { [itemId]: { type: "choice", expected: correct } },
    scoring: { method: "exact", maxScore: 1, passThreshold: .85, mistakeTags: [`${node.id}.readiness-gap`] },
  };
}

function progressionRevision(): CurriculumPackRevision {
  const concepts = [
    ...mathNodes.map((node, index) => concept(node, "math", index)),
    ...englishNodes.map((node, index) => concept(node, "english", index)),
  ];
  const activityTemplates = [...mathNodes, ...englishNodes].map(template);
  return CurriculumPackRevisionSchema.parse({
    schemaVersion: "2.0",
    id: "continuous-subject-progressions-r1",
    packId: "continuous-subject-progressions",
    revision: 1,
    title: "Continuous subject progressions",
    description: "Original long-form Math and Language Arts maps with diagnostic entry anchors and open-ended continuation.",
    subjects: [
      { id: "math", title: "Math", description: "Numbers, operations, patterns, measurement, and mathematical reasoning." },
      { id: "english", title: "Language Arts", description: "Reading, writing, vocabulary, comprehension, and communication." },
    ],
    concepts,
    edges: concepts.flatMap((entry) => entry.prerequisites.map((from) => ({ id: `${from}--requires--${entry.id}`, from, to: entry.id, type: "requires" as const }))),
    activityTemplates,
    provenance: { origin: "original", provenance: "Broad topic coverage and progression shape informed by publicly available mathematics and English learning-progression tables supplied by the user.", notes: "All concept grouping, descriptions, diagnostic prompts, guides, IDs, and activity content are original to Learning Worktable." },
    createdBy: "system",
    createdAt: "2026-09-08T00:00:00.000Z",
  });
}

export const REFERENCE_PROGRESSIONS_REVISION = progressionRevision();
