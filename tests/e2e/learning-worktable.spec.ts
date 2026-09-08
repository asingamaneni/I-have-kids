import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

async function seedDemo(request: APIRequestContext) {
  const response = await request.post("/api/demo/seed");
  expect(response.ok()).toBe(true);
  return response.json() as Promise<{ studentId: string }>;
}

async function createLearner(request: APIRequestContext, input: Record<string, unknown> = {}) {
  const id = `student-e2e-${randomUUID()}`;
  const response = await request.post("/api/students", { data: { id, displayName: "E2E Learner", selectedSubjects: ["math"], currentCapabilities: ["math.adds-with-objects"], ...input } });
  expect(response.ok(), await response.text()).toBe(true);
  return id;
}


test("landing launches an isolated demo and supports same-learner view switching", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Learning that grows with them." })).toBeVisible();
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(page).toHaveURL(/\/demo\/child\/student-demo-ava$/);
  await expect(page.getByRole("heading", { name: /Hi, Ava/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Demo data/).first()).toBeVisible();
  await page.getByRole("link", { name: "Switch to adult view" }).click();
  await expect(page).toHaveURL(/\/demo\/adult\/student-demo-ava$/);
  await expect(page.getByRole("heading", { name: /Ava Demo's worktable/ })).toBeVisible();
  await page.getByRole("link", { name: "Switch to child view" }).click();
  await expect(page).toHaveURL(/\/demo\/child\/student-demo-ava$/);
});

test("demo and household learner stores remain separate", async ({ request }) => {
  await seedDemo(request);
  const householdId = await createLearner(request, { currentCapabilities: [] });
  const demoStatus = await (await request.get("/api/demo/status")).json() as { dataScope: string; studentId: string };
  expect(demoStatus).toMatchObject({ dataScope: "demo", studentId: "student-demo-ava" });
  const householdTimeline = await request.get(`/api/students/${householdId}/timeline`);
  expect(householdTimeline.ok()).toBe(true);
  const demoInHousehold = await request.get("/api/students/student-demo-ava/timeline");
  expect(demoInHousehold.status()).toBe(404);
});

test("profile-only setup creates no worksheet until intake is explicit", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Profile mutation runs once in desktop Chromium");
  await page.goto("/setup");
  await page.getByLabel("Child's display name").fill("Waiting Learner");
  await page.getByRole("button", { name: "Create learner" }).click();
  await expect(page.getByRole("heading", { name: /Hi, Waiting/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "No work has been assigned yet" })).toBeVisible();
  await expect(page.getByText("What needs attention")).toHaveCount(0);
});

test("advanced parent-reported ability becomes the diagnostic focus", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Profile mutation runs once in desktop Chromium");
  await page.goto("/setup");
  await page.getByLabel("Child's display name").fill("Advanced Learner");
  await page.getByLabel("Linear equations").check();
  await page.getByRole("button", { name: "Create learner" }).click();
  await expect(page.getByRole("heading", { name: /Hi, Advanced/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Starting check: Linear equations").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Linear equations/ })).toBeVisible();
  await expect(page.getByText("You are here").first()).toBeVisible();
  await expect(page.getByText("Counting to 10").first()).not.toBeVisible();
});

test("child current work shows lifecycle, best next work, history, and exact retry", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Submission flow runs once in desktop Chromium");
  const id = await createLearner(request, { currentCapabilities: ["math.adds-with-objects"] });
  await page.goto(`/child/${id}`);
  await expect(page.getByText("Best next step")).toBeVisible();
  const start = page.getByRole("link", { name: /Start: Starting check/ }).first();
  await expect(start).toBeVisible();
  await start.click();
  await expect(page).toHaveURL(/\/activity\//);
  const activityUrl = page.url();
  const responses = page.locator('input[name^="response-"]');
  await expect(responses).toHaveCount(20);
  for (let index = 0; index < await responses.count(); index += 1) await responses.nth(index).fill("0");
  const saved = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/submissions"));
  await page.getByRole("button", { name: "Finish activity" }).click();
  const saveResponse = await saved;
  expect(saveResponse.ok(), await saveResponse.text()).toBe(true);
  await expect(page.getByRole("heading", { name: "You finished this practice." })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "My history" }).click();
  await expect(page.getByRole("heading", { name: "My history" })).toBeVisible();
  await expect(page.getByText("1 attempt")).toBeVisible();
  const retry = page.getByRole("link", { name: "Try this same worksheet again" });
  await expect(retry).toHaveAttribute("href", /retryOf=/);
  await retry.click();
  await expect(page).toHaveURL(/retryOf=/);
  expect(new URL(page.url()).pathname).toBe(new URL(activityUrl).pathname);
});

test("photo work appears as waiting for validation", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Upload flow runs once in desktop Chromium");
  const id = await createLearner(request, { currentCapabilities: ["math.adds-with-objects"] });
  await page.goto(`/child/${id}`);
  await page.getByRole("link", { name: /Start: Starting check/ }).first().click();
  await page.getByLabel("Choose photo").setInputFiles(resolve("tests/fixtures/worksheet-upload.png"));
  await page.getByRole("button", { name: "Save to work history" }).click();
  await expect(page.getByText(/Photo saved for adult review/)).toBeVisible({ timeout: 15_000 });
  await page.goto(`/child/${id}`);
  await expect(page.getByText("Waiting for a check")).toBeVisible();
});

test("worksheet how-to is child-safe and printable", async ({ page, request }, testInfo) => {
  const id = await createLearner(request, { currentCapabilities: ["math.adds-with-symbols"] });
  await page.goto(`/child/${id}`);
  await page.getByRole("link", { name: /Start: Starting check/ }).first().click();
  await page.getByRole("link", { name: "How to learn this" }).click();
  await expect(page.getByRole("heading", { name: /How .* works|How to/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print this guide" })).toBeVisible();
  const serialized = (await page.locator("script").allTextContents()).join("\n");
  expect(serialized).not.toContain("answerSpecs");
  if (testInfo.project.name === "chromium") expect((await page.pdf({ format: "Letter", printBackground: true })).byteLength).toBeGreaterThan(8_000);
});

test("child map defaults to five next steps and can reveal the whole path", async ({ page }) => {
  await seedDemo(page.request);
  await page.goto("/demo/child/student-demo-ava/roadmap");
  await expect(page.getByText("Your current place and the next five steps.")).toBeVisible();
  await expect(page.getByText("You are here").first()).toBeVisible();
  await page.getByRole("button", { name: "See the whole path" }).click();
  await expect(page.getByText("The whole subject path with your place marked.")).toBeVisible();
});

test("adult sees the complete top-to-bottom subject map and graph actions", async ({ page, request }) => {
  const id = await createLearner(request, { currentCapabilities: ["math.adds-with-objects"] });
  await page.goto(`/adult/${id}/path`);
  await expect(page.getByRole("heading", { name: "Learning roadmap" })).toBeVisible();
  await expect(page.getByText("Complete subject roadmap")).toBeVisible();
  await page.getByRole("button", { name: /Addition within 10/ }).first().click();
  await expect(page.getByText(/Actions for Addition within 10/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add extra practice" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Propose a new next step" })).toBeVisible();
});

test("adult review form uses subject-aware concept selection", async ({ page, request }) => {
  const id = await createLearner(request, { currentCapabilities: ["math.adds-with-objects"] });
  await page.goto(`/adult/${id}/reviews`);
  await expect(page.getByRole("combobox", { name: "Subject" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Concept" })).toBeVisible();
});

test("adult reports show newest first and support monthly and quarterly snapshots", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Report mutation runs once in desktop Chromium");
  const id = await createLearner(request, { currentCapabilities: ["math.adds-with-objects"] });
  const date = new Date().toISOString().slice(0, 10);
  for (const kind of ["monthly", "quarterly"] as const) {
    const response = await request.post("/api/reports", { data: { studentId: id, kind, selectedDate: date, timeZone: "UTC" } });
    expect(response.ok(), await response.text()).toBe(true);
  }
  await page.goto(`/adult/${id}/reports`);
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByText("Needs attention").first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Report type" })).toBeVisible();
  await expect(page.getByLabel("Report date")).toBeVisible();
});

test("persistent view switch remains visible and tappable on mobile", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only navigation check");
  const id = await createLearner(request, { currentCapabilities: [] });
  await page.goto(`/child/${id}`);
  const switcher = page.getByRole("link", { name: "Switch to adult view" });
  await expect(switcher).toBeInViewport();
  await switcher.click();
  await expect(page).toHaveURL(new RegExp(`/adult/${id}$`));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
