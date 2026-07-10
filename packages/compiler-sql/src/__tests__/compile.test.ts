import { describe, it, expect } from "vitest";
import { compile } from "../index.js";
import type { RuleNode } from "@qarar/spec";

function r(root: RuleNode) {
  return { root };
}

const age: RuleNode = { type: "gt", left: { type: "field", path: "customer.age" }, right: { type: "number", value: 18 } };
const plan: RuleNode = { type: "eq", left: { type: "field", path: "customer.plan" }, right: { type: "string", value: "premium" } };

describe("compile — basic comparisons", () => {
  it("gt", () => {
    expect(compile(r(age)).sql).toBe("customer_age > 18");
  });

  it("eq string — single-quoted", () => {
    expect(compile(r(plan)).sql).toBe("customer_plan = 'premium'");
  });

  it("neq", () => {
    const n: RuleNode = { type: "neq", left: { type: "field", path: "status" }, right: { type: "string", value: "banned" } };
    expect(compile(r(n)).sql).toBe("status <> 'banned'");
  });

  it("gte / lte", () => {
    const gte: RuleNode = { type: "gte", left: { type: "field", path: "score" }, right: { type: "number", value: 100 } };
    expect(compile(r(gte)).sql).toBe("score >= 100");
    const lte: RuleNode = { type: "lte", left: { type: "field", path: "score" }, right: { type: "number", value: 100 } };
    expect(compile(r(lte)).sql).toBe("score <= 100");
  });

  it("boolean", () => {
    const n: RuleNode = { type: "eq", left: { type: "field", path: "verified" }, right: { type: "boolean", value: true } };
    expect(compile(r(n)).sql).toBe("verified = TRUE");
  });

  it("null → IS NULL", () => {
    const n: RuleNode = { type: "eq", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    expect(compile(r(n)).sql).toBe("deleted_at IS NULL");
  });

  it("neq null → IS NOT NULL", () => {
    const n: RuleNode = { type: "neq", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    expect(compile(r(n)).sql).toBe("deleted_at IS NOT NULL");
  });

  it("escapes single quotes in string values", () => {
    const n: RuleNode = { type: "eq", left: { type: "field", path: "name" }, right: { type: "string", value: "O'Brien" } };
    expect(compile(r(n)).sql).toBe("name = 'O''Brien'");
  });
});

describe("compile — new operators", () => {
  it("in", () => {
    const n: RuleNode = {
      type: "in",
      left: { type: "field", path: "plan" },
      right: { type: "array", values: [{ type: "string", value: "premium" }, { type: "string", value: "enterprise" }] },
    };
    expect(compile(r(n)).sql).toBe("plan IN ('premium', 'enterprise')");
  });

  it("notIn", () => {
    const n: RuleNode = {
      type: "notIn",
      left: { type: "field", path: "status" },
      right: { type: "array", values: [{ type: "string", value: "banned" }, { type: "string", value: "suspended" }] },
    };
    expect(compile(r(n)).sql).toBe("status NOT IN ('banned', 'suspended')");
  });

  it("contains → LIKE %value%", () => {
    const n: RuleNode = { type: "contains", left: { type: "field", path: "email" }, right: { type: "string", value: "@company" } };
    expect(compile(r(n)).sql).toBe("email LIKE '%@company%'");
  });

  it("notContains → NOT LIKE %value%", () => {
    const n: RuleNode = { type: "notContains", left: { type: "field", path: "email" }, right: { type: "string", value: "spam" } };
    expect(compile(r(n)).sql).toBe("email NOT LIKE '%spam%'");
  });

  it("startsWith → LIKE value%", () => {
    const n: RuleNode = { type: "startsWith", left: { type: "field", path: "code" }, right: { type: "string", value: "EG-" } };
    expect(compile(r(n)).sql).toBe("code LIKE 'EG-%'");
  });

  it("endsWith → LIKE %value", () => {
    const n: RuleNode = { type: "endsWith", left: { type: "field", path: "domain" }, right: { type: "string", value: ".com" } };
    expect(compile(r(n)).sql).toBe("domain LIKE '%.com'");
  });

  it("between → BETWEEN min AND max", () => {
    const n: RuleNode = {
      type: "between",
      left: { type: "field", path: "age" },
      min: { type: "number", value: 18 },
      max: { type: "number", value: 65 },
    };
    expect(compile(r(n)).sql).toBe("age BETWEEN 18 AND 65");
  });

  it("isNull / isNotNull", () => {
    const isNull: RuleNode = { type: "isNull", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    const isNotNull: RuleNode = { type: "isNotNull", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    expect(compile(r(isNull)).sql).toBe("deleted_at IS NULL");
    expect(compile(r(isNotNull)).sql).toBe("deleted_at IS NOT NULL");
  });

  it("matches / notMatches", () => {
    const matches: RuleNode = { type: "matches", left: { type: "field", path: "email" }, right: { type: "string", value: "^[^@]+@company\\.com$" } };
    const notMatches: RuleNode = { type: "notMatches", left: { type: "field", path: "email" }, right: { type: "string", value: "spam" } };
    expect(compile(r(matches)).sql).toBe("email REGEXP '^[^@]+@company\\.com$'");
    expect(compile(r(notMatches)).sql).toBe("email NOT REGEXP 'spam'");
  });
});

describe("compile — logical", () => {
  it("and joins with AND", () => {
    const { sql } = compile(r({ type: "and", conditions: [age, plan] }));
    expect(sql).toBe("customer_age > 18 AND customer_plan = 'premium'");
  });

  it("or joins with OR", () => {
    const { sql } = compile(r({ type: "or", conditions: [age, plan] }));
    expect(sql).toBe("customer_age > 18 OR customer_plan = 'premium'");
  });

  it("not wraps with NOT", () => {
    const { sql } = compile(r({ type: "not", condition: age }));
    expect(sql).toBe("NOT (customer_age > 18)");
  });

  it("nested: and inside or is parenthesised", () => {
    const inner = { type: "and" as const, conditions: [age, plan] };
    const outer = { type: "or" as const, conditions: [inner, age] };
    const { sql } = compile(r(outer));
    expect(sql).toBe("(customer_age > 18 AND customer_plan = 'premium') OR customer_age > 18");
  });
});

describe("compile — columnStyle options", () => {
  it("path: keeps dots", () => {
    expect(compile(r(age), { columnStyle: "path" }).sql).toBe("customer.age > 18");
  });

  it("snake: replaces dots with underscores", () => {
    expect(compile(r(age), { columnStyle: "snake" }).sql).toBe("customer_age > 18");
  });

  it("quote: double-quotes each segment", () => {
    expect(compile(r(age), { columnStyle: "quote" }).sql).toBe('"customer"."age" > 18');
  });
});
