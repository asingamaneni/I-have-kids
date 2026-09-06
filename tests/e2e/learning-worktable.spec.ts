import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/demo/seed");
  expect(response.ok()).toBe(true);
});

test("landing and child shelf are reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Learning that grows with them." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Set up a learner" })).toHaveAttribute("href", "/setup");
  await expect(page.getByRole("link", { name: "Explore the demo" })).toHaveAttribute("href", "/child/student-demo-ava");
  await page.goto("/child/student-demo-ava");
  await expect(page.getByRole("heading", { name: /Hi, Ava/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Practice shelf")).toBeVisible();
});

test("a local user can report current abilities and receive a starting diagnostic", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Profile mutation runs once in desktop Chromium");
  await page.goto("/setup");
  await page.getByLabel("Child's display name").fill("Local Learner");
  await page.getByLabel(/School placement/).fill("Kindergarten");
  await page.getByLabel("Joins groups to add with objects or pictures").check();
  await page.getByLabel(/Current interests/).fill("Builds number stories with blocks.");
  await page.getByRole("button", { name: "Create learner and starting assessment" }).click();
  await expect(page.getByRole("heading", { name: /Hi, Local/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: /Starting check: Picture addition within 10/ }).click();
  await expect(page.getByRole("heading", { name: "Starting check: Picture addition within 10" })).toBeVisible();
});

test("practice shelf can be organized by subject and concept", async ({ page }) => {
  await page.goto("/child/student-demo-ava");
  await page.getByRole("tab", { name: "By subject" }).click();
  await expect(page.getByRole("combobox", { name: "Choose subject" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Math" })).toBeVisible();
  await page.getByRole("tab", { name: "By concept" }).click();
  await expect(page.getByRole("combobox", { name: "Choose concept" })).toBeVisible();
});

test("locked concepts stay off the child shelf but adults can open a concrete introduction", async ({ page }) => {
  await page.goto("/child/student-demo-ava");
  await expect(page.getByRole("link", { name: /Picture subtraction within 10/ })).toHaveCount(0);
  await page.goto("/child/student-demo-ava/activity/activity-subtraction-01");
  await expect(page.getByRole("heading", { name: "That page is not on this shelf." })).toBeVisible();
  const adultPage = await page.context().newPage();
  await adultPage.goto("/adult/student-demo-ava/path");
  const subtraction = adultPage.locator('[data-slot="card"]').filter({ has: adultPage.getByText("Subtraction within 10", { exact: true }) });
  await expect(subtraction.getByText("locked", { exact: true })).toBeVisible();
  await expect(subtraction.getByRole("button", { name: "Introduce with objects" })).toBeVisible();
  await adultPage.close();
});

test("adult can introduce a locked concept with materials without recording mastery", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Learning-path mutation runs once in desktop Chromium");
  await page.goto("/adult/student-demo-ava/path");
  const subtraction = page.locator('[data-slot="card"]').filter({ has: page.getByText("Subtraction within 10", { exact: true }) });
  await subtraction.getByRole("textbox", { name: "Adult note" }).fill("The child already separates counters during play.");
  await subtraction.getByRole("button", { name: "Introduce with objects" }).click();
  await expect(subtraction.getByText("available", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(subtraction.getByText(/without marking prerequisites mastered/)).toBeVisible();
  const childPage = await page.context().newPage();
  await childPage.goto("/child/student-demo-ava");
  const introduced = childPage.getByRole("link", { name: /Picture subtraction within 10/ });
  await expect(introduced).toHaveCount(1);
  await introduced.click();
  await expect(childPage.getByText("Learn with real objects")).toBeVisible();
  await expect(childPage.getByRole("button", { name: "Next: try the picture page" })).toBeVisible();
  await childPage.close();
});

test("child routes never serialize answer contracts or hidden item answers", async ({ page, request }) => {
  const response = await request.get("/api/activities/activity-addition-01");
  expect(response.ok()).toBe(true);
  const activity = await response.json() as { answerSpecs?: unknown; items: Array<Record<string, unknown>> };
  expect(activity).not.toHaveProperty("answerSpecs");
  expect(activity.items[0]).not.toHaveProperty("result");
  await page.goto("/child/student-demo-ava/activity/activity-addition-01");
  const serialized = await page.locator("script").allTextContents();
  expect(serialized.join("\n")).not.toContain("answerSpecs");
  expect(serialized.join("\n")).not.toContain("\"result\":");
});

test("digital child work is stored, scored, and projected into progress", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Mutation flow runs once in desktop Chromium");
  const beforeResponse = await request.get("/api/students/student-demo-ava/timeline");
  const before = await beforeResponse.json() as { timeline: Array<{ kind: string }> };
  const beforeProgressEvents = before.timeline.filter((entry) => entry.kind === "progress_event").length;
  await page.goto("/child/student-demo-ava/activity/activity-addition-01");
  const responses = page.locator('input[name^="response-"]');
  await expect(responses).toHaveCount(10);
  for (let index = 0; index < await responses.count(); index += 1) await responses.nth(index).fill("0");
  await page.getByRole("button", { name: "Finish activity" }).click();
  await expect(page.getByRole("heading", { name: "You finished a practice moment." })).toBeVisible({ timeout: 20_000 });
  const afterResponse = await request.get("/api/students/student-demo-ava/timeline");
  const after = await afterResponse.json() as { timeline: Array<{ kind: string }> };
  expect(after.timeline.filter((entry) => entry.kind === "progress_event")).toHaveLength(beforeProgressEvents + 1);
});

test("photo work is normalized locally and enters the adult review queue", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Upload and review mutation runs once in desktop Chromium");
  await page.goto("/child/student-demo-ava/activity/activity-addition-01");
  await page.getByLabel("Choose photo").setInputFiles(resolve("tests/fixtures/worksheet-upload.png"));
  await page.getByRole("button", { name: "Save to work history" }).click();
  await expect(page.getByText("Photo saved for adult review. No automatic handwriting reading was used.")).toBeVisible({ timeout: 15_000 });
  const adultPage = await page.context().newPage();
  await adultPage.goto("/adult/student-demo-ava/reviews");
  const reviewedScore = adultPage.getByLabel(/Reviewed score for/).first();
  const adultEvidence = adultPage.getByLabel(/Adult evidence for/).first();
  await expect(reviewedScore).toBeVisible({ timeout: 15_000 });
  await reviewedScore.fill("80");
  await adultEvidence.fill("Adult checked eight of ten responses against the worksheet.");
  await adultPage.getByRole("button", { name: "Confirm reviewed score" }).first().click();
  await expect(adultPage.getByText("Nothing here yet. New evidence will appear after the next activity.")).toBeVisible({ timeout: 15_000 });
  await adultPage.close();
});

test("print worksheet is render-ready, answer-free, and produces a Letter PDF", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "PDF verification runs once in desktop Chromium");
  await page.goto("/print/activity/activity-addition-01");
  await expect(page.getByRole("button", { name: "Print worksheet" })).toBeVisible();
  await expect(page.locator('[data-render-ready="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Adult answer sheet" })).toHaveCount(0);
  const pdf = await page.pdf({ format: "Letter", printBackground: true });
  expect(pdf.byteLength).toBeGreaterThan(10_000);
});

test("adult answer route is separate from the child worksheet", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Answer-route verification runs once in desktop Chromium");
  await page.goto("/print/activity/activity-addition-01/answers");
  await expect(page.getByRole("heading", { name: "Adult answer sheet" })).toBeVisible();
});

test("adult worksheet archive shows prior responses and correct answers", async ({ page }) => {
  await page.goto("/adult/student-demo-ava/worksheets");
  await expect(page.getByRole("heading", { name: "Worksheet history" })).toBeVisible();
  const detailPage = await page.context().newPage();
  await detailPage.goto("/adult/student-demo-ava/worksheets/submission-demo-addition-1");
  await expect(detailPage.getByRole("heading", { name: "Picture addition within 10" })).toBeVisible();
  await expect(detailPage.getByRole("columnheader", { name: "Child's response" })).toBeVisible();
  await expect(detailPage.getByRole("columnheader", { name: "Correct answer or rubric" })).toBeVisible();
  await expect(detailPage.getByText("70%")).toBeVisible();
  await detailPage.close();
});

test("current report links learning-path evidence to worksheet answers", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Report mutation runs once in desktop Chromium");
  const response = await request.post("/api/reports", { data: { studentId: "student-demo-ava" } });
  expect(response.ok()).toBe(true);
  const body = await response.json() as { report: { id: string; worksheetSummaries: unknown[]; learningPath: unknown[] } };
  expect(body.report.worksheetSummaries.length).toBeGreaterThan(0);
  expect(body.report.learningPath.length).toBeGreaterThan(0);
  await page.goto(`/print/report/${encodeURIComponent(body.report.id)}`);
  await expect(page.getByRole("heading", { name: "Capability-based learning path" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent worksheets" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Responses and correct answers" }).first()).toBeVisible();
});

test("adult view exposes the evidence trail and print report link", async ({ page }) => {
  await page.goto("/adult/student-demo-ava");
  await expect(page.getByRole("heading", { name: /Ava Demo's worktable/ })).toBeVisible();
  await expect(page.getByText("Evidence trail")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open latest report" })).toBeVisible();
});
