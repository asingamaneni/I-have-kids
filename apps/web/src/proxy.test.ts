import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy.js";

const originalPin = process.env.LEARNING_ADULT_PIN;
afterEach(() => {
  if (originalPin === undefined) delete process.env.LEARNING_ADULT_PIN;
  else process.env.LEARNING_ADULT_PIN = originalPin;
});

function token(pin: string): string {
  return createHash("sha256").update(`learning-worktable:${pin}`).digest("hex");
}

describe("optional adult PIN proxy", () => {
  it("leaves adult routes open when no PIN is configured", async () => {
    delete process.env.LEARNING_ADULT_PIN;
    const response = await proxy(new NextRequest("http://localhost/adult/student-ava"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("protects adult routes without blocking child-safe counterparts", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/adult/student-1/path" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "/child/student-1/roadmap" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/api/adult/students/student-ava/roadmap" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "/api/students/student-ava/roadmap" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/api/activities/activity-addition-01" })).toBe(false);
  });

  it("redirects an unauthenticated adult page request to the unlock page", async () => {
    process.env.LEARNING_ADULT_PIN = "2468";
    const response = await proxy(new NextRequest("http://localhost/adult/student-ava/progress"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.headers.get("location")).toContain("/adult/unlock");
    expect(response.headers.get("location")).toContain(encodeURIComponent("/adult/student-ava/progress"));
  });

  it("preserves a safe setup return path", async () => {
    process.env.LEARNING_ADULT_PIN = "2468";
    const response = await proxy(new NextRequest("http://localhost/setup?from=home"));
    expect(response.headers.get("location")).toContain(encodeURIComponent("/setup?from=home"));
  });

  it("returns JSON authorization errors for protected APIs instead of redirecting mutations", async () => {
    process.env.LEARNING_ADULT_PIN = "2468";
    const response = await proxy(new NextRequest("http://localhost/api/curriculum/proposals/proposal-1/decision", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({ error: "Adult PIN required.", unlockUrl: "/adult/unlock" });
  });

  it("allows protected APIs with the matching local access cookie", async () => {
    process.env.LEARNING_ADULT_PIN = "2468";
    const request = new NextRequest("http://localhost/api/adult/students/student-ava/roadmap", { headers: { cookie: `learning-adult-access=${token("2468")}` } });
    const response = await proxy(request);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
