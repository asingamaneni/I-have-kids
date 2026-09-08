import { DEFAULT_ACTIVITY_ITEM_COUNT } from "@child-learning/contracts";
import type { ActivityItem, ActivitySpec, ChildGuide, RepresentationStage } from "@child-learning/contracts";

type EqualGroupsFairSharingItem = Extract<ActivityItem, { kind: "equal-groups-fair-sharing" }>;
type EquationItem = Extract<ActivityItem, { kind: "equation" }>;
type HandwritingWritingItem = Extract<ActivityItem, { kind: "handwriting-writing" }>;
type PictureAdditionSubtractionItem = Extract<ActivityItem, { kind: "picture-addition-subtraction" }>;
type PhonicsPictureWordItem = Extract<ActivityItem, { kind: "phonics-picture-word" }>;
type ReadingComprehensionItem = Extract<ActivityItem, { kind: "reading-comprehension" }>;
type ScienceObservationItem = Extract<ActivityItem, { kind: "science-observation" }>;
type SequencingReasoningItem = Extract<ActivityItem, { kind: "sequencing-reasoning" }>;
import { ActivitySpecSchema } from "@child-learning/contracts";
import { comparabilityKey } from "./progression.js";
import { DEFAULT_CONCEPTS } from "./curriculum.js";

const ADDITION_ASSETS = ["assets/line-art/apple.svg", "assets/line-art/star.svg", "assets/line-art/leaf.svg"] as const;
const SOUND_WORDS = [
  { word: "sun", sound: "s", asset: "assets/line-art/sun.svg" },
  { word: "moon", sound: "m", asset: "assets/line-art/moon.svg" },
  { word: "cat", sound: "c", asset: "assets/line-art/cat.svg" },
  { word: "dog", sound: "d", asset: "assets/line-art/dog.svg" },
  { word: "fish", sound: "f", asset: "assets/line-art/fish.svg" },
  { word: "hat", sound: "h", asset: "assets/line-art/hat.svg" },
] as const;

