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

function responseControl(activity: WorksheetActivity, item: WorksheetItem, options: Required<WorksheetRenderOptions>): React.ReactNode {
  const name = `response-${item.id}`;
  const answer = answerFor(activity, item.id);
  if (options.showAnswers) return <span className="answer-reveal" data-answer-for={item.id}>{answer}</span>;
  if (item.kind === "number-choice" || item.kind === "phonics-picture-word") {
    const choices = item.kind === "number-choice" ? item.choices.map(String) : (item.choices ?? []);
    return <div className="choice-row" role="group" aria-label={`Choices for ${item.id}`}>
      {choices.map((choice, index) => <label className="choice-chip" key={`${choice}-${index}`}><input type="radio" name={name} value={choice} /> <span>{choice}</span></label>)}
    </div>;
  }
  if (item.kind === "handwriting-writing") return <textarea className="response-writing" name={name} aria-label={`Response for ${item.id}`} rows={2} placeholder="Write here" />;
  if (item.kind === "reading-comprehension") return item.choices ? <select className="response-select" name={name} defaultValue=""><option value="" disabled>Choose an answer</option>{item.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select> : <input className="response-input" name={name} aria-label={`Response for ${item.id}`} />;
  if (item.kind === "sequencing-reasoning") return <input className="response-input" name={name} aria-label={`Response for ${item.id}`} placeholder="Order" />;
  if (item.kind === "science-observation") return <textarea className="response-writing" name={name} aria-label={`Response for ${item.id}`} rows={2} placeholder="What do you notice?" />;
  return <input className="response-input response-number" name={name} inputMode="numeric" aria-label={`Response for ${item.id}`} />;
}

function renderItem(activity: WorksheetActivity, item: WorksheetItem, index: number, options: Required<WorksheetRenderOptions>): React.ReactNode {
  return <article className="worksheet-item" data-item-id={item.id} key={item.id}>
    <div className="item-number" aria-hidden="true">{index + 1}</div>
    <div className="item-body">
      <p className="item-prompt">{itemPrompt(item)}</p>
      {item.kind === "picture-addition-subtraction" && <div className={`addition-visual ${item.operation === "subtraction" ? "take-away-visual" : ""}`} aria-label={`${item.leftCount} ${item.operation === "addition" ? "plus" : "take away"} ${item.rightCount}`}>
        {item.operation === "subtraction"
          ? subtractionPictureGroup(item.assetRefs[0], item.leftCount, item.rightCount, options.assetBasePath, "pictures")
          : <>{pictureGroup(item.assetRefs[0], item.leftCount, options.assetBasePath, "pictures")}<span className="operation-mark">+</span>{pictureGroup(item.assetRefs[0], item.rightCount, options.assetBasePath, "pictures")}</>}
        {item.representation === "pictures-and-equation" && <span className="operation-mark">=</span>}
      </div>}
      {item.kind === "number-choice" && metadataCount(item, "dotCount") !== undefined && <div className="counting-dots" aria-label={`${metadataCount(item, "dotCount")} dots`}>{Array.from({ length: metadataCount(item, "dotCount") ?? 0 }, (_, dot) => <span className="counter" key={dot} aria-hidden="true">●</span>)}</div>}
      {item.kind === "phonics-picture-word" && <div className="phonics-visual">{picture(item.imageAssetRef, options.assetBasePath, `Picture of a ${item.targetWord}`)}<span className="word-label">{item.targetWord}</span></div>}
      {item.kind === "equation" && <div className="equation-display">{item.equation}</div>}
      {item.kind === "reading-comprehension" && <section className="reading-model" aria-label="Short reading passage"><div className="model-label">Read this little passage</div><p className="passage">{item.passage}</p></section>}
      {item.kind === "handwriting-writing" && <section className="writing-model" aria-label={`Writing guide: ${item.targetText}`}><div className="model-label">{item.mode === "trace" ? "Trace the model" : item.mode === "copy" ? "Copy the model" : "Write your own"}</div><div className={`trace-guide trace-${item.mode}`}>{item.mode === "free-write" ? "" : item.targetText}</div><div className="ruled-writing-space" aria-label="Ruled writing space">{Array.from({ length: item.targetText.length > 4 ? 3 : 2 }, (_, line) => <div className="writing-line" key={line} />)}</div></section>}
      {item.kind === "equal-groups-fair-sharing" && <div className={`group-display group-${item.mode}`}><div className="model-label">{item.mode === "equal-groups" ? "Put the same amount in each box" : "Share one at a time"}</div>{counterBoxes(item.total, item.groupCount)}<span className="group-action" aria-hidden="true">{item.mode === "equal-groups" ? "same in every box" : "fair for every friend"}</span></div>}
      {item.kind === "sequencing-reasoning" && <div className="sequence-display" aria-label="Reasoning cards">{item.sequence.map((part, partIndex) => <span key={`${part}-${partIndex}`} className="sequence-card"><b>{partIndex + 1}</b>{part}</span>)}</div>}
      {item.kind === "science-observation" && <section className="science-prompt"><div className="model-label">Observe and tell an adult</div><p>{item.observationPrompt}</p><div className="feature-list">{item.observableFeatures.map((feature) => <span key={feature}>{feature}</span>)}</div>{item.safetyNote && <p className="safety-note">{item.safetyNote}</p>}</section>}
      <div className="response-area">{responseControl(activity, item, options)}</div>
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
    case "sequencing-reasoning": case "science-observation": return "reason-and-sort";
    default: return "mixed-review";
  }
}

