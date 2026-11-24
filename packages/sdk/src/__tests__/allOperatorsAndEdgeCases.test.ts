import { describe, it, expect } from "vitest";
import {
  rule,
  where,
  and,
  or,
  not,
  evaluate,
  checkDecisionTable,
  createQarar,
  toValueNode,
  resolveNode,
  RuleBuilder,
  NodeBuilder,
  switchRule,
  decisionTable,
} from "../index.js";

describe("All Builder Operators & SDK Edge Cases", () => {
  describe("Comprehensive Builder Operators (Chained & Bound)", () => {
    it("builds and evaluates all string operators (startsWith, endsWith, contains, notContains, matches, notMatches)", () => {
      const r = rule("String Ops Test")
        .where("email").startsWith("admin")
        .and("email").endsWith(".org")
        .and("name").contains("John")
        .and("name").notContains("Doe")
        .and("code").matches("^ABC-[0-9]+$")
        .and("code").notMatches("^XYZ")
        .build();

      const passPayload = {
        email: "admin@company.org",
        name: "John Smith",
        code: "ABC-1234",
      };

      const failPayload = {
        email: "user@company.org",
        name: "John Doe",
        code: "XYZ-9999",
      };

      expect(evaluate(r, passPayload).result).toBe(true);
      expect(evaluate(r, failPayload).result).toBe(false);
    });

    it("builds and evaluates comparison operators (neq, lt, lte, gt, gte, eq)", () => {
      const r = rule("Numeric Ops Test")
        .where("age").gt(18)
        .and("age").gte(19)
        .and("score").lt(100)
        .and("score").lte(99)
        .and("status").eq("active")
        .and("type").neq("guest")
        .build();

      const payload = {
        age: 20,
        score: 95,
        status: "active",
        type: "member",
      };

      expect(evaluate(r, payload).result).toBe(true);
    });

    it("builds and evaluates in and notIn operators", () => {
      const r = rule("List Ops Test")
        .where("role").in(["admin", "moderator", "editor"])
        .and("status").notIn(["banned", "suspended"])
        .build();

      expect(evaluate(r, { role: "admin", status: "active" }).result).toBe(true);
      expect(evaluate(r, { role: "guest", status: "active" }).result).toBe(false);
      expect(evaluate(r, { role: "admin", status: "banned" }).result).toBe(false);
    });

    it("builds and evaluates between operator", () => {
      const r = rule("Between Test")
        .where("price").between(10, 50)
        .build();

      expect(evaluate(r, { price: 25 }).result).toBe(true);
      expect(evaluate(r, { price: 10 }).result).toBe(true);
      expect(evaluate(r, { price: 50 }).result).toBe(true);
      expect(evaluate(r, { price: 5 }).result).toBe(false);
      expect(evaluate(r, { price: 55 }).result).toBe(false);
    });

    it("builds and evaluates isNull and isNotNull operators", () => {
      const r = rule("Null Ops Test")
        .where("deletedAt").isNull()
        .and("createdAt").isNotNull()
        .build();

      expect(evaluate(r, { deletedAt: null, createdAt: "2026-01-01" }).result).toBe(true);
      expect(evaluate(r, { deletedAt: "2026-02-01", createdAt: "2026-01-01" }).result).toBe(false);
    });
  });

  describe("Standalone Condition Builders & Functional Composition", () => {
    it("composes conditions using where, and, or, not standalone functions", () => {
      const cond1 = where("age").gte(21);
      const cond2 = where("country").eq("US");
      const cond3 = where("vip").eq(true);
      const cond4 = where("banned").eq(true);

      const r = rule("Composed Rule")
        .where(
          and(
            or(cond1, cond3),
            cond2,
            not(cond4)
          )
        )
        .build();

      expect(evaluate(r, { age: 25, country: "US", vip: false, banned: false }).result).toBe(true);
      expect(evaluate(r, { age: 18, country: "US", vip: true, banned: false }).result).toBe(true);
      expect(evaluate(r, { age: 25, country: "US", vip: false, banned: true }).result).toBe(false);
    });

    it("supports all operators on StandaloneFieldConditionBuilder", () => {
      expect(where("x").eq("val").buildNode().type).toBe("eq");
      expect(where("x").neq("val").buildNode().type).toBe("neq");
      expect(where("x").gt(10).buildNode().type).toBe("gt");
      expect(where("x").gte(10).buildNode().type).toBe("gte");
      expect(where("x").lt(10).buildNode().type).toBe("lt");
      expect(where("x").lte(10).buildNode().type).toBe("lte");
      expect(where("x").in(["a", "b"]).buildNode().type).toBe("in");
      expect(where("x").notIn(["a", "b"]).buildNode().type).toBe("notIn");
      expect(where("x").between(1, 5).buildNode().type).toBe("between");
      expect(where("x").contains("sub").buildNode().type).toBe("contains");
      expect(where("x").notContains("sub").buildNode().type).toBe("notContains");
      expect(where("x").startsWith("pre").buildNode().type).toBe("startsWith");
      expect(where("x").endsWith("suf").buildNode().type).toBe("endsWith");
      expect(where("x").matches(".*").buildNode().type).toBe("matches");
      expect(where("x").notMatches(".*").buildNode().type).toBe("notMatches");
      expect(where("x").isNull().buildNode().type).toBe("isNull");
      expect(where("x").isNotNull().buildNode().type).toBe("isNotNull");
    });

    it("supports all operators on BoundFieldConditionBuilder", () => {
      const b = new RuleBuilder("Bound Test");
      expect(b.where("x").eq("v").build().root.type).toBe("eq");
      expect(new RuleBuilder().where("x").neq("v").build().root.type).toBe("neq");
      expect(new RuleBuilder().where("x").gt(1).build().root.type).toBe("gt");
      expect(new RuleBuilder().where("x").gte(1).build().root.type).toBe("gte");
      expect(new RuleBuilder().where("x").lt(1).build().root.type).toBe("lt");
      expect(new RuleBuilder().where("x").lte(1).build().root.type).toBe("lte");
      expect(new RuleBuilder().where("x").in([1, 2]).build().root.type).toBe("in");
      expect(new RuleBuilder().where("x").notIn([1, 2]).build().root.type).toBe("notIn");
      expect(new RuleBuilder().where("x").between(1, 10).build().root.type).toBe("between");
      expect(new RuleBuilder().where("x").contains("c").build().root.type).toBe("contains");
      expect(new RuleBuilder().where("x").notContains("c").build().root.type).toBe("notContains");
      expect(new RuleBuilder().where("x").startsWith("s").build().root.type).toBe("startsWith");
      expect(new RuleBuilder().where("x").endsWith("e").build().root.type).toBe("endsWith");
      expect(new RuleBuilder().where("x").matches("m").build().root.type).toBe("matches");
      expect(new RuleBuilder().where("x").notMatches("m").build().root.type).toBe("notMatches");
      expect(new RuleBuilder().where("x").isNull().build().root.type).toBe("isNull");
      expect(new RuleBuilder().where("x").isNotNull().build().root.type).toBe("isNotNull");
    });

    it("supports all operators on ChainedFieldConditionBuilder for AND and OR chains", () => {
      const andRule = rule("Chained All Ops")
        .where("f1").eq("a")
        .and("f2").neq("b")
        .and("f3").gt(1)
        .and("f4").gte(2)
        .and("f5").lt(10)
        .and("f6").lte(9)
        .and("f7").in(["x", "y"])
        .and("f8").notIn(["z"])
        .and("f9").between(5, 15)
        .and("f10").contains("sub")
        .and("f11").notContains("bad")
        .and("f12").startsWith("start")
        .and("f13").endsWith("end")
        .and("f14").matches("^ok$")
        .and("f15").notMatches("^fail$")
        .and("f16").isNull()
        .and("f17").isNotNull()
        .build();

      expect(andRule.root.type).toBe("and");

      // NodeBuilder OR chaining across operators
      const orNode = where("f1").eq("a")
        .or("f2").neq("b")
        .or("f3").gt(1)
        .or("f4").gte(2)
        .or("f5").lt(10)
        .or("f6").lte(9)
        .or("f7").in(["x"])
        .or("f8").notIn(["y"])
        .or("f9").between(1, 2)
        .or("f10").contains("c")
        .or("f11").notContains("nc")
        .or("f12").startsWith("sw")
        .or("f13").endsWith("ew")
        .or("f14").matches("m")
        .or("f15").notMatches("nm")
        .or("f16").isNull()
        .or("f17").isNotNull()
        .buildNode();

      expect(orNode.type).toBe("or");

      // RuleBuilder OR chaining
      const orRule = rule("OR Chain")
        .where("a").eq(1)
        .or("b").eq(2)
        .or(where("c").eq(3))
        .description("Rule with OR chain")
        .version("2")
        .build();

      expect(orRule.description).toBe("Rule with OR chain");
      expect(orRule.version).toBe("2");
    });
  });

  describe("Value Conversion & Node Resolution Edge Cases", () => {
    it("converts all scalar types and handles arrays", () => {
      expect(toValueNode("hello")).toEqual({ type: "string", value: "hello" });
      expect(toValueNode(42)).toEqual({ type: "number", value: 42 });
      expect(toValueNode(true)).toEqual({ type: "boolean", value: true });
      expect(toValueNode(null)).toEqual({ type: "null" });
      expect(toValueNode(["a", 1, false])).toEqual({
        type: "array",
        values: [
          { type: "string", value: "a" },
          { type: "number", value: 1 },
          { type: "boolean", value: false },
        ],
      });
      expect(toValueNode([["inner"] as any])).toEqual({
        type: "array",
        values: [{ type: "array", values: [{ type: "string", value: "inner" }] }],
      });
      expect(() => toValueNode(undefined as any)).toThrow();
    });

    it("resolves various node input shapes (buildNode, build rule, plain RuleNode)", () => {
      const nodeBuilder = new NodeBuilder({ type: "eq", left: { type: "field", path: "x" }, right: { type: "number", value: 1 } });
      expect(resolveNode(nodeBuilder).type).toBe("eq");

      const ruleBldr = rule("Test").where("x").eq(1);
      expect(resolveNode(ruleBldr).type).toBe("eq");

      const rawNode = { type: "eq" as const, left: { type: "field" as const, path: "x" }, right: { type: "number" as const, value: 1 } };
      expect(resolveNode(rawNode).type).toBe("eq");

      const customBuilder = {
        build() {
          return rawNode;
        },
      };
      expect(resolveNode(customBuilder).type).toBe("eq");
    });

    it("throws if RuleBuilder has no conditions", () => {
      const emptyBuilder = new RuleBuilder("Empty");
      expect(() => emptyBuilder.build()).toThrow("RuleBuilder requires at least one condition");
    });
  });

  describe("Decision Tables & checkDecisionTable Error Handling", () => {
    it("handles invalid decision table gracefully in checkDecisionTable", () => {
      const result = checkDecisionTable({ invalid: "table" }, {});
      expect(result.ok).toBe(false);
      expect(result.matched).toBe(false);
      expect(result.matchedBranch).toBeNull();
      expect(result.validationError).toBeDefined();
    });

    it("builds decision table with all methods (name, desc, version, mode=all, single-arg case)", () => {
      const dt = decisionTable<number>("DT-1")
        .name("Decision Table 1")
        .description("Test description")
        .version("1.1")
        .mode("all")
        .case(where("score").gte(90)).then(100)
        .case("b2", where("score").gte(80), "Branch 2", "Second tier").then(50)
        .default(0)
        .build();

      expect(dt.name).toBe("Decision Table 1");
      expect(dt.description).toBe("Test description");
      expect(dt.version).toBe("1.1");
      expect(dt.mode).toBe("all");
      expect(dt.branches).toHaveLength(2);

      const evalRes = checkDecisionTable(dt, { score: 95 });
      expect(evalRes.ok).toBe(true);
      expect(evalRes.matched).toBe(true);
      expect(evalRes.allMatchedBranches).toHaveLength(2);
    });

    it("throws when building decision table without default output", () => {
      const tableBuilder = switchRule("No Default")
        .case("c1", where("x").eq(1)).then("out");
      expect(() => tableBuilder.build()).toThrow("requires a .default(output) value");
    });

    it("evaluates decision table with fallback default when no branch matches", () => {
      const table = switchRule<string>("Discount Matrix")
        .case("gold-tier", where("tier").eq("gold"))
          .then("20% OFF")
        .case("silver-tier", where("tier").eq("silver"))
          .then("10% OFF")
        .default("NO_DISCOUNT")
        .build();

      const res = checkDecisionTable(table, { tier: "bronze" });
      expect(res.ok).toBe(true);
      expect(res.matched).toBe(false);
      expect(res.output).toBe("NO_DISCOUNT");
    });
  });

  describe("Schema Helpers & Error Formatting in createQarar", () => {
    it("handles schema validation error with generic string error message", () => {
      const GenericErrorSchema = {
        safeParse(data: unknown) {
          if (!data) {
            return {
              success: false as const,
              error: { message: "Data cannot be null or empty" },
            };
          }
          return { success: true as const, data };
        },
      };

      const q = createQarar(GenericErrorSchema);
      const res = q.check(
        rule("R").where("x").eq(1).build(),
        null
      );
      expect(res.ok).toBe(false);
      expect(res.reasons[0]).toContain("Data cannot be null or empty");
    });

    it("exposes validateData on QararSchemaInstance", () => {
      const Schema = {
        safeParse(data: unknown) {
          return { success: true as const, data };
        },
      };
      const q = createQarar(Schema);
      expect(q.validateData({ test: 1 }).success).toBe(true);
      expect(q.rule("My Rule").where("a").eq(1).id("r1").build().id).toBe("r1");
    });
  });
});
