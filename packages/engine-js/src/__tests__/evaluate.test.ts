import { describe, it, expect } from "vitest";
import { evaluate } from "../index.js";
import type { RuleNode } from "@qarar/spec";

function rule(root: RuleNode) {
  return { root };
}

describe("evaluate — comparisons", () => {
  it("eq: passes when equal", () => {
    const r = evaluate(rule({ type: "eq", left: { type: "field", path: "x" }, right: { type: "number", value: 5 } }), { x: 5 });
    expect(r.result).toBe(true);
  });

  it("eq: fails when not equal", () => {
    const r = evaluate(rule({ type: "eq", left: { type: "field", path: "x" }, right: { type: "number", value: 5 } }), { x: 6 });
    expect(r.result).toBe(false);
  });

  it("neq: passes when different", () => {
    const r = evaluate(rule({ type: "neq", left: { type: "field", path: "x" }, right: { type: "string", value: "a" } }), { x: "b" });
    expect(r.result).toBe(true);
  });

  it("gt: passes when greater", () => {
    const r = evaluate(rule({ type: "gt", left: { type: "field", path: "age" }, right: { type: "number", value: 18 } }), { age: 25 });
    expect(r.result).toBe(true);
  });

  it("gt: fails when equal", () => {
    const r = evaluate(rule({ type: "gt", left: { type: "field", path: "age" }, right: { type: "number", value: 18 } }), { age: 18 });
    expect(r.result).toBe(false);
  });

  it("gte: passes when equal", () => {
    const r = evaluate(rule({ type: "gte", left: { type: "field", path: "age" }, right: { type: "number", value: 18 } }), { age: 18 });
    expect(r.result).toBe(true);
  });

  it("lt / lte", () => {
    const lt = evaluate(rule({ type: "lt", left: { type: "field", path: "n" }, right: { type: "number", value: 10 } }), { n: 5 });
    expect(lt.result).toBe(true);
    const lte = evaluate(rule({ type: "lte", left: { type: "field", path: "n" }, right: { type: "number", value: 10 } }), { n: 10 });
    expect(lte.result).toBe(true);
  });
});

