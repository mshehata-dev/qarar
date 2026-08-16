# @qarar/sdk

Qarar SDK lets you define business rules as JSON, validate them, run them on input data, and explain why a decision passed or failed.

Use it for:
- eligibility checks
- policy enforcement
- risk gates
- promotions and feature gating

---

## Install

```bash
npm install @qarar/sdk
```

---

## 5-Minute Start

```ts
import { safeValidateRule, evaluate, explainFailures } from "@qarar/sdk";

const rule = {
  id: "eligibility-check",
  name: "Eligibility Check",
  version: "1",
  root: {
    type: "and",
    conditions: [
      {
        type: "gte",
        left: { type: "field", path: "customer.age" },
        right: { type: "number", value: 18 },
      },
      {
        type: "in",
        left: { type: "field", path: "customer.plan" },
        right: {
          type: "array",
          values: [
            { type: "string", value: "premium" },
            { type: "string", value: "enterprise" },
          ],
        },
      },
    ],
  },
};

const input = { customer: { age: 27, plan: "premium" } };

const parsed = safeValidateRule(rule);
if (!parsed.success) {
  console.error(parsed.error.issues);
  process.exit(1);
}

const evaluated = evaluate(parsed.data, input);
console.log(evaluated.result); // true | false

if (!evaluated.result) {
  console.log(explainFailures(evaluated.trace)); // string[]
}
```

---

## Fluent Rule Builder (Recommended)

Instead of manually writing raw AST JSON, construct rules programmatically using the fluent builder API:

```ts
import { rule, where, or, evaluate } from "@qarar/sdk";

const eligibilityRule = rule("Customer Eligibility")
  .id("eligibility-rule-1")
  .description("Check customer age, plan, and country")
  .where("customer.age").gte(18)
  .and("customer.plan").in(["premium", "enterprise"])
  .and(
    or(
      where("customer.country").eq("EG"),
      where("customer.country").eq("US")
    )
  )
  .build();

const result = evaluate(eligibilityRule, {
  customer: { age: 25, plan: "premium", country: "EG" }
});

console.log(result.result); // true
```

---


## Mental Model

- A rule is a top-level object: metadata + `root`.
- `root` is a recursive tree (`RuleNode`).
- `evaluate` returns:
  - `result` (boolean decision)
  - `trace` (full execution trace)
- `explain` / `explainFailures` turn trace data into human-readable output.

Top-level rule shape:

```ts
type Rule = {
  id: string;
  name: string;
  description?: string;
  version: string;
  root: RuleNode;
};
```

---

## Rule Syntax (Exact)

### Comparison node

```ts
{
  type:
    | "eq" | "neq"
    | "isNull" | "isNotNull"
    | "gt" | "gte" | "lt" | "lte"
    | "in" | "notIn"
    | "contains" | "notContains"
    | "startsWith" | "endsWith"
    | "matches" | "notMatches",
  left: ValueNode,
  right: ValueNode
}
```

### Between node

```ts
{
  type: "between",
  left: ValueNode,
  min: ValueNode,
  max: ValueNode
}
```

### Logical nodes

```ts
{ type: "and", conditions: RuleNode[] }
{ type: "or", conditions: RuleNode[] }
{ type: "not", condition: RuleNode }
```

### Value nodes

```ts
{ type: "field", path: "customer.age" }
{ type: "string", value: "premium" }
{ type: "number", value: 18 }
{ type: "boolean", value: true }
{ type: "null" }
{ type: "array", values: ScalarValue[] } // scalar: string | number | boolean | null node
```

---

## API Reference

### `safeValidateRule(input)`

Returns:

```ts
{ success: true; data: Rule } | { success: false; error: ZodError }
```

Use this in production-friendly flows when you want validation errors instead of throws.

### `validateRule(input)`

Strict parse. Throws on invalid rule.

### `evaluate(rule, data)`

Runs decision logic against input data.

- `rule`: `{ root: RuleNode }` (a full `Rule` object is valid)
- `data`: `Record<string, unknown>`

Returns:

```ts
{
  result: boolean;
  trace: TraceEntry;
}
```

> Note: the decision boolean is `result` (not `passed`).

### `explain(trace, options?)`

Returns a formatted explanation **string**.

```ts
type ExplainOptions = {
  fieldLabels?: Record<string, string>;
  includePassing?: boolean; // default true
  indent?: string;
};
```

