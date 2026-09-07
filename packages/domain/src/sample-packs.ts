import growingPathsJson from "../../../curriculum/growing-paths.json";
import { CurriculumPackRevisionSchema } from "@child-learning/contracts";

export const GROWING_PATHS_REVISION = CurriculumPackRevisionSchema.parse(growingPathsJson);