describe("evaluate — new operators", () => {
  it("in: passes when value is in array", () => {
    const n: RuleNode = {
      type: "in",
      left: { type: "field", path: "plan" },
      right: { type: "array", values: [{ type: "string", value: "premium" }, { type: "string", value: "enterprise" }] },
    };
    expect(evaluate(rule(n), { plan: "premium" }).result).toBe(true);
    expect(evaluate(rule(n), { plan: "free" }).result).toBe(false);
  });

  it("notIn: passes when value is not in array", () => {
    const n: RuleNode = {
      type: "notIn",
      left: { type: "field", path: "status" },
      right: { type: "array", values: [{ type: "string", value: "banned" }, { type: "string", value: "suspended" }] },
    };
    expect(evaluate(rule(n), { status: "active" }).result).toBe(true);
    expect(evaluate(rule(n), { status: "banned" }).result).toBe(false);
  });

  it("contains: case-insensitive substring match", () => {
    const n: RuleNode = { type: "contains", left: { type: "field", path: "email" }, right: { type: "string", value: "@company" } };
    expect(evaluate(rule(n), { email: "user@Company.com" }).result).toBe(true);
    expect(evaluate(rule(n), { email: "user@other.com" }).result).toBe(false);
  });

  it("notContains: passes when substring absent", () => {
    const n: RuleNode = { type: "notContains", left: { type: "field", path: "email" }, right: { type: "string", value: "spam" } };
    expect(evaluate(rule(n), { email: "user@clean.com" }).result).toBe(true);
    expect(evaluate(rule(n), { email: "user@spam.com" }).result).toBe(false);
  });

  it("startsWith", () => {
    const n: RuleNode = { type: "startsWith", left: { type: "field", path: "code" }, right: { type: "string", value: "EG-" } };
    expect(evaluate(rule(n), { code: "EG-001" }).result).toBe(true);
    expect(evaluate(rule(n), { code: "US-001" }).result).toBe(false);
  });

  it("endsWith", () => {
    const n: RuleNode = { type: "endsWith", left: { type: "field", path: "domain" }, right: { type: "string", value: ".com" } };
    expect(evaluate(rule(n), { domain: "example.com" }).result).toBe(true);
    expect(evaluate(rule(n), { domain: "example.org" }).result).toBe(false);
  });

  it("between: passes when value in range (inclusive)", () => {
    const n: RuleNode = {
      type: "between",
      left: { type: "field", path: "age" },
      min: { type: "number", value: 18 },
      max: { type: "number", value: 65 },
    };
    expect(evaluate(rule(n), { age: 18 }).result).toBe(true);
    expect(evaluate(rule(n), { age: 40 }).result).toBe(true);
    expect(evaluate(rule(n), { age: 65 }).result).toBe(true);
    expect(evaluate(rule(n), { age: 17 }).result).toBe(false);
    expect(evaluate(rule(n), { age: 66 }).result).toBe(false);
  });

  it("between: trace includes min, max, actual", () => {
    const n: RuleNode = {
      type: "between",
      left: { type: "field", path: "age" },
      min: { type: "number", value: 18 },
      max: { type: "number", value: 65 },
    };
    const r = evaluate(rule(n), { age: 10 });
    expect(r.trace.type).toBe("between");
    if (r.trace.type === "between") {
      expect(r.trace.actual).toBe(10);
      expect(r.trace.min).toBe(18);
      expect(r.trace.max).toBe(65);
      expect(r.trace.passed).toBe(false);
    }
  });

  it("isNull / isNotNull", () => {
    const isNull: RuleNode = { type: "isNull", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    const isNotNull: RuleNode = { type: "isNotNull", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    expect(evaluate(rule(isNull), { deleted_at: null }).result).toBe(true);
    expect(evaluate(rule(isNull), { deleted_at: "2024-01-01" }).result).toBe(false);
    expect(evaluate(rule(isNotNull), { deleted_at: "2024-01-01" }).result).toBe(true);
    expect(evaluate(rule(isNotNull), { deleted_at: null }).result).toBe(false);
  });

  it("matches / notMatches", () => {
    const matches: RuleNode = {
      type: "matches",
      left: { type: "field", path: "email" },
      right: { type: "string", value: "^[^@]+@company\\.com$" },
    };
    const notMatches: RuleNode = {
      type: "notMatches",
      left: { type: "field", path: "email" },
      right: { type: "string", value: "spam" },
    };
    expect(evaluate(rule(matches), { email: "user@company.com" }).result).toBe(true);
    expect(evaluate(rule(matches), { email: "user@other.com" }).result).toBe(false);
    expect(evaluate(rule(notMatches), { email: "user@clean.com" }).result).toBe(true);
    expect(evaluate(rule(notMatches), { email: "user+spam@clean.com" }).result).toBe(false);
  });

  it("throws on invalid regex pattern for matches", () => {
    const invalid: RuleNode = {
      type: "matches",
      left: { type: "field", path: "email" },
      right: { type: "string", value: "[" },
    };
    expect(() => evaluate(rule(invalid), { email: "user@company.com" })).toThrow(/Invalid regular expression/);
  });
});

describe("evaluate — logical", () => {
  const ageGt18: RuleNode = { type: "gt", left: { type: "field", path: "age" }, right: { type: "number", value: 18 } };
  const planPremium: RuleNode = { type: "eq", left: { type: "field", path: "plan" }, right: { type: "string", value: "premium" } };

  it("and: passes when all pass", () => {
    const r = evaluate(rule({ type: "and", conditions: [ageGt18, planPremium] }), { age: 25, plan: "premium" });
    expect(r.result).toBe(true);
  });

  it("and: fails when any fails", () => {
    const r = evaluate(rule({ type: "and", conditions: [ageGt18, planPremium] }), { age: 16, plan: "premium" });
    expect(r.result).toBe(false);
  });

  it("or: passes when at least one passes", () => {
    const r = evaluate(rule({ type: "or", conditions: [ageGt18, planPremium] }), { age: 16, plan: "premium" });
    expect(r.result).toBe(true);
  });

  it("or: fails when all fail", () => {
    const r = evaluate(rule({ type: "or", conditions: [ageGt18, planPremium] }), { age: 16, plan: "free" });
    expect(r.result).toBe(false);
  });

  it("not: inverts result", () => {
    const r = evaluate(rule({ type: "not", condition: ageGt18 }), { age: 25 });
    expect(r.result).toBe(false);
    const r2 = evaluate(rule({ type: "not", condition: ageGt18 }), { age: 10 });
    expect(r2.result).toBe(true);
  });
});

describe("evaluate — trace", () => {
  it("trace includes field, actual, expected, passed", () => {
    const r = evaluate(
      rule({ type: "gt", left: { type: "field", path: "age" }, right: { type: "number", value: 18 } }),
      { age: 16 }
    );
    expect(r.trace.type).toBe("comparison");
    if (r.trace.type === "comparison") {
      expect(r.trace.field).toBe("age");
      expect(r.trace.actual).toBe(16);
      expect(r.trace.expected).toBe(18);
      expect(r.trace.passed).toBe(false);
    }
  });

  it("trace has children for logical node", () => {
    const ageGt18: RuleNode = { type: "gt", left: { type: "field", path: "age" }, right: { type: "number", value: 18 } };
    const r = evaluate(rule({ type: "and", conditions: [ageGt18, ageGt18] }), { age: 25 });
    expect(r.trace.type).toBe("logical");
    if (r.trace.type === "logical") {
      expect(r.trace.children).toHaveLength(2);
    }
  });
});

describe("evaluate — dot-notation field resolution", () => {
  it("resolves nested paths", () => {
    const r = evaluate(
      rule({ type: "eq", left: { type: "field", path: "customer.plan" }, right: { type: "string", value: "premium" } }),
      { customer: { plan: "premium" } }
    );
    expect(r.result).toBe(true);
  });

  it("returns undefined for missing path (fails comparison)", () => {
    const r = evaluate(
      rule({ type: "eq", left: { type: "field", path: "customer.missing" }, right: { type: "string", value: "x" } }),
      { customer: {} }
    );
    expect(r.result).toBe(false);
  });
});
