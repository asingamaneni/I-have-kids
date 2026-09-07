import { describe, expect, it } from "vitest";
import { ActivitySpecSchema, toChildActivitySpec } from "../../../packages/contracts/src/index.ts";
import { generateAdditionWithinTen, generateAdditionWithinTwenty, generateEnglishBeginningSounds, generateSubtractionWithinTen, generateEqualGroups, generateFairSharing, generateHandwritingWriting, generateReadingForDetail, generateReasoning, generateScienceObservation } from "../../../packages/domain/src/index.ts";
import { createElement } from "../../../packages/rendering/node_modules/react/index.js";
import { renderToStaticMarkup } from "../../../apps/web/node_modules/react-dom/server.js";
import { WorksheetRenderer, worksheetOptions, worksheetPageSize, worksheetPrintChunks, worksheetTemplateFor } from "../../../packages/rendering/src/index.ts";

describe("worksheet rendering contracts", () => {
  it("selects the visual-operation template for persisted picture addition", () => {
    const activity = generateAdditionWithinTen({ seed: 77, studentId: "student-test", itemCount: 3 });
    const before = JSON.stringify(activity.answerSpecs);
    expect(worksheetTemplateFor(activity)).toBe("visual-operation");
    expect(JSON.stringify(activity.answerSpecs)).toBe(before);
    expect(worksheetOptions({ mode: "print", showAnswers: true }).showAnswers).toBe(true);
  });

  it("selects the phonics template and preserves answer specs", () => {
    const activity = generateEnglishBeginningSounds({ seed: 18, studentId: "student-test", itemCount: 2 });
    expect(worksheetTemplateFor(activity)).toBe("phonics-and-words");
    expect(Object.values(activity.answerSpecs).every((answer) => answer.type === "text")).toBe(true);
    expect(worksheetOptions({ mode: "digital" }).showAnswers).toBe(false);
  });

  it("selects semantic templates for the broader packs", () => {
    expect(worksheetTemplateFor(generateSubtractionWithinTen({ seed: 1 }))).toBe("visual-operation");
    expect(worksheetTemplateFor(generateEqualGroups({ seed: 1 }))).toBe("number-and-symbol");
    expect(worksheetTemplateFor(generateFairSharing({ seed: 1 }))).toBe("number-and-symbol");
    expect(worksheetTemplateFor(generateHandwritingWriting({ seed: 1 }))).toBe("handwriting-and-writing");
    expect(worksheetTemplateFor(generateReadingForDetail({ seed: 1 }))).toBe("read-and-respond");
    expect(worksheetTemplateFor(generateReasoning({ seed: 1 }))).toBe("reason-and-sort");
    expect(worksheetTemplateFor(generateScienceObservation({ seed: 1 }))).toBe("reason-and-sort");
    const html = renderToStaticMarkup(createElement(WorksheetRenderer, { activity: generateEqualGroups({ seed: 1, itemCount: 2 }), options: { mode: "digital" } }));
    expect(html).toContain("counter-box");
    expect(html).toContain("same number in each box");
    const subtractionHtml = renderToStaticMarkup(createElement(WorksheetRenderer, { activity: generateSubtractionWithinTen({ seed: 1, itemCount: 2 }), options: { mode: "digital" } }));
    expect(subtractionHtml).toContain("cross-mark");
    expect(subtractionHtml).toContain('aria-label="Answer for question 1"');
    expect(subtractionHtml).not.toContain('aria-label="Response for');
  });

  it("renders generic curriculum primitives without exposing their answers", () => {
    const activity = ActivitySpecSchema.parse({ schemaVersion: "1.0", id: "social-activity", studentId: "student-test", subject: "social-studies", conceptId: "social-studies.maps", title: "Maps and keys", objectives: ["Use a map key."], difficultyLevel: 4, estimatedMinutes: 10, activityType: "practice", representationStage: "visual", deliveryMode: "guided-screen", evidencePurpose: "formative", curriculumVersion: "growing-paths-r1", instructions: ["Read. Choose one answer."], items: [{ id: "map-choice", conceptId: "social-studies.maps", kind: "selected-response", content: "A blue line stands for a river.", prompt: "What does the blue line show?", choices: ["a river", "a road"], correctChoice: "a river", difficulty: 4 }], answerSpecs: { "map-choice": { type: "choice", expected: "a river" } }, scoring: { method: "exact" }, sourceMetadata: { origin: "original" }, createdAt: "2026-01-01T00:00:00.000Z" });
    const child = toChildActivitySpec(activity);
    const html = renderToStaticMarkup(createElement(WorksheetRenderer, { activity: child, options: { mode: "digital" } }));
    expect(html).toContain("A blue line stands for a river.");
    expect(html).toContain("a river");
    expect(child.items[0]).not.toHaveProperty("correctChoice");
    expect(html).not.toContain("answer-reveal");
  });

  it("uses a compact one-page layout for picture addition within twenty", () => {
    const activity = generateAdditionWithinTwenty({ seed: 12, studentId: "student-test", itemCount: 5 });
    expect(worksheetPageSize(activity)).toBe(5);
    const html = renderToStaticMarkup(createElement(WorksheetRenderer, { activity, options: { mode: "print" } }));
    expect(html).toContain("worksheet-items-one-column");
    expect(html).toContain("Add. Write the sum.");
    expect((html.match(/class="worksheet-page(?:"| )/g) ?? [])).toHaveLength(1);
  });

  it("creates stable Letter page sections and an isolated adult answer page", () => {
    const activity = generateAdditionWithinTen({ seed: 101, studentId: "student-test", itemCount: 10 });
    expect(worksheetPageSize(activity)).toBe(10);
    expect(worksheetPrintChunks(activity.items, worksheetPageSize(activity)).map((page) => page.length)).toEqual([10]);
    const html = renderToStaticMarkup(createElement(WorksheetRenderer, { activity, options: { mode: "print", showAnswers: true } }));
    expect((html.match(/class="worksheet-page(?:"| )/g) ?? []).length).toBe(2);
    expect(html).toContain("Page 1 of 2");
    expect(html).toContain("Page 2 of 2");
    expect(html.indexOf("worksheet-answer-page")).toBeGreaterThan(html.indexOf("Page 1 of 2"));
    expect(html).toContain("worksheet-items-two-column");
    expect(html).not.toContain("Today’s plan");
    expect(html).not.toContain("Guided start");
  });
});