function rng(seed: number): () => number {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 0x100000000; };
}
function timestamp(now: Date | string | undefined): string { return new Date(now ?? "2020-01-01T00:00:00.000Z").toISOString(); }
export function resolveActivityItemCount(value?: number): number { return Math.max(1, Math.min(40, Math.trunc(value ?? DEFAULT_ACTIVITY_ITEM_COUNT))); }
function stableIdSegment(value: string): string { return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unassigned"; }
function positiveModulo(value: number, modulus: number): number { return ((value % modulus) + modulus) % modulus; }

export type GeneratorOptions = { seed: number; studentId?: string; now?: Date | string; itemCount?: number; representationStage?: RepresentationStage; difficultyLevel?: number };
function presentationFor(conceptId: string, title: string): NonNullable<ActivitySpec["presentation"]> {
  const operation = conceptId.includes("subtraction") ? "take some away and count how many are left" : conceptId.includes("addition") ? "make two groups, put them together, and count all" : conceptId.includes("fair-sharing") ? "give one object to each person until all are shared" : conceptId.includes("equal-groups") ? "make groups with the same number in each group" : "touch, move, sort, or name each object";
  return { materials: ["small counters or familiar household objects", "a clear work mat or tray"], childInvitation: `Use real objects to practice ${title.toLocaleLowerCase()}.`, steps: ["Put the objects on your mat.", `Use the objects to ${operation}.`, "Try it again. Tell what changed."], adultGuide: "Demonstrate slowly, use few words, then pause so the child can act independently. Do not correct during the first exploration unless safety or frustration requires help.", observationPrompt: "What did the child choose to do independently, and what representation should come next?" };
}
function guideFor(conceptId: string, title: string): ChildGuide {
  if (conceptId.includes("subtraction")) return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "Subtraction finds what remains after an amount is taken away.", steps: ["Start with the whole amount.", "Take away the second amount.", "Count or calculate what remains."], example: { prompt: "Try 8 − 3.", explanation: "Start at 8, take away 3, and 5 remain." }, remember: "Check by adding the difference and the amount taken away." };
  if (conceptId.includes("addition")) return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "Addition joins amounts to find how many there are altogether.", steps: ["Read the two amounts.", "Join them or count on.", "Write the total."], example: { prompt: "Try 4 + 3.", explanation: "Start at 4 and count on 3: 5, 6, 7." }, remember: "The sum is the total." };
  if (conceptId.includes("counting") || conceptId.includes("teen-numbers")) return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "A number tells how many objects are in a group.", steps: ["Point to one object at a time.", "Say one number for each object.", "The last number says how many."], example: { prompt: "Count a group of six dots.", explanation: "Touch each dot once while saying 1 through 6." }, remember: "Count each object once." };
  if (conceptId.includes("equal-groups")) return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "Equal groups have the same number in every group.", steps: ["Count the groups.", "Place the same amount in each group.", "Check that every group matches."], example: { prompt: "Make 3 groups of 2.", explanation: "Put 2 counters in each of 3 groups; there are 6 altogether." }, remember: "Equal means the same amount." };
  if (conceptId.includes("fair-sharing")) return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "Fair sharing divides a total into equal groups.", steps: ["Count the total.", "Give one to each group in turn.", "Continue until none remain, then count one group."], example: { prompt: "Share 8 counters between 2 people.", explanation: "Each person receives 4 counters." }, remember: "Every group must receive the same amount." };
  if (conceptId.includes("beginning-sounds")) return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "The beginning sound is the first sound heard in a word.", steps: ["Say the word slowly.", "Listen to the first sound.", "Match that sound to its letter."], example: { prompt: "Say moon slowly.", explanation: "Moon begins with the /m/ sound." }, remember: "Listen before choosing a letter." };
  if (conceptId.includes("reading")) return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "A detail is information stated in the passage.", steps: ["Read the question first.", "Read the passage carefully.", "Find the words that support the answer."], example: { prompt: "If a passage says the bag is red, what color is the bag?", explanation: "Use the stated detail: red." }, remember: "Point to the words that prove the answer." };
  if (conceptId.includes("letter-formation")) return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "Clear writing uses consistent letter shapes, size, and spacing.", steps: ["Watch where the letter begins.", "Follow the strokes in order.", "Keep letters on the line with spaces between words."], example: { prompt: "Write a lowercase a.", explanation: "Make the round part first, then add the short downstroke." }, remember: "Slow, controlled strokes are easier to read." };
  if (conceptId.includes("reasoning")) return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "Reasoning finds a rule or relationship and uses it consistently.", steps: ["Look for what changes or stays the same.", "Say the rule in your own words.", "Use the rule to choose or order the answer."], example: { prompt: "Red, blue, red, blue, …", explanation: "The colors alternate, so red comes next." }, remember: "Explain the rule before answering." };
  return { visualAssetRefs: [], printable: true, title: `How to do ${title}`, conceptSummary: "Careful observation uses specific details that can be seen, measured, or compared.", steps: ["Look closely and safely.", "Name one feature at a time.", "Record only what you can support."], example: { prompt: "Describe a leaf.", explanation: "Name visible details such as shape, color, and texture." }, remember: "An observation tells what you notice, not what you guess." };
}
function completeActivity(options: GeneratorOptions, input: Omit<ActivitySpec, "schemaVersion" | "id" | "studentId" | "seed" | "createdAt" | "source" | "sourceMetadata" | "generator" | "comparabilityKey"> & { generatorName: string; generatorVersion?: string }): ActivitySpec {
  const { generatorName, generatorVersion = "1.0", ...activity } = input;
  const effectiveItemCount = resolveActivityItemCount(options.itemCount);
  const representationStage = options.representationStage ?? activity.representationStage ?? "pictorial";
  const curriculumStage = DEFAULT_CONCEPTS.get(activity.conceptId)?.stages.find((stage) => stage.stage === representationStage);
  const deliveryMode = curriculumStage?.deliveryMode ?? (representationStage === "concrete" ? "hands-on" : "worksheet");
  const evidencePurpose = curriculumStage?.evidencePurpose ?? (representationStage === "concrete" ? "exploration" : representationStage === "abstract" ? "mastery" : "formative");
  const spec = ActivitySpecSchema.parse({
    ...activity,
    difficultyLevel: options.difficultyLevel ?? activity.difficultyLevel,
    id: `activity-${generatorName}-${representationStage}-${stableIdSegment(options.studentId ?? "unassigned")}-${options.seed}-${effectiveItemCount}`,
    schemaVersion: "1.0",
    studentId: options.studentId ?? "unassigned",
    source: "generated",
    representationStage,
    deliveryMode,
    evidencePurpose,
    activityType: representationStage === "concrete" ? "introduction" : activity.activityType,
    childGuide: activity.childGuide ?? guideFor(activity.conceptId, activity.title),
    ...(representationStage === "concrete" ? { presentation: activity.presentation ?? presentationFor(activity.conceptId, activity.title) } : {}),
    curriculumVersion: "capability-path-v1",
    sourceMetadata: { origin: "original", provenance: "Seeded local generator", notes: "Original wording and local semantic assets; no workbook content copied." },
    generator: { name: generatorName, version: generatorVersion },
    seed: options.seed,
    createdAt: timestamp(options.now),
    comparabilityKey: "pending",
  });
  return { ...spec, comparabilityKey: comparabilityKey(spec) };
}

export type AdditionGeneratorOptions = GeneratorOptions;
export function generateAdditionWithinTen(options: AdditionGeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed);
  if (options.representationStage === "abstract") {
    const items: EquationItem[] = Array.from({ length: count }, (_, index) => { const left = Math.floor(next() * 7); const right = Math.floor(next() * (11 - left)); return { id: `addition-equation-${options.seed}-${index + 1}`, conceptId: "math.addition-within-10", kind: "equation", prompt: "Add. Write the sum.", directions: "Write the sum.", assetRefs: [], difficulty: Math.min(10, left + right), metadata: { generator: "addition-within-10", seed: options.seed }, equation: `${left} + ${right} =`, answer: left + right }; });
    return completeActivity(options, { generatorName: "addition-within-10", subject: "math", conceptId: "math.addition-within-10", title: "Addition equations within 10", objectives: ["Add numbers within 10."], difficultyLevel: Math.min(10, Math.max(...items.map((item) => item.difficulty))), estimatedMinutes: count * 2, activityType: "assessment", visualSupport: false, instructions: ["Add.", "Write each sum."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.answer }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["addition-fact-error", "symbol-operation-error"] }, prerequisiteConceptIds: ["math.counting-to-10"], rationale: "Symbolic practice follows concrete and pictorial addition experiences." });
  }
  const items: PictureAdditionSubtractionItem[] = Array.from({ length: count }, (_, index) => {
    const leftCount = Math.floor(next() * 6); const rightCount = Math.floor(next() * (11 - leftCount));
    const asset = ADDITION_ASSETS[Math.floor(next() * ADDITION_ASSETS.length)] ?? ADDITION_ASSETS[0];
    return { id: `addition-${options.seed}-${index + 1}`, conceptId: "math.addition-within-10", kind: "picture-addition-subtraction", operation: "addition", prompt: "Add. Write the sum.", directions: "Count the pictures. Write the sum.", assetRefs: [asset], difficulty: Math.min(10, leftCount + rightCount), metadata: { generator: "addition-within-10", seed: options.seed }, leftCount, rightCount, result: leftCount + rightCount, representation: "pictures-and-equation" };
  });
  return completeActivity(options, { generatorName: "addition-within-10", subject: "math", conceptId: "math.addition-within-10", title: "Picture addition within 10", objectives: ["Join two groups and find the total within 10."], difficultyLevel: Math.min(10, Math.max(...items.map((item) => item.difficulty))), estimatedMinutes: count * 2, activityType: "practice", visualSupport: { enabled: true, assetRefs: [...new Set(items.flatMap((item) => item.assetRefs))], description: "Original local line art supports counting." }, instructions: ["Add the two groups.", "Write each sum."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.result }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["addition-counting-error", "addition-fact-error"] }, prerequisiteConceptIds: ["math.counting-to-10"], rationale: "Small original picture groups make joining quantities visible." });
}

