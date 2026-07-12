# @qarar/sdk

**Qarar** is a lightweight, declarative decision logic engine for JavaScript/TypeScript. Define business rules as portable JSON, validate them, and execute them with full explainability.

**Perfect for:**
- Policy enforcement (approvals, eligibility, access control)
- Rule-driven workflows (loan decisioning, claim processing)
- A/B testing with complex conditions
- Feature flags with business logic
- Compliance and audit trails

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Concepts](#core-concepts)
3. [Installation](#installation)
4. [Basic Usage](#basic-usage)
5. [Advanced Usage](#advanced-usage)
6. [API Reference](#api-reference)
7. [Rule Structure](#rule-structure)
8. [Examples](#examples)
9. [Browser & Node.js](#browser--nodejs)
10. [Performance](#performance)
11. [Versioning](#versioning)

---

## Quick Start

```ts
import { safeValidateRule, evaluate, explainFailures } from "@qarar/sdk";

// Define a rule
const rule = {
  operator: "AND",
  operands: [
    { field: "age", operator: ">=", value: 18 },
    { field: "credit_score", operator: ">=", value: 650 }
  ]
};

// Validate
const parsed = safeValidateRule(rule);
if (!parsed.success) {
  console.error("Invalid rule:", parsed.error);
  process.exit(1);
}

// Evaluate
const data = { age: 25, credit_score: 720 };
const result = evaluate(parsed.data, data);

console.log("Passed:", result.passed); // true
console.log("Trace:", result.trace);

// Explain failures (if any)
if (!result.passed) {
  console.log("Reasons:", explainFailures(result.trace));
}
```

---

## Core Concepts

### Rules

A **rule** is a declarative, reusable decision logic definition. It answers: *"Given this input, should this decision pass or fail, and why?"*

Rules are **not** analytics models. They don't compute metrics or aggregates. Instead, they evaluate conditions against input data and return a pass/fail verdict with a full trace of which conditions passed and which failed.

### Declarative Syntax

Rules are plain JSON, making them:
- **Portable** across languages and platforms (via JSON)
- **Versionable** in git alongside your application code
- **Testable** with real input data
- **Debuggable** with execution traces
- **Auditable** for compliance (why did this decision fail?)

### Boolean Logic

Rules support:
- **AND**: All operands must pass
- **OR**: At least one operand must pass
- **NOT**: Inverts a condition

Operators can be nested to arbitrary depth for complex logic.

### Operators

Comparison operators:
- `==`: Equals
- `!=`: Not equals
- `<`, `<=`, `>`, `>=`: Numeric comparisons
- `in`: Value in array (e.g., `{ field: "status", operator: "in", value: ["active", "pending"] }`)
- `notIn`: Value not in array
- `contains`: String contains substring
- `startsWith`: String starts with prefix
- `endsWith`: String ends with suffix
- `isEmpty`: Field is empty/null (no value needed)
- `isNotEmpty`: Field is not empty/null

### Explainability

Every rule evaluation produces a **trace** showing:
- Which operands passed/failed
- Actual vs. expected values
- Nested condition details

This is critical for:
- Debugging customer decisions
- Audit trails and compliance
- Understanding why a loan was denied or an account was suspended

---

## Installation

### npm

```bash
npm install @qarar/sdk
```

### pnpm

```bash
pnpm add @qarar/sdk
```

### yarn

```bash
yarn add @qarar/sdk
```

### CDN (Browser)

```html
<script src="https://unpkg.com/@qarar/sdk@latest/dist/index.js"></script>
<script>
  const { safeValidateRule, evaluate, explainFailures } = window.qarar;
</script>
```

---

## Basic Usage

### 1. Validate a Rule

```ts
import { safeValidateRule } from "@qarar/sdk";

const rule = {
  operator: "AND",
  operands: [
    { field: "age", operator: ">=", value: 18 }
  ]
};

const result = safeValidateRule(rule);
if (result.success) {
  console.log("Valid rule:", result.data);
} else {
  console.error("Validation errors:", result.error);
}
```

`safeValidateRule()` returns a **Zod result** object:
- `{ success: true, data: Rule }` if valid
- `{ success: false, error: ZodError }` if invalid

### 2. Evaluate a Rule

```ts
import { safeValidateRule, evaluate } from "@qarar/sdk";

const rule = {
  operator: "AND",
  operands: [
    { field: "age", operator: ">=", value: 18 },
    { field: "status", operator: "==", value: "active" }
  ]
};

const parsed = safeValidateRule(rule);
if (!parsed.success) throw parsed.error;

const result = evaluate(parsed.data, {
  age: 25,
  status: "active"
});

console.log(result);
// {
//   passed: true,
//   trace: { operator: "AND", operands: [...], passed: true }
// }
```

### 3. Understand Failures

```ts
import { explainFailures } from "@qarar/sdk";

const rule = {
  operator: "AND",
  operands: [
    { field: "age", operator: ">=", value: 18 },
    { field: "credit_score", operator: ">=", value: 700 }
  ]
};

const result = evaluate(rule, {
  age: 16,
  credit_score: 650
});

// result.passed === false

const reasons = explainFailures(result.trace);
console.log(reasons);
// Output:
// [
//   "age >= 18: expected >= 18, got 16",
//   "credit_score >= 700: expected >= 700, got 650"
// ]
```

---

## Advanced Usage

### Nested Logic

Rules can be nested to any depth:

```ts
const rule = {
  operator: "AND",
  operands: [
    // Condition 1: Age check
    { field: "age", operator: ">=", value: 18 },
    
    // Condition 2: Credit check OR income check
    {
      operator: "OR",
      operands: [
        { field: "credit_score", operator: ">=", value: 700 },
        { field: "annual_income", operator: ">=", value: 50000 }
      ]
    },
    
    // Condition 3: NOT flagged for fraud
    {
      operator: "NOT",
      operands: [
        { field: "fraud_flag", operator: "==", value: true }
      ]
    }
  ]
};
```

### Array Operations

Check if a field is in or not in an array:

```ts
const rule = {
  operator: "AND",
  operands: [
    {
      field: "status",
      operator: "in",
      value: ["active", "pending", "review"]
    },
    {
      field: "country",
      operator: "notIn",
      value: ["US", "UK", "CA"] // Exclude certain countries
    }
  ]
};
```

### String Operations

```ts
const rule = {
  operator: "AND",
  operands: [
    { field: "email", operator: "endsWith", value: "@company.com" },
    { field: "username", operator: "startsWith", value: "admin_" },
    { field: "name", operator: "contains", value: "John" }
  ]
};
```

### Nullability Checks

```ts
const rule = {
  operator: "AND",
  operands: [
    { field: "email", operator: "isNotEmpty" }, // Must have email
    { field: "phone", operator: "isEmpty" }     // Phone must be empty
  ]
};
```

### Full Trace Inspection

```ts
const result = evaluate(rule, data);

console.log(JSON.stringify(result.trace, null, 2));
// {
//   "operator": "AND",
//   "operands": [
//     {
//       "field": "age",
//       "operator": ">=",
//       "value": 18,
//       "actual": 25,
//       "passed": true
//     },
//     {
//       "field": "status",
//       "operator": "==",
//       "value": "active",
//       "actual": "inactive",
//       "passed": false
//     }
//   ],
//   "passed": false
// }
```

---

## API Reference

### `safeValidateRule(rule)`

Validates a rule definition against the Qarar schema.

**Parameters:**
- `rule`: Unknown (typically a parsed JSON object)

**Returns:**
```ts
{
  success: true,
  data: Rule  // Validated rule object
} | {
  success: false,
  error: ZodError
}
```

**Usage:**
```ts
const result = safeValidateRule(myRule);
if (result.success) {
  // Use result.data
} else {
  // Handle result.error.issues
}
```

---

### `evaluate(rule, data)`

Executes a rule against input data.

**Parameters:**
- `rule`: Rule (validated via `safeValidateRule`)
- `data`: Record<string, any> (input fields to check)

**Returns:**
```ts
{
  passed: boolean,
  trace: {
    operator?: string,
    operands?: Trace[],
    field?: string,
    operator?: string,
    value?: any,
    actual?: any,
    passed: boolean
  }
}
```

**Example:**
```ts
const result = evaluate(rule, { age: 25, status: "active" });
console.log(result.passed);   // true or false
console.log(result.trace);    // Full decision tree
```

---

### `explainFailures(trace)`

Generates human-readable explanations of why conditions failed.

**Parameters:**
- `trace`: Trace object (from `evaluate()`)

**Returns:**
- `string[]` - Array of failure messages

**Example:**
```ts
const reasons = explainFailures(result.trace);
reasons.forEach(reason => console.log("• " + reason));
// • age >= 18: expected >= 18, got 16
// • status == active: expected active, got inactive
```

---

### `explain(trace, includePass?)`

Lower-level API for custom trace analysis.

**Parameters:**
- `trace`: Trace object
- `includePass`: boolean (default: false) - include passing conditions in output

**Returns:**
- `string[]` - Array of explanation strings

---

## Rule Structure

A complete rule definition:

```ts
interface Rule {
  operator?: "AND" | "OR" | "NOT";
  operands?: Rule[];  // For AND/OR/NOT
  
  field?: string;     // For comparisons
  operator?: "==" | "!=" | "<" | "<=" | ">" | ">=" | 
             "in" | "notIn" | "contains" | "startsWith" | 
             "endsWith" | "isEmpty" | "isNotEmpty";
  value?: any;        // For comparisons
}
```

**Basic Condition:**
```json
{
  "field": "age",
  "operator": ">=",
  "value": 18
}
```

**Composite Rule (AND):**
```json
{
  "operator": "AND",
  "operands": [
    { "field": "age", "operator": ">=", "value": 18 },
    { "field": "status", "operator": "==", "value": "active" }
  ]
}
```

**Composite Rule (OR):**
```json
{
  "operator": "OR",
  "operands": [
    { "field": "credit_score", "operator": ">=", "value": 700 },
    { "field": "annual_income", "operator": ">=", "value": 100000 }
  ]
}
```

**Negation:**
```json
{
  "operator": "NOT",
  "operands": [
    { "field": "is_fraud", "operator": "==", "value": true }
  ]
}
```

---

## Examples

### Loan Eligibility

```ts
const loanRule = {
  operator: "AND",
  operands: [
    { field: "age", operator: ">=", value: 18 },
    { field: "employment_status", operator: "==", value: "employed" },
    {
      operator: "OR",
      operands: [
        { field: "credit_score", operator: ">=", value: 650 },
        { field: "annual_income", operator: ">=", value: 75000 }
      ]
    },
    { field: "bankruptcy_history", operator: "==", value: false }
  ]
};

const applicant = {
  age: 35,
  employment_status: "employed",
  credit_score: 720,
  annual_income: 60000,
  bankruptcy_history: false
};

const result = evaluate(loanRule, applicant);
console.log(result.passed ? "✅ Approved" : "❌ Denied");
```

### Geographic Restrictions

```ts
const geoRule = {
  operator: "AND",
  operands: [
    {
      field: "country",
      operator: "in",
      value: ["US", "CA", "MX"]
    },
    {
      field: "state",
      operator: "notIn",
      value: ["AK", "HI"] // Exclude Alaska, Hawaii
    }
  ]
};

const user = { country: "US", state: "CA" };
const result = evaluate(geoRule, user);
```

### Feature Flag with Complex Logic

```ts
const featureFlagRule = {
  operator: "OR",
  operands: [
    {
      // Early access for beta testers
      field: "user_group",
      operator: "==",
      value: "beta_tester"
    },
    {
      // Or for power users with high engagement
      operator: "AND",
      operands: [
        { field: "account_age_days", operator: ">", value: 90 },
        { field: "monthly_active_sessions", operator: ">", value: 10 }
      ]
    },
    {
      // Or rollout to 10% of active users
      field: "rollout_percentage",
      operator: ">",
      value: 90 // User ID hash > 90%
    }
  ]
};
```

### Content Moderation

```ts
const contentRule = {
  operator: "AND",
  operands: [
    { field: "is_spam", operator: "==", value: false },
    { field: "contains_profanity", operator: "==", value: false },
    {
      operator: "OR",
      operands: [
        { field: "author_reputation", operator: ">", value: 50 },
        { field: "post_word_count", operator: ">", value: 20 }
      ]
    }
  ]
};
```

---

## Browser & Node.js

### Node.js

```ts
import { safeValidateRule, evaluate } from "@qarar/sdk";

const rule = { field: "age", operator: ">=", value: 18 };
const result = evaluate(rule, { age: 25 });
console.log(result.passed);
```

### Browser (ES Module)

```ts
import { safeValidateRule, evaluate } from "@qarar/sdk";

const rule = { field: "age", operator: ">=", value: 18 };
const result = evaluate(rule, { age: 25 });
console.log(result.passed);
```

### Browser (UMD/Global)

```html
<script src="https://unpkg.com/@qarar/sdk@latest/dist/index.umd.js"></script>
<script>
  const { safeValidateRule, evaluate } = window.Qarar;
  
  const rule = { field: "age", operator: ">=", value: 18 };
  const result = evaluate(rule, { age: 25 });
  console.log(result.passed);
</script>
```

---

## Performance

Qarar is designed for **production** use:

- **Lightweight**: Pure JavaScript, minimal dependencies
- **Zero external dependencies** (browser-safe): Only `zod` for validation
- **Fast evaluation**: No I/O, no external calls—pure local computation
- **Scalable**: Immutable, garbage-collectible trace objects
- **No memory leaks**: Safe for long-running processes

For production benchmarks and performance tuning, test with your actual rule complexity and data volume.

---

## Troubleshooting

### Validation Error: "Unknown operator"

**Problem:**
```
ZodError: field operator: invalid literal value 'betweeen'
```

**Solution:** Check for typos. Valid operators: `==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `notIn`, `contains`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty`.

### Rule Evaluation Returns Unexpected Result

**Problem:** A condition you expected to fail actually passed.

**Solution:** Inspect the full trace:
```ts
console.log(JSON.stringify(result.trace, null, 2));
```

Check the `actual` value against your `expected` value. This usually reveals data type mismatches (e.g., `"25"` vs `25`).

### Missing Field in Data

**Problem:** A rule references `user.role` but input data doesn't have a `role` field.

**Solution:** Qarar treats missing fields as `undefined` and they fail comparisons (except `isEmpty` which passes). Always validate that input data has all required fields:

```ts
const rule = { field: "role", operator: "==", value: "admin" };
const data = {}; // Missing 'role'
const result = evaluate(rule, data);
console.log(result.passed); // false (undefined != "admin")
```

---
