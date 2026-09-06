import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy.js";

const originalPin = process.env.LEARNING_ADULT_PIN;
afterEach(() => {
  if (originalPin === undefined) delete process.env.LEARNING_ADULT_PIN;
  else process.env.LEARNING_ADULT_PIN = originalPin;
});

function token(pin: string): string {
  return createHash("sha256").update(`learning-worktable:${pin}`).digest("hex");
}

describe("optional adult PIN proxy", () => {
  it("leaves the zero-configuration local demo open", async () => {
    delete process.env.LEARNING_ADULT_PIN;
    const response = await proxy(new NextRequest("http://localhost/adult/student-demo-ava"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects an unauthenticated adult request to the unlock page", async () => {
    process.env.LEARNING_ADULT_PIN = "2468";
    const response = await proxy(new NextRequest("http://localhost/adult/student-demo-ava/progress"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.headers.get("location")).toContain("/adult/unlock");
    expect(response.headers.get("location")).toContain(encodeURIComponent("/adult/student-demo-ava/progress"));
  });

  it("allows the matching local access cookie", async () => {
    process.env.LEARNING_ADULT_PIN = "2468";
    const request = new NextRequest("http://localhost/adult/student-demo-ava", { headers: { cookie: `learning-adult-access=${token("2468")}` } });
    const response = await proxy(request);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