export function generateSubtractionWithinTen(options: GeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed);
  if (options.representationStage === "abstract") {
    const items: EquationItem[] = Array.from({ length: count }, (_, index) => { const left = 2 + Math.floor(next() * 9); const right = 1 + Math.floor(next() * left); return { id: `subtraction-equation-${options.seed}-${index + 1}`, conceptId: "math.subtraction-within-10", kind: "equation", prompt: "Subtract. Write the difference.", directions: "Write the difference.", assetRefs: [], difficulty: Math.min(10, left), metadata: { generator: "subtraction-within-10", seed: options.seed }, equation: `${left} − ${right} =`, answer: left - right }; });
    return completeActivity(options, { generatorName: "subtraction-within-10", subject: "math", conceptId: "math.subtraction-within-10", title: "Subtraction equations within 10", objectives: ["Subtract numbers within 10."], difficultyLevel: Math.min(10, Math.max(...items.map((item) => item.difficulty))), estimatedMinutes: count * 2, activityType: "assessment", visualSupport: false, instructions: ["Subtract.", "Write each difference."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.answer }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["subtraction-fact-error", "symbol-operation-error"] }, prerequisiteConceptIds: ["math.addition-within-10"], rationale: "Symbolic practice follows concrete and pictorial subtraction experiences." });
  }
  const items: PictureAdditionSubtractionItem[] = Array.from({ length: count }, (_, index) => {
    const leftCount = 2 + Math.floor(next() * 9); const rightCount = 1 + Math.floor(next() * leftCount); const asset = ADDITION_ASSETS[Math.floor(next() * ADDITION_ASSETS.length)] ?? ADDITION_ASSETS[0];
    return { id: `subtraction-${options.seed}-${index + 1}`, conceptId: "math.subtraction-within-10", kind: "picture-addition-subtraction", operation: "subtraction", prompt: `Cross out ${rightCount}. Write how many are left.`, directions: "Count the pictures that are not crossed out.", assetRefs: [asset], difficulty: Math.min(10, leftCount), metadata: { generator: "subtraction-within-10", seed: options.seed }, leftCount, rightCount, result: leftCount - rightCount, representation: "pictures-and-equation" };
  });
  return completeActivity(options, { generatorName: "subtraction-within-10", subject: "math", conceptId: "math.subtraction-within-10", title: "Picture subtraction within 10", objectives: ["Take away from a small group and find what remains within 10."], difficultyLevel: Math.min(10, Math.max(...items.map((item) => item.difficulty))), estimatedMinutes: count * 2, activityType: "practice", visualSupport: { enabled: true, assetRefs: [...new Set(items.flatMap((item) => item.assetRefs))], description: "Cross-out marks make the take-away action visible without relying on color." }, instructions: ["Cross out the number taken away.", "Write how many are left."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.result }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["subtraction-counting-error", "take-away-error"] }, prerequisiteConceptIds: ["math.addition-within-10"], rationale: "A concrete take-away picture model connects subtraction language to the amount left." });
}

export function generateTeenNumbers(options: GeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed);
  const items = Array.from({ length: count }, (_, index) => { const correct = 11 + Math.floor(next() * 10); const choices = [...new Set([correct, Math.max(10, correct - 1), Math.min(20, correct + 1)])]; return { id: `teen-number-${options.seed}-${index + 1}`, conceptId: "math.teen-numbers", kind: "number-choice" as const, prompt: "Count the objects. Choose the number.", directions: "Make a group of ten, count the extras, then choose the number.", assetRefs: [], difficulty: Math.min(10, 4 + Math.floor((correct - 10) / 2)), metadata: { generator: "teen-numbers", seed: options.seed, dotCount: correct }, choices, correctChoice: correct }; });
  return completeActivity(options, { generatorName: "teen-numbers", subject: "math", conceptId: "math.teen-numbers", title: "Numbers 11–20", objectives: ["Build numbers 11–20 as one ten and some more."], difficultyLevel: 5, estimatedMinutes: count * 2, activityType: "practice", visualSupport: true, instructions: ["Count each set.", "Choose the correct number."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "choice", expected: String(item.correctChoice) }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["teen-number-counting-error", "ten-and-ones-error"] }, prerequisiteConceptIds: ["math.counting-to-10"], rationale: "A ten-and-ones structure extends quantity understanding beyond ten." });
}

