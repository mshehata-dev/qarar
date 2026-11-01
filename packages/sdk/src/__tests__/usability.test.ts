import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  rule,
  checkRule,
  compileRule,
  compileToSQL,
  compileToMongo,
  createQarar,
} from "../index.js";

describe("SDK Usability & DX Features", () => {
  const sampleRule = rule("Customer Eligibility")
    .id("eligibility-1")
    .where("customer.age")
    .gte(18)
    .and("customer.plan")
    .in(["premium", "enterprise"])
    .build();

  describe("checkRule", () => {
    it("returns one-shot decision and human reasons for failure", () => {
      const passRes = checkRule(sampleRule, {
        customer: { age: 20, plan: "premium" },
      });
      expect(passRes.ok).toBe(true);
      expect(passRes.result).toBe(true);
      expect(passRes.reasons).toEqual([]);

      const failRes = checkRule(sampleRule, {
        customer: { age: 16, plan: "basic" },
      });
      expect(failRes.ok).toBe(true);
      expect(failRes.result).toBe(false);
      expect(failRes.reasons.length).toBeGreaterThan(0);
    });

    it("handles invalid rule gracefully", () => {
      const invalidRes = checkRule({ invalid: true }, {});
      expect(invalidRes.ok).toBe(false);
      expect(invalidRes.result).toBe(false);
      expect(invalidRes.reasons.length).toBeGreaterThan(0);
    });
  });

  describe("compileRule", () => {
    it("pre-validates AST and returns a reusable evaluation function", () => {
      const fn = compileRule(sampleRule);
      const res1 = fn({ customer: { age: 22, plan: "premium" } });
      expect(res1.result).toBe(true);

      const res2 = fn({ customer: { age: 15, plan: "basic" } });
      expect(res2.result).toBe(false);
    });
  });

  describe("Database Query Compilers", () => {
    it("compiles rule AST to SQL WHERE clause", () => {
      const sqlResult = compileToSQL(sampleRule, { columnStyle: "snake" });
      expect(sqlResult.sql).toBe(
        "customer_age >= 18 AND customer_plan IN ('premium', 'enterprise')"
      );
    });

    it("compiles rule AST to MongoDB filter object", () => {
      const mongoResult = compileToMongo(sampleRule);
      expect(mongoResult.filter).toEqual({
        $and: [
          { "customer.age": { $gte: 18 } },
          { "customer.plan": { $in: ["premium", "enterprise"] } },
        ],
      });
    });
  });

  describe("createQarar (Schema-driven)", () => {
    const CustomerSchema = z.object({
      customer: z.object({
        age: z.number(),
        plan: z.string(),
      }),
    });

    const q = createQarar(CustomerSchema);

    it("validates data schema before rule evaluation", () => {
      const checkValid = q.check(sampleRule, {
        customer: { age: 25, plan: "premium" },
      });
      expect(checkValid.ok).toBe(true);
      expect(checkValid.result).toBe(true);

      const checkInvalidData = q.check(sampleRule, {
        customer: { age: "twenty-five" /* wrong type */, plan: "premium" },
      });
      expect(checkInvalidData.ok).toBe(false);
      expect(checkInvalidData.dataError).toBeDefined();
      expect(checkInvalidData.reasons[0]).toContain("Data error");
    });
  });
});
