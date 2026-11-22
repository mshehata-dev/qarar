import { describe, it, expect } from "vitest";
import {
  validateRule,
  safeValidateRule,
  validateDecisionTable,
  safeValidateDecisionTable,
  RuleSchema,
  DecisionTableSchema,
  FieldNodeSchema,
  ValueNodeSchema,
  DecisionBranchSchema,
  validateRuleNode,
  validateValueNode,
  type ValidationErrorIssue,
} from "../index.ts";

describe("@qarar/spec Edge Cases & Comprehensive Coverage", () => {
  describe("Rule validation edge cases", () => {
    it("rejects non-object rule input", () => {
      const res = safeValidateRule("not an object");
      expect(res.success).toBe(false);
      expect(() => validateRule(null)).toThrow();
    });

    it("rejects empty name or invalid description", () => {
      const res1 = safeValidateRule({ id: "r1", name: "", root: { type: "eq", left: { type: "field", path: "a" }, right: { type: "number", value: 1 } } });
      expect(res1.success).toBe(false);

      const res2 = safeValidateRule({ id: "r1", name: "R1", description: 123 as any, root: { type: "eq", left: { type: "field", path: "a" }, right: { type: "number", value: 1 } } });
      expect(res2.success).toBe(false);
    });

    it("rejects missing root", () => {
      const res = safeValidateRule({ id: "r1", name: "R1" });
      expect(res.success).toBe(false);
    });

    it("validates rule node edge cases (non-object, missing type, NOT missing condition)", () => {
      const issues: ValidationErrorIssue[] = [];
      expect(validateRuleNode("primitive", [], issues)).toBe(false);
      expect(validateRuleNode({ type: 123 }, [], issues)).toBe(false);
      expect(validateRuleNode({ type: "not" }, [], issues)).toBe(false);
    });

    it("validates between node requirements", () => {
      const issues: ValidationErrorIssue[] = [];
      // Missing min/max
      expect(validateRuleNode({ type: "between", left: { type: "field", path: "x" } }, [], issues)).toBe(false);
      // Valid between
      expect(
        validateRuleNode(
          {
            type: "between",
            left: { type: "field", path: "x" },
            min: { type: "number", value: 1 },
            max: { type: "number", value: 10 },
          },
          [],
          issues
        )
      ).toBe(true);
    });

    it("validates comparison node requirements (missing left or right)", () => {
      const issues: ValidationErrorIssue[] = [];
      expect(validateRuleNode({ type: "eq", left: { type: "field", path: "x" } }, [], issues)).toBe(false);
      expect(validateRuleNode({ type: "eq", right: { type: "number", value: 5 } }, [], issues)).toBe(false);
    });

    it("validates value nodes edge cases (invalid scalar types, array with empty/invalid items)", () => {
      const issues: ValidationErrorIssue[] = [];
      expect(validateValueNode(null, [], issues)).toBe(false);
      expect(validateValueNode({ type: "field", path: "" }, [], issues)).toBe(false);
      expect(validateValueNode({ type: "string", value: 123 }, [], issues)).toBe(false);
      expect(validateValueNode({ type: "number", value: "abc" }, [], issues)).toBe(false);
      expect(validateValueNode({ type: "number", value: NaN }, [], issues)).toBe(false);
      expect(validateValueNode({ type: "boolean", value: "not-bool" }, [], issues)).toBe(false);
      expect(validateValueNode({ type: "unknown-type" }, [], issues)).toBe(false);
      expect(validateValueNode({ type: "array", values: [] }, [], issues)).toBe(false);
      expect(validateValueNode({ type: "array", values: ["invalid-item"] }, [], issues)).toBe(false);
    });

    it("validates array value node with valid scalar values", () => {
      const issues: ValidationErrorIssue[] = [];
      expect(
        validateValueNode(
          {
            type: "array",
            values: [
              { type: "string", value: "a" },
              { type: "number", value: 1 },
              { type: "boolean", value: true },
              { type: "null" },
            ],
          },
          [],
          issues
        )
      ).toBe(true);
    });
  });

  describe("DecisionTable validation edge cases", () => {
    it("rejects non-object decision table input", () => {
      expect(safeValidateDecisionTable(null).success).toBe(false);
      expect(safeValidateDecisionTable("string").success).toBe(false);
      expect(() => validateDecisionTable(123)).toThrow();
    });

    it("rejects missing id, name, or invalid description", () => {
      const res1 = safeValidateDecisionTable({ id: "", name: "T", defaultOutput: "D", branches: [] });
      expect(res1.success).toBe(false);

      const res2 = safeValidateDecisionTable({ id: "t1", name: "", defaultOutput: "D", branches: [] });
      expect(res2.success).toBe(false);

      const res3 = safeValidateDecisionTable({ id: "t1", name: "T", description: 999 as any, defaultOutput: "D", branches: [] });
      expect(res3.success).toBe(false);
    });

    it("rejects missing defaultOutput or non-array branches", () => {
      const res1 = safeValidateDecisionTable({ id: "t1", name: "T", branches: [] });
      expect(res1.success).toBe(false);

      const res2 = safeValidateDecisionTable({ id: "t1", name: "T", defaultOutput: "fallback", branches: "not-array" as any });
      expect(res2.success).toBe(false);
    });

    it("rejects invalid branch structures", () => {
      // Branch not object
      const res1 = safeValidateDecisionTable({
        id: "t1",
        name: "T",
        defaultOutput: "D",
        branches: ["invalid-branch" as any],
      });
      expect(res1.success).toBe(false);

      // Branch missing id, condition, or output
      const res2 = safeValidateDecisionTable({
        id: "t1",
        name: "T",
        defaultOutput: "D",
        branches: [{ id: "", condition: { type: "eq", left: { type: "field", path: "x" }, right: { type: "number", value: 1 } }, output: "out" }],
      });
      expect(res2.success).toBe(false);

      const res3 = safeValidateDecisionTable({
        id: "t1",
        name: "T",
        defaultOutput: "D",
        branches: [{ id: "b1", output: "out" } as any],
      });
      expect(res3.success).toBe(false);

      const res4 = safeValidateDecisionTable({
        id: "t1",
        name: "T",
        defaultOutput: "D",
        branches: [{ id: "b1", condition: { type: "eq", left: { type: "field", path: "x" }, right: { type: "number", value: 1 } } } as any],
      });
      expect(res4.success).toBe(false);
    });

    it("accepts valid table with mode=all", () => {
      const res = safeValidateDecisionTable({
        id: "t1",
        name: "T",
        mode: "all",
        defaultOutput: [],
        branches: [
          {
            id: "b1",
            name: "Branch 1",
            description: "First branch",
            condition: { type: "eq", left: { type: "field", path: "role" }, right: { type: "string", value: "admin" } },
            output: "ADMIN_PERM",
          },
        ],
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.mode).toBe("all");
      }
    });
  });

  describe("Backward-compatible Schema Helpers", () => {
    it("RuleSchema parse and safeParse work as drop-in", () => {
      const valid = {
        id: "r1",
        name: "Rule 1",
        version: "1",
        root: { type: "eq", left: { type: "field", path: "a" }, right: { type: "number", value: 10 } },
      };
      expect(RuleSchema.parse(valid).id).toBe("r1");
      expect(RuleSchema.safeParse(valid).success).toBe(true);
      expect(RuleSchema.safeParse({ invalid: true }).success).toBe(false);
    });

    it("DecisionTableSchema parse and safeParse work as drop-in", () => {
      const valid = {
        id: "dt1",
        name: "Table 1",
        version: "1",
        defaultOutput: "none",
        branches: [],
      };
      expect(DecisionTableSchema.parse(valid).id).toBe("dt1");
      expect(DecisionTableSchema.safeParse(valid).success).toBe(true);
      expect(DecisionTableSchema.safeParse({ invalid: true }).success).toBe(false);
    });

    it("FieldNodeSchema, ValueNodeSchema, and DecisionBranchSchema parse correctly", () => {
      const field = FieldNodeSchema.parse({ type: "field", path: "user.id" });
      expect(field.path).toBe("user.id");
      expect(() => FieldNodeSchema.parse({ type: "wrong" })).toThrow();

      const val = ValueNodeSchema.parse({ type: "string", value: "test" });
      expect((val as any).value).toBe("test");
      expect(() => ValueNodeSchema.parse({ type: "wrong" })).toThrow();

      const branch = DecisionBranchSchema.parse({
        id: "b1",
        condition: { type: "eq", left: { type: "field", path: "x" }, right: { type: "null" } },
        output: "ok",
      });
      expect(branch.id).toBe("b1");
      expect(() => DecisionBranchSchema.parse({ id: 123 })).toThrow();
    });
  });
});