export function generateAdditionWithinTwenty(options: GeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed);
  if (options.representationStage === "abstract") {
    const items: EquationItem[] = Array.from({ length: count }, (_, index) => { const left = 5 + Math.floor(next() * 11); const right = Math.floor(next() * (21 - left)); return { id: `addition-20-equation-${options.seed}-${index + 1}`, conceptId: "math.addition-within-20", kind: "equation", prompt: "Add. Write the sum.", directions: "Make a 10 if it helps.", assetRefs: [], difficulty: Math.min(10, 5 + Math.floor((left + right) / 4)), metadata: { generator: "addition-within-20", seed: options.seed }, equation: `${left} + ${right} =`, answer: left + right }; });
    return completeActivity(options, { generatorName: "addition-within-20", subject: "math", conceptId: "math.addition-within-20", title: "Addition equations within 20", objectives: ["Add numbers within 20. Use what you know about 10 if it helps."], difficultyLevel: 7, estimatedMinutes: count * 2, activityType: "assessment", visualSupport: false, instructions: ["Add.", "Write each sum."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.answer }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["addition-within-20-error", "make-ten-error"] }, prerequisiteConceptIds: ["math.addition-within-10", "math.teen-numbers"], rationale: "Symbolic work follows quantity and pictorial relationships within 20." });
  }
  const items: PictureAdditionSubtractionItem[] = Array.from({ length: count }, (_, index) => { const leftCount = 5 + Math.floor(next() * 11); const rightCount = Math.floor(next() * (21 - leftCount)); const asset = ADDITION_ASSETS[Math.floor(next() * ADDITION_ASSETS.length)] ?? ADDITION_ASSETS[0]; return { id: `addition-20-${options.seed}-${index + 1}`, conceptId: "math.addition-within-20", kind: "picture-addition-subtraction", operation: "addition", prompt: "Add. Write the sum.", directions: "Count the pictures. Write the sum.", assetRefs: [asset], difficulty: Math.min(10, 5 + Math.floor((leftCount + rightCount) / 4)), metadata: { generator: "addition-within-20", seed: options.seed }, leftCount, rightCount, result: leftCount + rightCount, representation: "pictures-and-equation" }; });
  return completeActivity(options, { generatorName: "addition-within-20", subject: "math", conceptId: "math.addition-within-20", title: "Picture addition within 20", objectives: ["Add the two groups. Make a group of 10 if it helps."], difficultyLevel: 6, estimatedMinutes: count * 3, activityType: "practice", visualSupport: true, instructions: ["Add the two groups.", "Write each sum."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.result }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["addition-within-20-error", "counting-on-error"] }, prerequisiteConceptIds: ["math.addition-within-10", "math.teen-numbers"], rationale: "Pictures bridge known addition and teen-number structure." });
}

export function generateSubtractionWithinTwenty(options: GeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed);
  if (options.representationStage === "abstract") {
    const items: EquationItem[] = Array.from({ length: count }, (_, index) => { const left = 11 + Math.floor(next() * 10); const right = 1 + Math.floor(next() * Math.min(10, left)); return { id: `subtraction-20-equation-${options.seed}-${index + 1}`, conceptId: "math.subtraction-within-20", kind: "equation", prompt: "Subtract. Write the difference.", directions: "Use 10 or a fact you know if it helps.", assetRefs: [], difficulty: Math.min(10, 6 + Math.floor(left / 5)), metadata: { generator: "subtraction-within-20", seed: options.seed }, equation: `${left} − ${right} =`, answer: left - right }; });
    return completeActivity(options, { generatorName: "subtraction-within-20", subject: "math", conceptId: "math.subtraction-within-20", title: "Subtraction equations within 20", objectives: ["Subtract numbers within 20. Use what you know about 10 if it helps."], difficultyLevel: 8, estimatedMinutes: count * 2, activityType: "assessment", visualSupport: false, instructions: ["Subtract.", "Write each difference."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.answer }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["subtraction-within-20-error", "related-fact-error"] }, prerequisiteConceptIds: ["math.subtraction-within-10", "math.teen-numbers"], rationale: "Symbolic work follows concrete and pictorial subtraction within 20." });
  }
  const items: PictureAdditionSubtractionItem[] = Array.from({ length: count }, (_, index) => { const leftCount = 11 + Math.floor(next() * 10); const rightCount = 1 + Math.floor(next() * Math.min(10, leftCount)); const asset = ADDITION_ASSETS[Math.floor(next() * ADDITION_ASSETS.length)] ?? ADDITION_ASSETS[0]; return { id: `subtraction-20-${options.seed}-${index + 1}`, conceptId: "math.subtraction-within-20", kind: "picture-addition-subtraction", operation: "subtraction", prompt: `Cross out ${rightCount}. Write how many are left.`, directions: "Count the pictures that are not crossed out.", assetRefs: [asset], difficulty: Math.min(10, 6 + Math.floor(leftCount / 5)), metadata: { generator: "subtraction-within-20", seed: options.seed }, leftCount, rightCount, result: leftCount - rightCount, representation: "pictures-and-equation" }; });
  return completeActivity(options, { generatorName: "subtraction-within-20", subject: "math", conceptId: "math.subtraction-within-20", title: "Picture subtraction within 20", objectives: ["Take away and find how many are left."], difficultyLevel: 7, estimatedMinutes: count * 3, activityType: "practice", visualSupport: true, instructions: ["Cross out the number taken away.", "Write how many are left."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.result }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["subtraction-within-20-error", "take-away-error"] }, prerequisiteConceptIds: ["math.subtraction-within-10", "math.teen-numbers"], rationale: "Pictures extend subtraction through teen-number quantities before symbols stand alone." });
}

