import { describe, it, expect } from "vitest";
import {
  rule,
  where,
  field,
  and,
  or,
  not,
  toValueNode,
  evaluate,
  validateRule,
} from "../index.js";

describe("Fluent Rule Builder", () => {
  describe("toValueNode", () => {
    it("coerces primitives correctly", () => {
      expect(toValueNode("hello")).toEqual({ type: "string", value: "hello" });
      expect(toValueNode(42)).toEqual({ type: "number", value: 42 });
      expect(toValueNode(true)).toEqual({ type: "boolean", value: true });
      expect(toValueNode(null)).toEqual({ type: "null" });
    });

    it("coerces arrays of primitives correctly", () => {
      expect(toValueNode(["a", "b"])).toEqual({
        type: "array",
        values: [
          { type: "string", value: "a" },
          { type: "string", value: "b" },
        ],
      });
    });

    it("preserves field nodes and pre-built value nodes", () => {
      const fNode = field("customer.age");
      expect(toValueNode(fNode)).toEqual({ type: "field", path: "customer.age" });

      const stringNode = { type: "string" as const, value: "test" };
      expect(toValueNode(stringNode)).toEqual(stringNode);
    });
  });

  describe("Standalone Conditions & Operators", () => {
    it("builds comparison operators", () => {
      expect(where("age").gt(18).buildNode()).toEqual({
        type: "gt",
        left: { type: "field", path: "age" },
        right: { type: "number", value: 18 },
      });

      expect(where("status").eq("active").buildNode()).toEqual({
        type: "eq",
        left: { type: "field", path: "status" },
        right: { type: "string", value: "active" },
      });

      expect(where("roles").in(["admin", "editor"]).buildNode()).toEqual({
        type: "in",
        left: { type: "field", path: "roles" },
        right: {
          type: "array",
          values: [
            { type: "string", value: "admin" },
            { type: "string", value: "editor" },
          ],
        },
      });

      expect(where("score").between(50, 100).buildNode()).toEqual({
        type: "between",
        left: { type: "field", path: "score" },
        min: { type: "number", value: 50 },
        max: { type: "number", value: 100 },
      });

      expect(where("deletedAt").isNull().buildNode()).toEqual({
        type: "isNull",
        left: { type: "field", path: "deletedAt" },
        right: { type: "null" },
      });
    });

    it("builds string operators", () => {
      expect(where("email").endsWith("@company.com").buildNode()).toEqual({
        type: "endsWith",
        left: { type: "field", path: "email" },
        right: { type: "string", value: "@company.com" },
      });

      expect(where("code").matches("^[A-Z]{3}$").buildNode()).toEqual({
        type: "matches",
        left: { type: "field", path: "code" },
        right: { type: "string", value: "^[A-Z]{3}$" },
      });
    });
  });

  describe("Logical Tree Composition", () => {
    it("combines conditions with and/or/not helpers", () => {
      const tree = and(
        where("age").gte(18),
        where("country").eq("EG"),
        not(where("blacklisted").eq(true))
      ).buildNode();

      expect(tree).toEqual({
        type: "and",
        conditions: [
          {
            type: "gte",
            left: { type: "field", path: "age" },
            right: { type: "number", value: 18 },
          },
          {
            type: "eq",
            left: { type: "field", path: "country" },
            right: { type: "string", value: "EG" },
          },
          {
            type: "not",
            condition: {
              type: "eq",
              left: { type: "field", path: "blacklisted" },
              right: { type: "boolean", value: true },
            },
          },
        ],
      });
    });

    it("supports fluent chaining on standalone nodes", () => {
      const chained = where("age")
        .gte(18)
        .and("country")
        .eq("EG")
        .or("country")
        .eq("US")
        .buildNode();

      expect(chained).toEqual({
        type: "or",
        conditions: [
          {
            type: "and",
            conditions: [
              {
                type: "gte",
                left: { type: "field", path: "age" },
                right: { type: "number", value: 18 },
              },
              {
                type: "eq",
                left: { type: "field", path: "country" },
                right: { type: "string", value: "EG" },
              },
            ],
          },
          {
            type: "eq",
            left: { type: "field", path: "country" },
            right: { type: "string", value: "US" },
          },
        ],
      });
    });
  });

  describe("RuleBuilder (Top-Level)", () => {
    it("constructs and validates a full Rule AST", () => {
      const builtRule = rule("Customer Eligibility Check")
        .id("eligibility-v1")
        .description("Verify age, plan, and geographical eligibility")
        .where("customer.age")
        .gte(18)
        .and("customer.plan")
        .in(["premium", "enterprise"])
        .and(
          or(
            where("customer.country").eq("EG"),
            where("customer.country").eq("US")
          )
        )
        .build();

      expect(builtRule.id).toBe("eligibility-v1");
      expect(builtRule.name).toBe("Customer Eligibility Check");
      expect(builtRule.description).toBe(
        "Verify age, plan, and geographical eligibility"
      );

      // Verify that validateRule confirms rule schema validity
      const validated = validateRule(builtRule);
      expect(validated).toEqual(builtRule);

      // Evaluate against matching data
      const resMatch = evaluate(builtRule, {
        customer: { age: 25, plan: "premium", country: "EG" },
      });
      expect(resMatch.result).toBe(true);

      // Evaluate against non-matching data
      const resNoMatch = evaluate(builtRule, {
        customer: { age: 16, plan: "premium", country: "EG" },
      });
      expect(resNoMatch.result).toBe(false);
    });

    it("supports field-to-field comparisons", () => {
      const compareRule = rule("Birth Year Check")
        .where("user.birthYear")
        .lte(field("system.currentYear"))
        .build();

      const res = evaluate(compareRule, {
        user: { birthYear: 1995 },
        system: { currentYear: 2026 },
      });
      expect(res.result).toBe(true);
    });

    it("throws an error if build() is called with no conditions", () => {
      expect(() => rule("Empty Rule").build()).toThrow();
    });
  });
});
