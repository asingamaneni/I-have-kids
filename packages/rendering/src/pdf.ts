import type { Page } from "playwright";

export interface PdfRenderOptions {
  waitForSelector?: string;
  format?: "Letter" | "A4";
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  timeoutMs?: number;
  extraHTTPHeaders?: Record<string, string>;
}

export async function preparePrintPage(page: Page, readySelector = '[data-render-ready="true"]'): Promise<void> {
  await page.emulateMedia({ media: "print" });
  await page.waitForSelector(readySelector, { state: "visible" });
}

export async function renderUrlToPdf(url: string, outputPath: string, options: PdfRenderOptions = {}): Promise<void> {
  const { chromium } = await import(/* webpackIgnore: true */ "playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    if (options.extraHTTPHeaders) await page.setExtraHTTPHeaders(options.extraHTTPHeaders);
    await page.goto(url, { waitUntil: "networkidle", timeout: options.timeoutMs ?? 30_000 });
    await preparePrintPage(page, options.waitForSelector);
    const pdfOptions = { path: outputPath, format: options.format ?? "Letter", printBackground: true, preferCSSPageSize: true } as NonNullable<Parameters<Page["pdf"]>[0]>;
    if (options.margin) pdfOptions.margin = options.margin;
    await page.pdf(pdfOptions);
  } finally {
    await browser.close();
  }
}

export const renderPageToPdf = renderUrlToPdf;
export const createWorksheetPdf = renderUrlToPdf;
