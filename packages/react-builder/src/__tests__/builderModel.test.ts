import { describe, it, expect } from "vitest";
import {
  fromAST,
  toAST,
  defaultComparison,
  defaultGroup,
} from "../builderModel.js";
import type { RuleNode } from "@qarar/spec";

describe("@qarar/react-builder - builderModel", () => {
  describe("defaultComparison and defaultGroup", () => {
    it("creates default comparison with unique ID", () => {
      const c1 = defaultComparison("customer.age");
      const c2 = defaultComparison("customer.age");
      expect(c1.kind).toBe("comparison");
      expect(c1.field).toBe("customer.age");
      expect(c1.operator).toBe("eq");
      expect(c1.id).not.toBe(c2.id);
    });

    it("creates default group with nested comparison", () => {
      const g = defaultGroup("or");
      expect(g.kind).toBe("group");
      expect(g.logic).toBe("or");
      expect(g.children).toHaveLength(1);
      expect(g.children[0].kind).toBe("comparison");
    });
  });

  describe("fromAST", () => {
    it("handles null, undefined, and non-object inputs gracefully", () => {
      const g1 = fromAST(null as unknown as RuleNode);
      expect(g1.kind).toBe("group");
      expect((g1 as { logic: string }).logic).toBe("and");

      const g2 = fromAST(undefined as unknown as RuleNode);
      expect(g2.kind).toBe("group");

      const g3 = fromAST({} as unknown as RuleNode);
      expect(g3.kind).toBe("group");
    });

    it("converts AND / OR logic groups", () => {
      const ast: RuleNode = {
        type: "and",
        conditions: [
          {
            type: "gte",
            left: { type: "field", path: "age" },
            right: { type: "number", value: 18 },
          },
          {
            type: "eq",
            left: { type: "field", path: "status" },
            right: { type: "string", value: "active" },
          },
        ],
      };

      const tree = fromAST(ast);
      expect(tree.kind).toBe("group");
      if (tree.kind === "group") {
        expect(tree.logic).toBe("and");
        expect(tree.children).toHaveLength(2);
        expect(tree.children[0].kind).toBe("comparison");
        if (tree.children[0].kind === "comparison") {
          expect(tree.children[0].field).toBe("age");
          expect(tree.children[0].operator).toBe("gte");
          expect(tree.children[0].value).toBe("18");
        }
      }
    });

    it("converts NOT logic group", () => {
      const ast: RuleNode = {
        type: "not",
        condition: {
          type: "eq",
          left: { type: "field", path: "blocked" },
          right: { type: "boolean", value: true },
        },
      };

      const tree = fromAST(ast);
      expect(tree.kind).toBe("group");
      if (tree.kind === "group") {
        expect(tree.logic).toBe("not");
        expect(tree.children).toHaveLength(1);
      }
    });

    it("converts between comparison", () => {
      const ast: RuleNode = {
        type: "between",
        left: { type: "field", path: "score" },
        min: { type: "number", value: 50 },
        max: { type: "number", value: 100 },
      };

      const tree = fromAST(ast);
      expect(tree.kind).toBe("comparison");
      if (tree.kind === "comparison") {
        expect(tree.operator).toBe("between");
        expect(tree.field).toBe("score");
        expect(tree.value).toBe("50");
        expect(tree.value2).toBe("100");
      }
    });

    it("converts in / notIn list comparison", () => {
      const ast: RuleNode = {
        type: "in",
        left: { type: "field", path: "tier" },
        right: {
          type: "array",
          values: [
            { type: "string", value: "gold" },
            { type: "string", value: "platinum" },
          ],
        },
      };

      const tree = fromAST(ast);
      expect(tree.kind).toBe("comparison");
      if (tree.kind === "comparison") {
        expect(tree.operator).toBe("in");
        expect(tree.field).toBe("tier");
        expect(tree.value).toBe("gold, platinum");
      }
    });

    it("converts isNull / isNotNull comparison", () => {
      const ast: RuleNode = {
        type: "isNull",
        left: { type: "field", path: "deletedAt" },
        right: { type: "null" },
      };

      const tree = fromAST(ast);
      expect(tree.kind).toBe("comparison");
      if (tree.kind === "comparison") {
        expect(tree.operator).toBe("isNull");
        expect(tree.field).toBe("deletedAt");
      }
    });
  });

  describe("toAST", () => {
    it("handles null / undefined input gracefully", () => {
      const ast = toAST(null as never);
      expect(ast.type).toBe("and");
    });

    it("converts group and comparisons back to AST", () => {
      const tree = defaultGroup("or");
      tree.children = [
        {
          kind: "comparison",
          id: "1",
          field: "score",
          operator: "gt",
          value: "90",
        },
      ];

      const ast = toAST(tree, { score: "number" });
      expect(ast).toEqual({
        type: "or",
        conditions: [
          {
            type: "gt",
            left: { type: "field", path: "score" },
            right: { type: "number", value: 90 },
          },
        ],
      });
    });

    it("safely handles NaN in number coercion", () => {
      const tree = defaultGroup("and");
      tree.children = [
        {
          kind: "comparison",
          id: "1",
          field: "amount",
          operator: "gte",
          value: "invalid-number",
        },
      ];

      const ast = toAST(tree, { amount: "number" });
      expect(ast).toEqual({
        type: "and",
        conditions: [
          {
            type: "gte",
            left: { type: "field", path: "amount" },
            right: { type: "number", value: 0 },
          },
        ],
      });
    });

    it("handles between operator with fallbacks", () => {
      const tree = defaultGroup("and");
      tree.children = [
        {
          kind: "comparison",
          id: "1",
          field: "range",
          operator: "between",
          value: "10",
          value2: "20",
        },
      ];

      const ast = toAST(tree, { range: "number" });
      expect(ast).toEqual({
        type: "and",
        conditions: [
          {
            type: "between",
            left: { type: "field", path: "range" },
            min: { type: "number", value: 10 },
            max: { type: "number", value: 20 },
          },
        ],
      });
    });

    it("handles in operator with empty value safely", () => {
      const tree = defaultGroup("and");
      tree.children = [
        {
          kind: "comparison",
          id: "1",
          field: "tags",
          operator: "in",
          value: "",
        },
      ];

      const ast = toAST(tree, { tags: "string" });
      expect(ast).toEqual({
        type: "and",
        conditions: [
          {
            type: "in",
            left: { type: "field", path: "tags" },
            right: {
              type: "array",
              values: [{ type: "string", value: "" }],
            },
          },
        ],
      });
    });

    it("handles isNull / isNotNull operator", () => {
      const tree = defaultGroup("and");
      tree.children = [
        {
          kind: "comparison",
          id: "1",
          field: "archived",
          operator: "isNotNull",
          value: "",
        },
      ];

      const ast = toAST(tree);
      expect(ast).toEqual({
        type: "and",
        conditions: [
          {
            type: "isNotNull",
            left: { type: "field", path: "archived" },
            right: { type: "null" },
          },
        ],
      });
    });
  });

  describe("Round-Trip consistency", () => {
    it("round-trips complex nested AST faithfully", () => {
      const original: RuleNode = {
        type: "and",
        conditions: [
          {
            type: "gte",
            left: { type: "field", path: "customer.age" },
            right: { type: "number", value: 21 },
          },
          {
            type: "in",
            left: { type: "field", path: "customer.plan" },
            right: {
              type: "array",
              values: [
                { type: "string", value: "pro" },
                { type: "string", value: "enterprise" },
              ],
            },
          },
        ],
      };

      const fieldMap = {
        "customer.age": "number",
        "customer.plan": "string",
      };

      const tree = fromAST(original);
      const reconstructed = toAST(tree, fieldMap);

      expect(reconstructed).toEqual(original);
    });
  });
});