export function generateEqualGroups(options: GeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed); const groups = 2 + Math.floor(next() * 3); const perGroup = 2 + Math.floor(next() * 3);
  const items: EqualGroupsFairSharingItem[] = Array.from({ length: count }, (_, index) => { const groupCount = Math.max(2, Math.min(5, groups + ((index % 2) ? 0 : 1))); const amountPerGroup = Math.max(1, Math.min(5, perGroup + (index % 3 === 0 ? 1 : 0))); return { id: `equal-groups-${options.seed}-${index + 1}`, conceptId: "math.equal-groups", kind: "equal-groups-fair-sharing", mode: "equal-groups", prompt: `Make ${groupCount} equal groups with ${groupCount * amountPerGroup} counters.`, directions: "Put the same number of counters in every box.", assetRefs: [], difficulty: Math.min(10, amountPerGroup + groupCount), metadata: { generator: "equal-groups", seed: options.seed }, total: groupCount * amountPerGroup, groupCount, amountPerGroup, readinessConceptId: "math.addition-within-10" }; });
  return completeActivity(options, { generatorName: "equal-groups", subject: "math", conceptId: "math.equal-groups", title: "Equal groups", objectives: ["Build groups with the same number in each group."], difficultyLevel: 4, estimatedMinutes: count * 3, activityType: "introduction", visualSupport: { enabled: true, assetRefs: [], description: "Grouped boxes and counters introduce multiplication as equal groups." }, instructions: ["Look at the counters and boxes.", "Share the counters so every box has the same amount.", "Write how many counters are in one box."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.amountPerGroup }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["unequal-groups", "counting-error"] }, prerequisiteConceptIds: ["math.addition-within-10"], rationale: "Readiness-gated equal groups build a concrete foundation before multiplication symbols." });
}

export function generateFairSharing(options: GeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed);
  const items: EqualGroupsFairSharingItem[] = Array.from({ length: count }, (_, index) => { const groupCount = 2 + Math.floor(next() * 3); const amountPerGroup = 1 + Math.floor(next() * 4); const total = groupCount * amountPerGroup; return { id: `fair-sharing-${options.seed}-${index + 1}`, conceptId: "math.fair-sharing", kind: "equal-groups-fair-sharing", mode: "fair-sharing", prompt: `Share ${total} counters fairly between ${groupCount} friends.`, directions: "Give one counter to each friend at a time until all counters are shared.", assetRefs: [], difficulty: Math.min(10, amountPerGroup + groupCount), metadata: { generator: "fair-sharing", seed: options.seed }, total, groupCount, amountPerGroup, readinessConceptId: "math.equal-groups" }; });
  return completeActivity(options, { generatorName: "fair-sharing", subject: "math", conceptId: "math.fair-sharing", title: "Fair sharing", objectives: ["Share the counters equally."], difficultyLevel: 5, estimatedMinutes: count * 3, activityType: "introduction", visualSupport: { enabled: true, assetRefs: [], description: "Friend boxes and counters make fair sharing visible." }, instructions: ["Count all the counters.", "Share one counter with each friend in turn.", "Write how many each friend gets."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "integer", expected: item.amountPerGroup }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["unfair-share", "counting-error"] }, prerequisiteConceptIds: ["math.equal-groups"], rationale: "Readiness-gated sharing builds division meaning through equal distribution." });
}

export type BeginningSoundGeneratorOptions = GeneratorOptions;
export function generateEnglishBeginningSounds(options: BeginningSoundGeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed); const ordered = SOUND_WORDS.map((value, index) => ({ value, order: next() + index / 1000 })).sort((a, b) => a.order - b.order).map(({ value }) => value); const chosen = Array.from({ length: count }, (_, index) => ordered[index % ordered.length]!);
  const items: PhonicsPictureWordItem[] = chosen.map((entry, index) => ({ id: `beginning-sound-${options.seed}-${index + 1}`, conceptId: "english.beginning-sounds", kind: "phonics-picture-word", prompt: `Say ${entry.word}. Choose the first sound.`, directions: "Choose one answer.", assetRefs: [entry.asset], difficulty: 1, metadata: { generator: "english-beginning-sounds", seed: options.seed }, targetWord: entry.word, targetSound: entry.sound, choices: [entry.sound, "b", "p"].filter((v, i, a) => a.indexOf(v) === i), imageAssetRef: entry.asset }));
  return completeActivity(options, { generatorName: "english-beginning-sounds", subject: "english", conceptId: "english.beginning-sounds", title: "Beginning Sounds", objectives: ["Identify the first sound in a familiar word."], difficultyLevel: 1, estimatedMinutes: count * 2, activityType: "practice", visualSupport: { enabled: true, assetRefs: [...new Set(items.flatMap((item) => item.assetRefs))], description: "Original local line art supports word naming." }, instructions: ["Say each picture name.", "Choose the first sound."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "text", expected: item.targetSound, normalize: "case-insensitive" }])), scoring: { method: "normalized-text", maxScore: 1, passThreshold: 0.9, mistakeTags: ["beginning-sound-confusion", "letter-sound-confusion"] }, prerequisiteConceptIds: [], rationale: "Familiar words and original local line art provide an accessible sound cue." });
}

