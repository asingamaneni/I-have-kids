import type { ActivitySpec, ActivityItem, ChildActivityItem, ChildActivitySpec } from "@kindergarten/contracts";

export type WorksheetMode = "digital" | "print";
export type WorksheetActivity = ActivitySpec | ChildActivitySpec;
export type WorksheetItem = ActivityItem | ChildActivityItem;

export interface WorksheetRenderOptions {
  mode?: WorksheetMode;
  showAnswers?: boolean;
  studentName?: string;
  dateLabel?: string;
  assetBasePath?: string;
}

export interface WorksheetTemplateProps {
  activity: WorksheetActivity;
  options: Required<WorksheetRenderOptions>;
}

export type SupportedWorksheetItem = Extract<ActivityItem,
  { kind: "picture-addition-subtraction" | "phonics-picture-word" | "number-choice" | "equation" | "handwriting-writing" | "reading-comprehension" | "sequencing-reasoning" | "science-observation" | "equal-groups-fair-sharing" }>;