/** Stable print pagination: the first page teaches, later pages give four items room to breathe. */
export function worksheetPrintChunks(items: readonly WorksheetItem[]): WorksheetItem[][] {
  if (items.length <= 3) return [items.slice() as WorksheetItem[]];
  const pages: WorksheetItem[][] = [items.slice(0, 3) as WorksheetItem[]];
  for (let offset = 3; offset < items.length; offset += 4) pages.push(items.slice(offset, offset + 4) as WorksheetItem[]);
  return pages;
}

function WorksheetHeader({ activity, options, compact = false }: { activity: WorksheetActivity; options: Required<WorksheetRenderOptions>; compact?: boolean }): React.ReactNode {
  if (compact) return <header className="worksheet-header worksheet-header-compact"><div className="worksheet-kicker"><span>{activity.subject}</span><span>{activity.id}</span></div><h2>{activity.title}</h2></header>;
  return <header className="worksheet-header"><div className="worksheet-kicker"><span>{activity.subject}</span><span>Activity {activity.id}</span></div><div className="worksheet-title-row"><div><h1>{activity.title}</h1><p className="worksheet-objective">{activity.objectives[0]}</p></div><div className="worksheet-mark" aria-hidden="true">✦</div></div><div className="worksheet-meta"><label>Name <input defaultValue={options.studentName} readOnly={options.mode === "print"} name="studentName" /></label><label>Date <input defaultValue={options.dateLabel} readOnly={options.mode === "print"} name="date" /></label></div></header>;
}

function LearningPanels({ activity }: { activity: WorksheetActivity }): React.ReactNode {
  return <><section className="directions-panel"><div className="panel-label">Today’s plan</div><ol>{activity.instructions.slice(0, 3).map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section><section className="strategy-panel"><div><div className="panel-label">Try one together</div><p>{activity.items[0]?.directions ?? "Look closely, then show what you know."}</p></div><div className="strategy-symbol" aria-hidden="true">{worksheetTemplateFor(activity) === "phonics-and-words" ? "A" : "1 + 1"}</div></section></>;
}

function PageFooter({ activity, page, total }: { activity: WorksheetActivity; page: number; total: number }): React.ReactNode {
  return <footer className="worksheet-footer"><span>{activity.id}</span><span>{activity.estimatedMinutes} minute practice</span><span>Page {page} of {total}</span></footer>;
}

function PrintWorksheet({ activity, options }: { activity: WorksheetActivity; options: Required<WorksheetRenderOptions> }): React.ReactNode {
  const chunks = worksheetPrintChunks(activity.items);
  const answerPageCount = options.showAnswers && "answerSpecs" in activity && activity.answerSpecs ? 1 : 0;
  const total = chunks.length + answerPageCount;
  return <div className="worksheet-pages">{chunks.map((chunk, pageIndex) => <section className="worksheet-page" data-page-number={pageIndex + 1} data-page-count={total} key={`page-${pageIndex}`}><WorksheetHeader activity={activity} options={options} compact={pageIndex > 0} />{pageIndex === 0 && <LearningPanels activity={activity} />}<section className="worksheet-section"><div className="section-heading"><span>{pageIndex === 0 ? "Guided start" : pageIndex === chunks.length - 1 ? "Practice and quick check" : "Practice path"}</span><small>{pageIndex === 0 ? "Look and try" : pageIndex === chunks.length - 1 ? "Show your best thinking" : "Keep going"}</small></div>{chunk.map((item, index) => renderItem(activity, item, pageIndex === 0 ? index : pageIndex === 1 ? index + 3 : index + 3 + (pageIndex - 1) * 4, options))}</section><PageFooter activity={activity} page={pageIndex + 1} total={total} /></section>)}{answerPageCount === 1 && <section className="worksheet-page worksheet-answer-page" data-page-number={total} data-page-count={total}><WorksheetHeader activity={activity} options={options} compact /><aside className="answer-sheet"><h2>Adult answer sheet</h2><p>Keep this page with the completed work. Answers are not shown in child view.</p><ol>{activity.items.map((item) => <li key={item.id}><span>{item.id}</span><strong>{answerFor(activity, item.id)}</strong></li>)}</ol></aside><PageFooter activity={activity} page={total} total={total} /></section>}</div>;
}

function DigitalWorksheet({ activity, options }: { activity: WorksheetActivity; options: Required<WorksheetRenderOptions> }): React.ReactNode {
  const guidedCount = Math.min(2, activity.items.length); const practiceItems = activity.items.slice(guidedCount, Math.max(guidedCount, activity.items.length - 1)); const checkItems = activity.items.slice(Math.max(guidedCount, activity.items.length - 1));
  return <><WorksheetHeader activity={activity} options={options} /><LearningPanels activity={activity}/>{guidedCount > 0 && <section className="worksheet-section"><div className="section-heading"><span>Guided start</span><small>Look and try</small></div>{activity.items.slice(0, guidedCount).map((item, index) => renderItem(activity, item, index, options))}</section>}{practiceItems.length > 0 && <section className="worksheet-section"><div className="section-heading"><span>Practice path</span><small>Keep going</small></div>{practiceItems.map((item, index) => renderItem(activity, item, index + guidedCount, options))}</section>}{checkItems.length > 0 && <section className="worksheet-section quick-check"><div className="section-heading"><span>Quick check</span><small>Show your best thinking</small></div>{checkItems.map((item, index) => renderItem(activity, item, index + Math.max(guidedCount, activity.items.length - 1), options))}</section>}<PageFooter activity={activity} page={1} total={1}/>{options.showAnswers && "answerSpecs" in activity && activity.answerSpecs && <aside className="answer-sheet" aria-label="Adult answer sheet"><h2>Adult answer sheet</h2><ol>{activity.items.map((item) => <li key={item.id}><span>{item.id}</span><strong>{answerFor(activity, item.id)}</strong></li>)}</ol></aside>}</>;
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