export function generateHandwritingWriting(options: GeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed); const texts = ["A", "M", "S", "sun", "I see a sun.", "My cat is soft."]; const items: HandwritingWritingItem[] = Array.from({ length: count }, (_, index) => { const targetText = texts[Math.floor(next() * texts.length)] ?? "A"; const mode = index % 3 === 0 ? "trace" : index % 3 === 1 ? "copy" : "free-write"; return { id: `writing-${options.seed}-${index + 1}`, conceptId: "english.letter-formation", kind: "handwriting-writing", prompt: mode === "trace" ? `Trace ${targetText}.` : mode === "copy" ? `Copy ${targetText}.` : `Write ${targetText}.`, directions: "Start at the dot and keep your letters on the lines.", assetRefs: [], difficulty: targetText.length > 1 ? 3 : 2, metadata: { generator: "handwriting-writing", seed: options.seed }, mode, targetText, rubricId: "handwriting-legibility-v1" }; });
  return completeActivity(options, { generatorName: "handwriting-writing", subject: "english", conceptId: "english.letter-formation", title: "Handwriting Practice", objectives: ["Form letters and copy a short sentence neatly."], difficultyLevel: 3, estimatedMinutes: count * 3, activityType: "practice", visualSupport: { enabled: false, assetRefs: [], description: "Ruled writing space supports tracing, copying, and independent writing." }, instructions: ["Trace or copy each letter or sentence.", "Write on the lines."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "rubric", rubricId: item.rubricId, requiresHumanReview: true }])), scoring: { method: "rubric", maxScore: 1, passThreshold: 0.9, mistakeTags: ["letter-formation-review", "writing-legibility-review"] }, prerequisiteConceptIds: ["english.beginning-sounds"], rationale: "Short, original trace/copy prompts keep handwriting evidence review-gated." });
}

export function generateReadingForDetail(options: GeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount);
  const passages = [
    { passage: "Mia puts a blue cup beside the sink. She fills it with water for a small seedling.", question: "What does Mia fill?", choices: ["a cup", "a shoe", "a bag"], answer: "a cup" },
    { passage: "Leo sees a red kite in the tree. He asks Dad for a long stick, and together they lift it down.", question: "Where is the kite?", choices: ["in the tree", "under the bed", "by the pond"], answer: "in the tree" },
    { passage: "Nora hears rain on the roof. She takes yellow boots and walks slowly to the garden.", question: "What does Nora take?", choices: ["yellow boots", "a red hat", "a green ball"], answer: "yellow boots" },
    { passage: "Sam puts two warm rolls on a plate. He gives one to Gran and keeps one for himself.", question: "How many rolls are on the plate?", answer: "two" },
  ] as const;
  const items: ReadingComprehensionItem[] = Array.from({ length: count }, (_, index) => {
    const source = passages[positiveModulo(options.seed + index, passages.length)] ?? passages[0];
    const selected = index % 2 === 0;
    const sourceChoices = "choices" in source ? source.choices : undefined;
    const choices = selected ? (sourceChoices ?? [source.answer, "one", "three"]) : undefined;
    return {
      id: `reading-${options.seed}-${index + 1}`, conceptId: "english.reading-for-detail", kind: "reading-comprehension",
      prompt: source.question, directions: "Read the passage. Answer the question.", assetRefs: [], difficulty: sourceChoices ? 3 : 4,
      metadata: { generator: "reading-for-detail", seed: options.seed }, passage: source.passage, question: source.question,
      ...(choices ? { choices: [...choices] } : {}), correctAnswer: source.answer,
    };
  });
  return completeActivity(options, { generatorName: "reading-for-detail", subject: "english", conceptId: "english.reading-for-detail", title: "Reading Comprehension", objectives: ["Use a detail from a short passage to answer a question."], difficultyLevel: 3, estimatedMinutes: count * 3, activityType: "practice", visualSupport: { enabled: false, assetRefs: [], description: "Each item presents one distinct short passage before its response." }, instructions: ["Read each passage.", "Answer each question."], items, answerSpecs: readingAnswerSpecs(items), scoring: { method: "normalized-text", maxScore: 1, passThreshold: 0.9, mistakeTags: ["detail-not-found", "reading-response-error"] }, prerequisiteConceptIds: ["english.beginning-sounds"], rationale: "Original short passages cycle deterministically; even items use selected responses and odd items use written responses." });
}

function readingAnswerSpecs(items: readonly ReadingComprehensionItem[]): ActivitySpec["answerSpecs"] {
  return Object.fromEntries(items.map((item, index) => [item.id, index % 2 === 0 ? { type: "choice", expected: item.correctAnswer } : { type: "text", expected: item.correctAnswer, normalize: "case-insensitive" }])) as ActivitySpec["answerSpecs"];
}

