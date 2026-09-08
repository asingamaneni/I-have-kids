import type { WorksheetActivity, WorksheetItem, WorksheetRenderOptions } from "./types.js";

const defaults: Required<WorksheetRenderOptions> = {
  mode: "digital", showAnswers: false, studentName: "", dateLabel: "", assetBasePath: "/"
};

function assetUrl(ref: string, basePath: string): string {
  const clean = ref.replace(/^\/?assets\//, "").replace(/^\//, "");
  return `${basePath.replace(/\/$/, "")}/${clean}`;
}

function picture(ref: string | undefined, basePath: string, label: string): React.ReactNode {
  if (!ref) return <span className="worksheet-picture worksheet-picture-empty" aria-hidden="true">○</span>;
  // eslint-disable-next-line @next/next/no-img-element -- this package renders framework-agnostic worksheet HTML.
  return <img className="worksheet-picture" src={assetUrl(ref, basePath)} alt={label} />;
}

function itemPrompt(item: WorksheetItem): string { return item.prompt; }

function metadataCount(item: WorksheetItem, key: string): number | undefined {
  const metadata = item.metadata as Record<string, unknown>;
  const value = Number(metadata[key]);
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : undefined;
}

function answerFor(activity: WorksheetActivity, itemId: string): string {
  if (!("answerSpecs" in activity) || !activity.answerSpecs) return "Answer unavailable";
  const answer = activity.answerSpecs[itemId];
  if (!answer) return "Answer unavailable";
  switch (answer.type) {
    case "integer": case "number": return String(answer.expected);
    case "text": case "choice": return answer.expected;
    case "sequence": return answer.expected.join(", ");
    case "rubric": return `Use rubric ${answer.rubricId}`;
    case "observation": return answer.acceptedFeatures.join(", ");
  }
}

function pictureGroup(ref: string | undefined, count: number, basePath: string, label: string, crossed = false): React.ReactNode {
  const countedLabel = count === 1 && label.endsWith("s") ? label.slice(0, -1) : label;
  return <div className={`picture-group${crossed ? " picture-group-crossed" : ""}`} aria-label={`${count} ${countedLabel}${crossed ? ", taken away" : ""}`}>
    {count === 0
      ? <span className="picture-group-empty" aria-label={`No ${label}`}>0</span>
      : Array.from({ length: count }, (_, index) => <span className="picture-tile" key={`${label}-${index}`}><span className={crossed ? "picture-crossed" : undefined}>{picture(ref, basePath, label)}</span>{crossed && <span className="cross-mark" aria-hidden="true">×</span>}</span>)}
  </div>;
}

function subtractionPictureGroup(ref: string | undefined, total: number, takeAway: number, basePath: string, label: string): React.ReactNode {
  return <div className="picture-group take-away-group" aria-label={`${total} pictures, ${takeAway} taken away`}>
    {Array.from({ length: total }, (_, index) => {
      const crossed = index >= total - takeAway;
      return <span className="picture-tile" key={`${label}-${index}`}><span className={crossed ? "picture-crossed" : undefined}>{picture(ref, basePath, label)}</span>{crossed && <span className="cross-mark" aria-hidden="true">×</span>}</span>;
    })}
  </div>;
}

function counterBoxes(total: number, groups: number): React.ReactNode {
  return <div className="sharing-model" aria-label={`${total} loose counters and ${groups} empty groups`}>
    <div className="counter-bank" aria-label={`${total} counters to share`}>{Array.from({ length: total }, (_, index) => <span className="counter" key={`counter-${index}`} aria-hidden="true">●</span>)}</div>
    <span className="group-arrow" aria-hidden="true">→</span>
    <div className="counter-boxes">{Array.from({ length: groups }, (_, groupIndex) => <div className="counter-box" key={`box-${groupIndex}`} aria-label={`Empty group ${groupIndex + 1}`}><span>{groupIndex + 1}</span></div>)}</div>
    <span className="group-count-label">{total} counters · {groups} equal groups</span>
  </div>;
}

function responseControl(activity: WorksheetActivity, item: WorksheetItem, options: Required<WorksheetRenderOptions>, questionNumber: number): React.ReactNode {
  const name = `response-${item.id}`;
  const answer = answerFor(activity, item.id);
  const answerLabel = `Answer for question ${questionNumber}`;
  if (options.showAnswers) return <span className="answer-reveal" data-answer-for={item.id}>{answer}</span>;
  if (item.kind === "number-choice" || item.kind === "phonics-picture-word" || item.kind === "selected-response") {
    const choices = item.kind === "number-choice" ? item.choices.map(String) : (item.choices ?? []);
    return <div className="choice-row" role="group" aria-label={`Answer choices for question ${questionNumber}`}>
      {choices.map((choice, index) => <label className="choice-chip" key={`${choice}-${index}`}><input type="radio" name={name} value={choice} /> <span>{choice}</span></label>)}
    </div>;
  }
  if (item.kind === "handwriting-writing" || item.kind === "extended-response") return <textarea className="response-writing" name={name} aria-label={answerLabel} rows={item.kind === "extended-response" ? item.minimumLines : 2} placeholder="Write here" />;
  if (item.kind === "reading-comprehension") return item.choices ? <select className="response-select" name={name} aria-label={answerLabel} defaultValue=""><option value="" disabled>Choose an answer</option>{item.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select> : <input className="response-input" name={name} aria-label={answerLabel} />;
  if (item.kind === "sequencing-reasoning" || item.kind === "ordering") return <input className="response-input" name={name} aria-label={answerLabel} placeholder="Write the numbers in order." />;
  if (item.kind === "science-observation") return <textarea className="response-writing" name={name} aria-label={answerLabel} rows={2} placeholder="What do you notice?" />;
  return <input className="response-input response-number" name={name} inputMode="numeric" aria-label={answerLabel} />;
}

function renderItem(activity: WorksheetActivity, item: WorksheetItem, index: number, options: Required<WorksheetRenderOptions>): React.ReactNode {
  const pictureAnswerInline = options.mode === "print" && item.kind === "picture-addition-subtraction";
  return <article className={`worksheet-item${item.kind === "picture-addition-subtraction" ? " worksheet-item-picture" : ""}`} data-item-id={item.id} key={item.id}>
    <div className="item-number" aria-hidden="true">{index + 1}</div>
    <div className="item-body">
      <p className="item-prompt">{itemPrompt(item)}</p>
      {(item.kind === "selected-response" || item.kind === "numeric-response" || item.kind === "short-response" || item.kind === "extended-response" || item.kind === "ordering") && item.content && <section className="reading-model content-block"><p className="passage">{item.content}</p></section>}
      {item.kind === "picture-addition-subtraction" && <div className={`addition-visual ${item.operation === "subtraction" ? "take-away-visual" : ""}`} aria-label={`${item.leftCount} ${item.operation === "addition" ? "plus" : "take away"} ${item.rightCount}`}>
        {item.operation === "subtraction"
          ? subtractionPictureGroup(item.assetRefs[0], item.leftCount, item.rightCount, options.assetBasePath, "pictures")
          : <>{pictureGroup(item.assetRefs[0], item.leftCount, options.assetBasePath, "pictures")}<span className="operation-mark">+</span>{pictureGroup(item.assetRefs[0], item.rightCount, options.assetBasePath, "pictures")}</>}
        {item.representation === "pictures-and-equation" && <span className="operation-mark">=</span>}
        {pictureAnswerInline && responseControl(activity, item, options, index + 1)}
      </div>}
      {item.kind === "number-choice" && metadataCount(item, "dotCount") !== undefined && <div className="counting-dots" aria-label={`${metadataCount(item, "dotCount")} dots`}>{Array.from({ length: metadataCount(item, "dotCount") ?? 0 }, (_, dot) => <span className="counter" key={dot} aria-hidden="true">●</span>)}</div>}
      {item.kind === "phonics-picture-word" && <div className="phonics-visual">{picture(item.imageAssetRef, options.assetBasePath, `Picture of a ${item.targetWord}`)}<span className="word-label">{item.targetWord}</span></div>}
      {item.kind === "equation" && <div className="equation-display">{item.equation}</div>}
      {item.kind === "reading-comprehension" && <section className="reading-model" aria-label="Short reading passage"><div className="model-label">Read the passage.</div><p className="passage">{item.passage}</p></section>}
      {item.kind === "handwriting-writing" && <section className="writing-model" aria-label={`Writing guide: ${item.targetText}`}><div className="model-label">{item.mode === "trace" ? "Trace the example" : item.mode === "copy" ? "Copy the example" : "Write your own"}</div><div className={`trace-guide trace-${item.mode}`}>{item.mode === "free-write" ? "" : item.targetText}</div><div className="ruled-writing-space" aria-label="Ruled writing space">{Array.from({ length: item.targetText.length > 4 ? 3 : 2 }, (_, line) => <div className="writing-line" key={line} />)}</div></section>}
      {item.kind === "equal-groups-fair-sharing" && <div className={`group-display group-${item.mode}`}><div className="model-label">{item.mode === "equal-groups" ? "Put the same number in each box" : "Share one at a time"}</div>{counterBoxes(item.total, item.groupCount)}<span className="group-action" aria-hidden="true">{item.mode === "equal-groups" ? "Each group must be equal." : "Each person gets the same number."}</span></div>}
      {item.kind === "sequencing-reasoning" && <div className="sequence-display" aria-label="Cards for this question">{item.sequence.map((part, partIndex) => <span key={`${part}-${partIndex}`} className="sequence-card"><b>{partIndex + 1}</b>{part}</span>)}</div>}
      {item.kind === "ordering" && <div className="sequence-display" aria-label="Items to put in order">{item.options.map((part, partIndex) => <span key={`${part}-${partIndex}`} className="sequence-card"><b>{partIndex + 1}</b>{part}</span>)}</div>}
      {item.kind === "science-observation" && <section className="science-prompt"><div className="model-label">Observe.</div><p>{item.observationPrompt}</p><div className="feature-list">{item.observableFeatures.map((feature) => <span key={feature}>{feature}</span>)}</div>{item.safetyNote && <p className="safety-note">{item.safetyNote}</p>}</section>}
      {!pictureAnswerInline && <div className="response-area">{responseControl(activity, item, options, index + 1)}</div>}
    </div>
  </article>;
}

export function worksheetTemplateFor(activity: WorksheetActivity): string {
  switch (activity.items[0]?.kind) {
    case "picture-addition-subtraction": return "visual-operation";
    case "number-choice": case "equation": case "equal-groups-fair-sharing": return "number-and-symbol";
    case "reading-comprehension": return "read-and-respond";
    case "phonics-picture-word": return "phonics-and-words";
    case "handwriting-writing": return "handwriting-and-writing";
    case "sequencing-reasoning": case "science-observation": case "ordering": return "reason-and-sort";
    case "extended-response": return "handwriting-and-writing";
    case "selected-response": case "numeric-response": case "short-response": return "mixed-review";
    default: return "mixed-review";
  }
}

export interface WorksheetLayoutProfile {
  key: string;
  pageSize: number;
  columns: 1 | 2 | 3 | 4 | 5;
  className: string;
}

export interface WorksheetPrintPage {
  items: WorksheetItem[];
  startIndex: number;
  layout: WorksheetLayoutProfile;
}

export function worksheetLayoutForItem(item: WorksheetItem): WorksheetLayoutProfile {
  if (item.kind === "equation" || item.kind === "numeric-response") return { key: "compact-number", pageSize: 20, columns: 5, className: "worksheet-items-math worksheet-items-compact worksheet-items-five-column" };
  if (item.kind === "number-choice") return { key: "number-choice", pageSize: 12, columns: 3, className: "worksheet-items-math worksheet-items-compact worksheet-items-three-column" };
  if (item.kind === "selected-response" || item.kind === "phonics-picture-word") return { key: "compact-choice", pageSize: 12, columns: 3, className: "worksheet-items-standard worksheet-items-compact worksheet-items-three-column" };
  if (item.kind === "picture-addition-subtraction") {
    const total = item.leftCount + item.rightCount;
    if (total > 12) return { key: "large-picture", pageSize: 5, columns: 1, className: "worksheet-items-math worksheet-items-one-column" };
    return { key: "small-picture", pageSize: 9, columns: 3, className: "worksheet-items-math worksheet-items-three-column" };
  }
  if (item.kind === "equal-groups-fair-sharing") return { key: "group-model", pageSize: 6, columns: 2, className: "worksheet-items-math worksheet-items-two-column" };
  if (item.kind === "short-response" || item.kind === "sequencing-reasoning" || item.kind === "ordering") return { key: "short-response", pageSize: 8, columns: 2, className: "worksheet-items-standard worksheet-items-two-column" };
  return { key: "full-response", pageSize: 4, columns: 1, className: "worksheet-items-standard worksheet-items-one-column" };
}

export function worksheetPageSize(activity: WorksheetActivity): number {
  return activity.items[0] ? worksheetLayoutForItem(activity.items[0]).pageSize : 4;
}

export function worksheetPrintChunks(items: readonly WorksheetItem[], pageSize = 4): WorksheetItem[][] {
  const chunks: WorksheetItem[][] = [];
  for (let offset = 0; offset < items.length; offset += pageSize) chunks.push(items.slice(offset, offset + pageSize) as WorksheetItem[]);
  return chunks;
}

export function paginateWorksheetItems(activity: WorksheetActivity): WorksheetPrintPage[] {
  const pages: WorksheetPrintPage[] = [];
  let offset = 0;
  while (offset < activity.items.length) {
    const layout = worksheetLayoutForItem(activity.items[offset]!);
    let end = offset + 1;
    while (end < activity.items.length && worksheetLayoutForItem(activity.items[end]!).key === layout.key) end += 1;
    for (let chunkStart = offset; chunkStart < end; chunkStart += layout.pageSize) {
      pages.push({ items: activity.items.slice(chunkStart, Math.min(end, chunkStart + layout.pageSize)) as WorksheetItem[], startIndex: chunkStart, layout });
    }
    offset = end;
  }
  return pages;
}

function subjectLabel(subject: WorksheetActivity["subject"]): string {
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}

function activityTypeLabel(activityType: WorksheetActivity["activityType"]): string {
  switch (activityType) {
    case "assessment": return "Check";
    case "introduction": return "Learn";
    case "review": return "Review";
    default: return "Practice";
  }
}

function WorksheetHeader({ activity, options, compact = false }: { activity: WorksheetActivity; options: Required<WorksheetRenderOptions>; compact?: boolean }): React.ReactNode {
  if (options.mode === "print" && activity.subject === "math") return <header className={`worksheet-header worksheet-header-math${compact ? " worksheet-header-compact" : ""}`}><div className="worksheet-title-row"><div>{compact ? <h2>{activity.title}</h2> : <h1>{activity.title}</h1>}{!compact && <p className="worksheet-objective">{activity.objectives[0]}</p>}</div></div>{!compact && <div className="worksheet-meta"><label>Name <input defaultValue={options.studentName} readOnly name="studentName" /></label><label>Date <input defaultValue={options.dateLabel} readOnly name="date" /></label><label>Score <input readOnly name="score" /></label></div>}</header>;
  if (compact) return <header className="worksheet-header worksheet-header-compact"><div className="worksheet-kicker"><span>{subjectLabel(activity.subject)}</span><span>Continued</span></div><h2>{activity.title}</h2></header>;
  return <header className="worksheet-header"><div className="worksheet-kicker"><span>{subjectLabel(activity.subject)}</span><span>{activityTypeLabel(activity.activityType)}</span></div><div className="worksheet-title-row"><div><h1>{activity.title}</h1><p className="worksheet-objective">{activity.objectives[0]}</p></div></div><div className="worksheet-meta"><label>Name <input defaultValue={options.studentName} readOnly={options.mode === "print"} name="studentName" /></label><label>Date <input defaultValue={options.dateLabel} readOnly={options.mode === "print"} name="date" /></label></div></header>;
}

function worksheetDirections(activity: WorksheetActivity): string {
  const first = activity.items[0];
  if (first?.kind === "picture-addition-subtraction") return first.operation === "addition" ? "Add. Write each sum." : "Cross out the number taken away. Write how many are left.";
  if (first?.kind === "equation") return first.equation.includes("+") ? "Add. Write each sum." : "Subtract. Write each difference.";
  if (first?.kind === "number-choice") return "Count each set. Choose the correct number.";
  if (first?.kind === "equal-groups-fair-sharing") return first.mode === "equal-groups" ? "Make equal groups. Write how many are in each group." : "Share equally. Write how many each person gets.";
  return activity.instructions.slice(0, 2).join(" ");
}

function LearningPanels({ activity }: { activity: WorksheetActivity }): React.ReactNode {
  const directions = worksheetDirections(activity);
  const showExample = activity.activityType !== "assessment" && activity.subject !== "math" && activity.items[0]?.directions;
  return <><section className="directions-panel"><div className="panel-label">Directions</div><p>{directions}</p></section>{showExample && <section className="strategy-panel"><div><div className="panel-label">Example</div><p>{activity.items[0]!.directions}</p></div></section>}</>;
}

function PageFooter({ activity, page, total }: { activity: WorksheetActivity; page: number; total: number }): React.ReactNode {
  return <footer className="worksheet-footer"><span>{activity.title}</span><span>Page {page} of {total}</span></footer>;
}

function PrintWorksheet({ activity, options }: { activity: WorksheetActivity; options: Required<WorksheetRenderOptions> }): React.ReactNode {
  const pages = paginateWorksheetItems(activity);
  const answerChunks = options.showAnswers && "answerSpecs" in activity && activity.answerSpecs ? worksheetPrintChunks(activity.items, 20) : [];
  const total = pages.length + answerChunks.length;
  const mathClass = activity.subject === "math" ? " worksheet-page-math" : "";
  return <div className="worksheet-pages">{pages.map((page, pageIndex) => <section className={`worksheet-page${mathClass}`} data-page-number={pageIndex + 1} data-page-count={total} data-layout={page.layout.key} key={`page-${pageIndex}`}><WorksheetHeader activity={activity} options={options} compact={pageIndex > 0} />{pageIndex === 0 && <LearningPanels activity={activity} />}<section className="worksheet-section"><div className="section-heading worksheet-problems-heading"><span>{activity.activityType === "assessment" ? "Questions" : "Practice"}</span></div><div className={page.layout.className}>{page.items.map((item, index) => renderItem(activity, item, page.startIndex + index, options))}</div></section><PageFooter activity={activity} page={pageIndex + 1} total={total} /></section>)}{answerChunks.map((chunk, answerIndex) => { const pageNumber = pages.length + answerIndex + 1; return <section className="worksheet-page worksheet-answer-page" data-page-number={pageNumber} data-page-count={total} key={`answers-${answerIndex}`}><WorksheetHeader activity={activity} options={options} compact /><aside className="answer-sheet"><h2>Adult answer sheet</h2>{answerIndex === 0 && <p>Keep these pages with the completed work. Answers are not shown in child view.</p>}<ol start={answerIndex * 20 + 1}>{chunk.map((item) => <li key={item.id}><span>{item.id}</span><strong>{answerFor(activity, item.id)}</strong></li>)}</ol></aside><PageFooter activity={activity} page={pageNumber} total={total} /></section>; })}</div>;
}

function DigitalWorksheet({ activity, options }: { activity: WorksheetActivity; options: Required<WorksheetRenderOptions> }): React.ReactNode {
  const guidedCount = Math.min(2, activity.items.length); const practiceItems = activity.items.slice(guidedCount, Math.max(guidedCount, activity.items.length - 1)); const checkItems = activity.items.slice(Math.max(guidedCount, activity.items.length - 1));
  return <><WorksheetHeader activity={activity} options={options} /><LearningPanels activity={activity}/>{guidedCount > 0 && <section className="worksheet-section"><div className="section-heading"><span>Practice</span><small>Answer each question.</small></div>{activity.items.slice(0, guidedCount).map((item, index) => renderItem(activity, item, index, options))}</section>}{practiceItems.length > 0 && <section className="worksheet-section"><div className="section-heading"><span>More practice</span><small>Answer the next questions.</small></div>{practiceItems.map((item, index) => renderItem(activity, item, index + guidedCount, options))}</section>}{checkItems.length > 0 && <section className="worksheet-section quick-check"><div className="section-heading"><span>Review</span><small>Complete the last question.</small></div>{checkItems.map((item, index) => renderItem(activity, item, index + Math.max(guidedCount, activity.items.length - 1), options))}</section>}<PageFooter activity={activity} page={1} total={1}/>{options.showAnswers && "answerSpecs" in activity && activity.answerSpecs && <aside className="answer-sheet" aria-label="Adult answer sheet"><h2>Adult answer sheet</h2><ol>{activity.items.map((item) => <li key={item.id}><span>{item.id}</span><strong>{answerFor(activity, item.id)}</strong></li>)}</ol></aside>}</>;
}

export function WorksheetRenderer({ activity, options: provided }: { activity: WorksheetActivity; options?: WorksheetRenderOptions }): React.ReactElement {
  const options = { ...defaults, ...provided };
  return <main className={`worksheet-shell worksheet-${options.mode}`} data-render-ready="true" data-template={worksheetTemplateFor(activity)} data-activity-id={activity.id}>{options.mode === "print" ? <PrintWorksheet activity={activity} options={options} /> : <DigitalWorksheet activity={activity} options={options} />}</main>;
}

export function worksheetOptions(options?: WorksheetRenderOptions): Required<WorksheetRenderOptions> { return { ...defaults, ...options }; }
export const VisualOperationTemplate = WorksheetRenderer;
export const NumberAndSymbolTemplate = WorksheetRenderer;
export const ReadAndRespondTemplate = WorksheetRenderer;
export const PhonicsAndWordsTemplate = WorksheetRenderer;
export const HandwritingAndWritingTemplate = WorksheetRenderer;
export const ReasonAndSortTemplate = WorksheetRenderer;
export const MixedReviewTemplate = WorksheetRenderer;
export type { WorksheetMode, WorksheetRenderOptions } from "./types.js";
