import { describe, it, expect } from "vitest";
import { safeValidateRule, evaluate, explainFailures } from "../index.js";

describe("@qarar/sdk", () => {
  it("provides single-package flow (validate -> evaluate -> explain)", () => {
    const rule = {
      id: "single-sdk-smoke",
      name: "Single SDK Smoke",
      version: "1",
      root: {
        type: "and",
        conditions: [
          { type: "gte", left: { type: "field", path: "customer.age" }, right: { type: "number", value: 18 } },
          { type: "in", left: { type: "field", path: "customer.plan" }, right: { type: "array", values: [{ type: "string", value: "premium" }, { type: "string", value: "enterprise" }] } },
        ],
      },
    };
    const input = { customer: { age: 27, plan: "premium" } };
    const parsed = safeValidateRule(rule);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const evalResult = evaluate(parsed.data, input);
    expect(evalResult.result).toBe(true);
    expect(Array.isArray(explainFailures(evalResult.trace))).toBe(true);
  });
});