const REASONING_SEQUENCE_TEMPLATES = [
  { sequence: ["seed", "sprout", "flower"], answer: [0, 1, 2], reasoningType: "sequence" as const, prompt: "Put the plant story in order." },
  { sequence: ["red circle", "blue circle", "red circle", "blue circle"], answer: [0, 1, 2, 3], reasoningType: "pattern" as const, prompt: "Read the repeating pattern from left to right." },
  { sequence: ["rain cloud", "puddle", "boots"], answer: [0, 1, 2], reasoningType: "cause-effect" as const, prompt: "Show what can happen after rain." },
] as const;
const REASONING_CLASSIFY_TEMPLATES = [
  { sequence: ["apple", "pear", "carrot", "banana"], answer: [0, 1, 3], reasoningType: "classification" as const, prompt: "Which cards belong with the fruit cards?" },
] as const;

type ReasoningTemplate = (typeof REASONING_SEQUENCE_TEMPLATES)[number] | (typeof REASONING_CLASSIFY_TEMPLATES)[number];
function generateReasoningPack(options: GeneratorOptions, conceptId: string, generatorName: string, title: string, objective: string, templates: readonly ReasoningTemplate[], prerequisiteConceptIds: string[]): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed);
  const items: SequencingReasoningItem[] = Array.from({ length: count }, (_, index) => {
    const template = templates[(index + Math.floor(next() * templates.length)) % templates.length]!;
    return { id: `${generatorName}-${options.seed}-${index + 1}`, conceptId, kind: "sequencing-reasoning", prompt: template.prompt, directions: "Write the card numbers in the correct order.", assetRefs: [], difficulty: template.reasoningType === "classification" ? 3 : 2, metadata: { generator: generatorName, seed: options.seed }, sequence: [...template.sequence], answer: [...template.answer], reasoningType: template.reasoningType };
  });
  return completeActivity(options, { generatorName, subject: "reasoning", conceptId, title, objectives: [objective], difficultyLevel: conceptId === "reasoning.classify-and-explain" ? 3 : 2, estimatedMinutes: count * 3, activityType: conceptId === "reasoning.classify-and-explain" ? "application" : "practice", visualSupport: { enabled: false, assetRefs: [], description: "Original word cards make the target reasoning operation visible." }, instructions: ["Look at the cards.", "Write the card numbers in the correct order."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "sequence", expected: item.answer }])), scoring: { method: "sequence", maxScore: 1, passThreshold: 0.9, mistakeTags: [conceptId === "reasoning.classify-and-explain" ? "classification-error" : "sequence-order-error"] }, prerequisiteConceptIds, rationale: "The activity uses only item prompts native to its curriculum concept." });
}
export function generateReasoningSequenceAndPattern(options: GeneratorOptions): ActivitySpec {
  return generateReasoningPack(options, "reasoning.sequence-and-pattern", "reasoning-sequence-and-pattern", "Sequences and patterns", "Notice order, change, and repeating patterns.", REASONING_SEQUENCE_TEMPLATES, []);
}
export function generateReasoningClassifyAndExplain(options: GeneratorOptions): ActivitySpec {
  return generateReasoningPack(options, "reasoning.classify-and-explain", "reasoning-classify-and-explain", "Classify and explain", "Group familiar things and explain a simple reason.", REASONING_CLASSIFY_TEMPLATES, ["reasoning.sequence-and-pattern"]);
}
export const generateReasoning = generateReasoningSequenceAndPattern;

const SCIENCE_OBSERVE_PROMPTS = [
  { prompt: "Look at a leaf. What color, shape, and texture do you notice?", features: ["color", "shape", "texture"], expected: ["green", "veins", "smooth or bumpy"] },
  { prompt: "Look at a pebble. What can you observe without tasting it?", features: ["color", "shape", "hardness"], expected: ["color", "round or flat", "hard"] },
] as const;
const SCIENCE_SORT_PROMPTS = [
  { prompt: "Compare a bird and a plant. Which one can move from place to place?", features: ["movement", "body parts", "place"], expected: ["bird"] },
  { prompt: "Which one needs sunlight to grow: a bird or a plant?", features: ["needs sunlight", "grows", "living thing"], expected: ["plant"] },
] as const;
type SciencePrompt = (typeof SCIENCE_OBSERVE_PROMPTS)[number] | (typeof SCIENCE_SORT_PROMPTS)[number];
function generateSciencePack(options: GeneratorOptions, conceptId: string, generatorName: string, title: string, objective: string, prompts: readonly SciencePrompt[], prerequisiteConceptIds: string[]): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount);
  const items: ScienceObservationItem[] = Array.from({ length: count }, (_, index) => {
    const source = prompts[positiveModulo(options.seed + index, prompts.length)]!;
    return { id: `${generatorName}-${options.seed}-${index + 1}`, conceptId, kind: "science-observation", prompt: source.prompt, directions: "Observe the object. Tell or write what you notice.", assetRefs: [], difficulty: conceptId === "science.sort-living-things" ? 3 : 2, metadata: { generator: generatorName, seed: options.seed }, observationPrompt: source.prompt, observableFeatures: [...source.features], expectedObservations: [...source.expected], safetyNote: "Look and handle gently. Never taste or touch an unknown object." };
  });
  return completeActivity(options, { generatorName, subject: "science", conceptId, title, objectives: [objective], difficultyLevel: conceptId === "science.sort-living-things" ? 3 : 2, estimatedMinutes: count * 3, activityType: "application", visualSupport: { enabled: false, assetRefs: [], description: "Observation prompts keep evidence grounded in what a child can see and describe." }, instructions: ["Observe safely.", "Tell or write one thing you notice."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "observation", acceptedFeatures: item.expectedObservations, requiresHumanReview: true }])), scoring: { method: "observation", maxScore: 1, passThreshold: 0.9, mistakeTags: [conceptId === "science.sort-living-things" ? "classification-review" : "observation-review"] }, prerequisiteConceptIds, rationale: "The activity uses only prompts native to its curriculum concept and keeps observations human-reviewed." });
}
export function generateScienceObserveAndDescribe(options: GeneratorOptions): ActivitySpec {
  return generateSciencePack(options, "science.observe-and-describe", "science-observe-and-describe", "Observe and describe", "Look closely and describe what you see.", SCIENCE_OBSERVE_PROMPTS, []);
}
export function generateScienceSortLivingThings(options: GeneratorOptions): ActivitySpec {
  return generateSciencePack(options, "science.sort-living-things", "science-sort-living-things", "Sort living things", "Compare plants and animals. Tell how they are alike or different.", SCIENCE_SORT_PROMPTS, ["science.observe-and-describe"]);
}
export const generateScienceObservation = generateScienceObserveAndDescribe;

