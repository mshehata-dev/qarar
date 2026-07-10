import { describe, it, expect } from "vitest";
import { compile } from "../index.js";
import type { RuleNode } from "@qarar/spec";

function r(root: RuleNode) { return { root }; }

const age: RuleNode = { type: "gt", left: { type: "field", path: "age" }, right: { type: "number", value: 18 } };
const plan: RuleNode = { type: "eq", left: { type: "field", path: "plan" }, right: { type: "string", value: "premium" } };

describe("compile — basic comparisons", () => {
  it("eq string", () => {
    expect(compile(r(plan)).filter).toEqual({ plan: { $eq: "premium" } });
  });

  it("gt", () => {
    expect(compile(r(age)).filter).toEqual({ age: { $gt: 18 } });
  });

  it("gte", () => {
    const n: RuleNode = { type: "gte", left: { type: "field", path: "score" }, right: { type: "number", value: 100 } };
    expect(compile(r(n)).filter).toEqual({ score: { $gte: 100 } });
  });

  it("lt / lte", () => {
    const lt: RuleNode = { type: "lt", left: { type: "field", path: "n" }, right: { type: "number", value: 10 } };
    expect(compile(r(lt)).filter).toEqual({ n: { $lt: 10 } });
    const lte: RuleNode = { type: "lte", left: { type: "field", path: "n" }, right: { type: "number", value: 10 } };
    expect(compile(r(lte)).filter).toEqual({ n: { $lte: 10 } });
  });

  it("neq", () => {
    const n: RuleNode = { type: "neq", left: { type: "field", path: "status" }, right: { type: "string", value: "banned" } };
    expect(compile(r(n)).filter).toEqual({ status: { $ne: "banned" } });
  });

  it("eq null → field: null", () => {
    const n: RuleNode = { type: "eq", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    expect(compile(r(n)).filter).toEqual({ deleted_at: null });
  });

  it("neq null → $ne: null", () => {
    const n: RuleNode = { type: "neq", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    expect(compile(r(n)).filter).toEqual({ deleted_at: { $ne: null } });
  });
});

describe("compile — new operators", () => {
  it("in → $in", () => {
    const n: RuleNode = {
      type: "in",
      left: { type: "field", path: "plan" },
      right: { type: "array", values: [{ type: "string", value: "premium" }, { type: "string", value: "enterprise" }] },
    };
    expect(compile(r(n)).filter).toEqual({ plan: { $in: ["premium", "enterprise"] } });
  });

  it("notIn → $nin", () => {
    const n: RuleNode = {
      type: "notIn",
      left: { type: "field", path: "status" },
      right: { type: "array", values: [{ type: "string", value: "banned" }] },
    };
    expect(compile(r(n)).filter).toEqual({ status: { $nin: ["banned"] } });
  });

  it("contains → $regex with 'i'", () => {
    const n: RuleNode = { type: "contains", left: { type: "field", path: "email" }, right: { type: "string", value: "@company" } };
    expect(compile(r(n)).filter).toEqual({ email: { $regex: "@company", $options: "i" } });
  });

  it("notContains → $not $regex", () => {
    const n: RuleNode = { type: "notContains", left: { type: "field", path: "email" }, right: { type: "string", value: "spam" } };
    expect(compile(r(n)).filter).toEqual({ email: { $not: { $regex: "spam", $options: "i" } } });
  });

  it("startsWith → ^ regex", () => {
    const n: RuleNode = { type: "startsWith", left: { type: "field", path: "code" }, right: { type: "string", value: "EG-" } };
    expect(compile(r(n)).filter).toEqual({ code: { $regex: "^EG-", $options: "i" } });
  });

  it("endsWith → $ regex", () => {
    const n: RuleNode = { type: "endsWith", left: { type: "field", path: "domain" }, right: { type: "string", value: ".com" } };
    expect(compile(r(n)).filter).toEqual({ domain: { $regex: ".com$", $options: "i" } });
  });

  it("between → $gte + $lte", () => {
    const n: RuleNode = {
      type: "between",
      left: { type: "field", path: "age" },
      min: { type: "number", value: 18 },
      max: { type: "number", value: 65 },
    };
    expect(compile(r(n)).filter).toEqual({ age: { $gte: 18, $lte: 65 } });
  });

  it("isNull / isNotNull", () => {
    const isNull: RuleNode = { type: "isNull", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    const isNotNull: RuleNode = { type: "isNotNull", left: { type: "field", path: "deleted_at" }, right: { type: "null" } };
    expect(compile(r(isNull)).filter).toEqual({ deleted_at: null });
    expect(compile(r(isNotNull)).filter).toEqual({ deleted_at: { $ne: null } });
  });

  it("matches / notMatches", () => {
    const matches: RuleNode = { type: "matches", left: { type: "field", path: "email" }, right: { type: "string", value: "^[^@]+@company\\.com$" } };
    const notMatches: RuleNode = { type: "notMatches", left: { type: "field", path: "email" }, right: { type: "string", value: "spam" } };
    expect(compile(r(matches)).filter).toEqual({ email: { $regex: "^[^@]+@company\\.com$", $options: "i" } });
    expect(compile(r(notMatches)).filter).toEqual({ email: { $not: { $regex: "spam", $options: "i" } } });
  });
});

describe("compile — logical", () => {
  it("and → $and array", () => {
    const { filter } = compile(r({ type: "and", conditions: [age, plan] }));
    expect(filter).toEqual({
      $and: [{ age: { $gt: 18 } }, { plan: { $eq: "premium" } }],
    });
  });

  it("or → $or array", () => {
    const { filter } = compile(r({ type: "or", conditions: [age, plan] }));
    expect(filter).toEqual({
      $or: [{ age: { $gt: 18 } }, { plan: { $eq: "premium" } }],
    });
  });

  it("not → $nor", () => {
    const { filter } = compile(r({ type: "not", condition: age }));
    expect(filter).toEqual({ $nor: [{ age: { $gt: 18 } }] });
  });

  it("nested and inside or", () => {
    const inner = { type: "and" as const, conditions: [age, plan] };
    const outer = { type: "or" as const, conditions: [inner, age] };
    const { filter } = compile(r(outer));
    expect(filter).toEqual({
      $or: [
        { $and: [{ age: { $gt: 18 } }, { plan: { $eq: "premium" } }] },
        { age: { $gt: 18 } },
      ],
    });
  });
});
