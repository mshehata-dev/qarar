import { describe, it, expect } from "vitest";
import { validateRule, safeValidateRule } from "../index.js";

const VALID_RULE = {
  id: "test",
  name: "Test Rule",
  version: "1",
  root: {
    type: "gt",
    left: { type: "field", path: "age" },
    right: { type: "number", value: 18 },
  },
};

describe("validateRule", () => {
  it("accepts a valid comparison rule", () => {
    const rule = validateRule(VALID_RULE);
    expect(rule.id).toBe("test");
  });

  it("accepts AND group", () => {
    const rule = validateRule({
      ...VALID_RULE,
      root: {
        type: "and",
        conditions: [VALID_RULE.root, VALID_RULE.root],
      },
    });
    expect(rule.root.type).toBe("and");
  });

  it("accepts OR group", () => {
    const rule = validateRule({
      ...VALID_RULE,
      root: { type: "or", conditions: [VALID_RULE.root] },
    });
    expect(rule.root.type).toBe("or");
  });

  it("accepts NOT node", () => {
    const rule = validateRule({
      ...VALID_RULE,
      root: { type: "not", condition: VALID_RULE.root },
    });
    expect(rule.root.type).toBe("not");
  });

  it("accepts deeply nested rule", () => {
    const rule = validateRule({
      ...VALID_RULE,
      root: {
        type: "and",
        conditions: [
          VALID_RULE.root,
          {
            type: "or",
            conditions: [
              { type: "eq", left: { type: "field", path: "plan" }, right: { type: "string", value: "premium" } },
              { type: "not", condition: VALID_RULE.root },
            ],
          },
        ],
      },
    });
    expect(rule.root.type).toBe("and");
  });

  it("accepts null value", () => {
    const rule = validateRule({
      ...VALID_RULE,
      root: { type: "eq", left: { type: "field", path: "x" }, right: { type: "null" } },
    });
    expect(rule.root.type).toBe("eq");
  });

  it("accepts isNull and matches operators", () => {
    const isNullRule = validateRule({
      ...VALID_RULE,
      root: { type: "isNull", left: { type: "field", path: "deleted_at" }, right: { type: "null" } },
    });
    const matchesRule = validateRule({
      ...VALID_RULE,
      root: { type: "matches", left: { type: "field", path: "email" }, right: { type: "string", value: "@company\\.com$" } },
    });
    expect(isNullRule.root.type).toBe("isNull");
    expect(matchesRule.root.type).toBe("matches");
  });

  it("rejects missing id", () => {
    const result = safeValidateRule({ ...VALID_RULE, id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown operator", () => {
    const result = safeValidateRule({
      ...VALID_RULE,
      root: { type: "unknown_op", left: { type: "field", path: "x" }, right: { type: "number", value: 1 } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty conditions array", () => {
    const result = safeValidateRule({
      ...VALID_RULE,
      root: { type: "and", conditions: [] },
    });
    expect(result.success).toBe(false);
  });
});
