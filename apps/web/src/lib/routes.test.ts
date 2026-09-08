import { describe, expect, it } from "vitest";
import { adultHomeRoute, childHomeRoute, childHowToRoute, sanitizeAdultReturnPath } from "./routes.js";

describe("learner routes", () => {
  it("encodes learner and activity identifiers", () => {
    expect(childHomeRoute("learner/a")).toBe("/child/learner%2Fa");
    expect(adultHomeRoute("learner/a")).toBe("/adult/learner%2Fa");
    expect(childHowToRoute("learner/a", "activity/1")).toBe("/child/learner%2Fa/activity/activity%2F1/how-to");
  });

  it("keeps demo routes in the demo family", () => {
    expect(childHomeRoute("demo", "demo")).toBe("/demo/child/demo");
    expect(adultHomeRoute("demo", "demo")).toBe("/demo/adult/demo");
  });

  it("allows only protected local return paths", () => {
    for (const path of ["/adult/s1", "/adult/s1/path?subject=math", "/demo/adult/s1", "/print/activity/a1", "/setup"]) expect(sanitizeAdultReturnPath(path)).toBe(path);
    for (const path of [undefined, "", "https://example.com/adult/s1", "//example.com/adult/s1", "/child/s1", "/api/reports", "/adult\\evil"]) expect(sanitizeAdultReturnPath(path)).toBe("/");
  });
});
