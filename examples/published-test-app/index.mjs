import {
  rule,
  checkRule,
  compileRule,
  compileToSQL,
  compileToMongo,
  createQarar,
} from "@qarar/sdk";

console.log("=== Qarar SDK 5 Usability & DX Feature Showcase ===");

// 1. Fluent Rule Builder API
const builtRule = rule("Customer Eligibility Check")
  .id("eligibility-v1")
  .description("Check customer age and subscription tier")
  .where("customer.age").gte(18)
  .and("customer.plan").in(["premium", "enterprise"])
  .build();

const inputData = { customer: { age: 23, plan: "premium" } };

// 2. One-Shot Decision Helper & Reasons
const check = checkRule(builtRule, inputData);
console.log("[checkRule] Result:", check.result ? "PASS" : "FAIL");
console.log("[checkRule] Failure Reasons:", check.reasons);

if (!check.result) {
  process.exit(1);
}

// 3. High-Performance Pre-Compiled Executable
const isEligible = compileRule(builtRule);
const compiledRes = isEligible(inputData);
console.log("[compileRule] Result:", compiledRes.result ? "PASS" : "FAIL");

// 4. Database Pushdown (SQL & MongoDB Compilers)
const sqlResult = compileToSQL(builtRule, { columnStyle: "snake" });
console.log("[compileToSQL] WHERE Clause:", sqlResult.sql);

const mongoResult = compileToMongo(builtRule);
console.log("[compileToMongo] Filter Object:", JSON.stringify(mongoResult.filter));

// 5. Zero-Dependency Schema-Driven Type Safety
const CustomerSchema = {
  safeParse(data) {
    if (
      data &&
      typeof data === "object" &&
      data.customer &&
      typeof data.customer.age === "number" &&
      typeof data.customer.plan === "string"
    ) {
      return { success: true, data };
    }
    return {
      success: false,
      error: {
        issues: [{ path: ["customer", "age"], message: "Expected number" }],
      },
    };
  },
};

const q = createQarar(CustomerSchema);
const schemaCheck = q.check(builtRule, inputData);
console.log("[createQarar.check] Result:", schemaCheck.result ? "PASS" : "FAIL");

console.log("=== All 5 Qarar Features Executed Successfully! ===");
