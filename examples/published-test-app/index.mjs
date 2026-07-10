import { safeValidateRule, evaluate, explainFailures } from "@qarar/sdk";

const rule = {
  id: "published-sdk-check",
  name: "Published SDK Check",
  version: "1",
  root: {
    type: "and",
    conditions: [
      {
        type: "gte",
        left: { type: "field", path: "customer.age" },
        right: { type: "number", value: 18 }
      },
      {
        type: "in",
        left: { type: "field", path: "customer.plan" },
        right: {
          type: "array",
          values: [
            { type: "string", value: "premium" },
            { type: "string", value: "enterprise" }
          ]
        }
      }
    ]
  }
};

const data = { customer: { age: 23, plan: "premium" } };

const parsed = safeValidateRule(rule);
if (!parsed.success) {
  console.error("Validation failed", parsed.error.issues);
  process.exit(1);
}

const result = evaluate(parsed.data, data);
const failures = explainFailures(result.trace);

console.log("Qarar published SDK smoke test");
console.log("Result:", result.result ? "PASS" : "FAIL");
console.log("Failures:", failures.length);

if (!result.result) {
  console.error("Smoke test failed. Failing conditions:");
  for (const failure of failures) {
    console.error("-", failure);
  }
  process.exit(1);
}