### `explainFailures(trace, options?)`

Returns only failures as:

```ts
string[]
```

---

## Operator Cheat Sheet

- Equality: `eq`, `neq`
- Null checks: `isNull`, `isNotNull`
- Numeric: `gt`, `gte`, `lt`, `lte`, `between`
- Set membership: `in`, `notIn`
- String: `contains`, `notContains`, `startsWith`, `endsWith`
- Regex: `matches`, `notMatches`
- Boolean composition: `and`, `or`, `not`

Behavior notes:
- String operators are case-insensitive in evaluation.
- Regex operators use case-insensitive matching.
- Missing field paths resolve to `undefined`.
- `isNull` treats both `null` and `undefined` as null-like.

---

## Practical Examples

### 1) Basic equality rule

```ts
const rule = {
  id: "status-active",
  name: "Status Active",
  version: "1",
  root: {
    type: "eq",
    left: { type: "field", path: "account.status" },
    right: { type: "string", value: "active" },
  },
};
```

### 2) Nested AND/OR gate

```ts
const rule = {
  id: "risk-gate",
  name: "Risk Gate",
  version: "1",
  root: {
    type: "and",
    conditions: [
      {
        type: "gte",
        left: { type: "field", path: "transaction.amount" },
        right: { type: "number", value: 5000 },
      },
      {
        type: "or",
        conditions: [
          {
            type: "eq",
            left: { type: "field", path: "account.verified" },
            right: { type: "boolean", value: false },
          },
          {
            type: "in",
            left: { type: "field", path: "transaction.country" },
            right: {
              type: "array",
              values: [
                { type: "string", value: "XX" },
                { type: "string", value: "YY" },
              ],
            },
          },
        ],
      },
    ],
  },
};
```

### 3) Between range

```ts
const rule = {
  id: "age-range",
  name: "Age Range",
  version: "1",
  root: {
    type: "between",
    left: { type: "field", path: "user.age" },
    min: { type: "number", value: 18 },
    max: { type: "number", value: 75 },
  },
};
```

### 4) Explain full trace vs failures

```ts
import { evaluate, explain, explainFailures } from "@qarar/sdk";

const evaluated = evaluate(rule, input);

const fullText = explain(evaluated.trace, { includePassing: true });
console.log(fullText); // string

const failuresOnly = explainFailures(evaluated.trace);
console.log(failuresOnly); // string[]
```

---

## Common Mistakes (and Fixes)

### 1) Missing top-level fields

Invalid:

```ts
const badRule = {
  type: "eq",
  left: { type: "field", path: "x" },
  right: { type: "number", value: 1 },
};
```

Fix: wrap node under `root` and add `id`, `name`, `version`.

### 2) Using `result.passed`

Invalid:

```ts
if (evaluated.passed) { ... }
```

Fix:

```ts
if (evaluated.result) { ... }
```

### 3) `isNull` / `isNotNull` without `right`

Current schema still requires `right` for comparison nodes.

Use:

```ts
{
  type: "isNull",
  left: { type: "field", path: "customer.phone" },
  right: { type: "null" }
}
```

---

## Integration Pattern (Recommended)

```ts
import { safeValidateRule, evaluate, explainFailures } from "@qarar/sdk";

export function runDecision(ruleInput: unknown, data: Record<string, unknown>) {
  const parsed = safeValidateRule(ruleInput);
  if (!parsed.success) {
    return {
      ok: false as const,
      validationErrors: parsed.error.issues,
    };
  }

  const evaluated = evaluate(parsed.data, data);
  return {
    ok: true as const,
    result: evaluated.result,
    trace: evaluated.trace,
    failures: explainFailures(evaluated.trace),
  };
}
```

---

## Playground Alignment

This SDK syntax is the same syntax used by playground examples in:

`apps/playground/src/examples.ts`

---

## Troubleshooting

### `safeValidateRule` fails

Usually one of:
- missing `id`, `name`, or `root`
- invalid node shape (`conditions`/`condition` mismatch)
- wrong value node format (for example, array values must be scalar nodes)

### Result does not match expectation

Inspect trace:

```ts
console.log(JSON.stringify(evaluated.trace, null, 2));
```

Then compare `actual` and expected values on each comparison entry.

### Field path not found

If a field path does not exist in input, it resolves to `undefined`.  
`isNull` treats `null` and `undefined` as null-like.