export function generateCountingNumberChoice(options: GeneratorOptions): ActivitySpec {
  const count = resolveActivityItemCount(options.itemCount); const next = rng(options.seed); const items = Array.from({ length: count }, (_, index) => { const correct = 1 + Math.floor(next() * 10); const choices = [...new Set([correct, Math.max(0, correct - 1), Math.min(10, correct + 1)])]; return { id: `counting-${options.seed}-${index + 1}`, conceptId: "math.counting-to-10", kind: "number-choice" as const, prompt: "Count the objects. Choose the number.", directions: "Count each object once. Choose the correct number.", assetRefs: [], difficulty: 1, metadata: { generator: "counting-number-choice", seed: options.seed, dotCount: correct }, choices, correctChoice: correct }; });
  return completeActivity(options, { generatorName: "counting-number-choice", subject: "math", conceptId: "math.counting-to-10", title: "Count and choose", objectives: ["Count the objects and choose the matching number."], difficultyLevel: 1, estimatedMinutes: count * 2, activityType: "practice", visualSupport: { enabled: true, assetRefs: [], description: "Number choices provide a low-writing entry point for counting." }, instructions: ["Count the dots or objects.", "Find the matching number.", "Choose one answer."], items, answerSpecs: Object.fromEntries(items.map((item) => [item.id, { type: "choice", expected: String(item.correctChoice) }])), scoring: { method: "exact", maxScore: 1, passThreshold: 0.9, mistakeTags: ["counting-error", "number-choice-error"] }, prerequisiteConceptIds: [], rationale: "Choice responses reduce writing load while practicing quantity-to-number matching." });
}

export type ActivityGenerator = (options: GeneratorOptions) => ActivitySpec;
export const ACTIVITY_GENERATORS: Readonly<Record<string, ActivityGenerator>> = {
  "math.counting-to-10": generateCountingNumberChoice,
  "math.addition-within-10": generateAdditionWithinTen,
  "math.subtraction-within-10": generateSubtractionWithinTen,
  "math.teen-numbers": generateTeenNumbers,
  "math.addition-within-20": generateAdditionWithinTwenty,
  "math.subtraction-within-20": generateSubtractionWithinTwenty,
  "math.equal-groups": generateEqualGroups,
  "math.fair-sharing": generateFairSharing,
  "english.beginning-sounds": generateEnglishBeginningSounds,
  "english.letter-formation": generateHandwritingWriting,
  "english.reading-for-detail": generateReadingForDetail,
  "reasoning.sequence-and-pattern": generateReasoningSequenceAndPattern,
  "reasoning.classify-and-explain": generateReasoningClassifyAndExplain,
  "science.observe-and-describe": generateScienceObserveAndDescribe,
  "science.sort-living-things": generateScienceSortLivingThings,
  "counting-number-choice": generateCountingNumberChoice,
  "addition-within-10": generateAdditionWithinTen,
  "subtraction-within-10": generateSubtractionWithinTen,
  "teen-numbers": generateTeenNumbers,
  "addition-within-20": generateAdditionWithinTwenty,
  "subtraction-within-20": generateSubtractionWithinTwenty,
  "equal-groups": generateEqualGroups,
  "fair-sharing": generateFairSharing,
  "handwriting-writing": generateHandwritingWriting,
  "reading-for-detail": generateReadingForDetail,
  "reasoning": generateReasoning,
  "science-observation": generateScienceObservation,
  "english-beginning-sounds": generateEnglishBeginningSounds,
};
export const GENERATOR_REGISTRY = ACTIVITY_GENERATORS;
export function generatorFor(identifier?: string): ActivityGenerator | undefined { return identifier ? ACTIVITY_GENERATORS[identifier] : undefined; }
export function generateActivityByConcept(identifier: string, options: GeneratorOptions): ActivitySpec { const generate = generatorFor(identifier); if (!generate) throw new Error(`Unknown activity or concept identifier: ${identifier}`); return generate(options); }
export const generateActivity = generateActivityByConcept;
export function listGeneratorIdentifiers(): string[] { return Object.keys(ACTIVITY_GENERATORS).sort(); }

export const generateAdditionWithin10 = generateAdditionWithinTen;
export const generateBeginningSoundActivity = generateEnglishBeginningSounds;
export { ADDITION_ASSETS };

// Keep this import meaningful for type-only consumers that inspect the item union.
export type GeneratedActivityItem = ActivityItem;
