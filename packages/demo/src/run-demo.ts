import { seedDemo } from "./seed.js";

const result = await seedDemo();
process.stdout.write(`Demo student ${result.studentId}: ${result.activityIds.length} activities, ${result.observationScores.join(", ")} comparable addition observations, final decision ${result.finalDecision}, difficulty step ${result.finalStep}, and ${result.artifacts.length} artifacts\n`);
