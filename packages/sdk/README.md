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
7. [Rule Syntax](#rule-syntax)
8. [Examples](#examples)
9. [Browser & Node.js](#browser--nodejs)
10. [Performance](#performance)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

```ts
import { safeValidateRule, evaluate, explainFailures } from "@qarar/sdk";

// Define a rule: age >= 18 AND credit_score >= 650
const rule = {
  type: "and",
  conditions: [
    {
      type: "gte",
      left: { type: "field", path: "age" },
      right: { type: "number", value: 18 }
    },
    {
      type: "gte",
      left: { type: "field", path: "credit_score" },
      right: { type: "number", value: 650 }
    }
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

### Conditions & Operators

Rules evaluate **conditions** using **comparison operators**:
- `eq`: Equals
- `neq`: Not equals
- `gt`, `gte`, `lt`, `lte`: Numeric comparisons
- `in`: Value in array
- `notIn`: Value not in array
- `contains`, `notContains`: String substring
- `startsWith`, `endsWith`: String prefix/suffix
- `matches`, `notMatches`: Regex patterns
- `isNull`, `isNotNull`: Nullability checks
- `between`: Value between min and max

### Boolean Logic

Rules support combining conditions with boolean operators:
- `and`: All conditions must pass
- `or`: At least one condition must pass
- `not`: Invert a condition

Operators can be nested to arbitrary depth for complex logic.

### Explainability

Every rule evaluation produces a **trace** showing:
- Which conditions passed/failed
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
  type: "eq",
  left: { type: "field", path: "status" },
  right: { type: "string", value: "active" }
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
  type: "and",
  conditions: [
    {
      type: "gte",
      left: { type: "field", path: "age" },
      right: { type: "number", value: 18 }
    },
    {
      type: "eq",
      left: { type: "field", path: "status" },
      right: { type: "string", value: "active" }
    }
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
//   trace: { type: "and", conditions: [...], passed: true }
// }
```

### 3. Understand Failures

```ts
import { explainFailures } from "@qarar/sdk";

const rule = {
  type: "and",
  conditions: [
    {
      type: "gte",
      left: { type: "field", path: "age" },
      right: { type: "number", value: 18 }
    },
    {
      type: "gte",
      left: { type: "field", path: "credit_score" },
      right: { type: "number", value: 700 }
    }
  ]
};

const result = evaluate(rule, {
  age: 16,
  credit_score: 650
});

// result.passed === false

const reasons = explainFailures(result.trace);
console.log(reasons);
// Output explains which conditions failed
```

---

## Advanced Usage

### Nested Logic (OR inside AND)

```ts
const rule = {
  type: "and",
  conditions: [
    // Condition 1: Age check
    {
      type: "gte",
      left: { type: "field", path: "age" },
      right: { type: "number", value: 18 }
    },
    // Condition 2: Credit check OR income check
    {
      type: "or",
      conditions: [
        {
          type: "gte",
          left: { type: "field", path: "credit_score" },
          right: { type: "number", value: 700 }
        },
        {
          type: "gte",
          left: { type: "field", path: "annual_income" },
          right: { type: "number", value: 50000 }
        }
      ]
    },
    // Condition 3: NOT flagged for fraud
    {
      type: "not",
      condition: {
        type: "eq",
        left: { type: "field", path: "fraud_flag" },
        right: { type: "boolean", value: true }
      }
    }
  ]
};
```

### Array Operations

```ts
const rule = {
  type: "and",
  conditions: [
    {
      type: "in",
      left: { type: "field", path: "status" },
      right: {
        type: "array",
        values: [
          { type: "string", value: "active" },
          { type: "string", value: "pending" },
          { type: "string", value: "review" }
        ]
      }
    },
    {
      type: "notIn",
      left: { type: "field", path: "country" },
      right: {
        type: "array",
        values: [
          { type: "string", value: "US" },
          { type: "string", value: "UK" },
          { type: "string", value: "CA" }
        ]
      }
    }
  ]
};
```

### String Operations

```ts
const rule = {
  type: "and",
  conditions: [
    {
      type: "endsWith",
      left: { type: "field", path: "email" },
      right: { type: "string", value: "@company.com" }
    },
    {
      type: "startsWith",
      left: { type: "field", path: "username" },
      right: { type: "string", value: "admin_" }
    },
    {
      type: "contains",
      left: { type: "field", path: "name" },
      right: { type: "string", value: "John" }
    }
  ]
};
```

### Between Check

```ts
const rule = {
  type: "between",
  left: { type: "field", path: "age" },
  min: { type: "number", value: 18 },
  max: { type: "number", value: 65 }
};
```

### Full Trace Inspection

```ts
const result = evaluate(rule, data);

console.log(JSON.stringify(result.trace, null, 2));
// {
//   "type": "and",
//   "conditions": [
//     {
//       "type": "gte",
//       "left": { "type": "field", "path": "age", "actual": 25 },
//       "right": { "type": "number", "value": 18 },
//       "passed": true
//     },
//     {
//       "type": "eq",
//       "left": { "type": "field", "path": "status", "actual": "inactive" },
//       "right": { "type": "string", "value": "active" },
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
  trace: RuleTrace
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
- `trace`: RuleTrace object (from `evaluate()`)

**Returns:**
- `string[]` - Array of failure messages

**Example:**
```ts
const reasons = explainFailures(result.trace);
reasons.forEach(reason => console.log("• " + reason));
```

---

### `explain(trace, includePass?)`

Lower-level API for custom trace analysis.

**Parameters:**
- `trace`: RuleTrace object
- `includePass`: boolean (default: false) - include passing conditions in output

**Returns:**
- `string[]` - Array of explanation strings

---

## Rule Syntax

All rules are JSON objects describing comparisons or boolean logic.

### Comparison Rules

Compare a left-side value against a right-side value:

```json
{
  "type": "gte",
  "left": { "type": "field", "path": "age" },
  "right": { "type": "number", "value": 18 }
}
```

Valid comparison types: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `contains`, `notContains`, `startsWith`, `endsWith`, `matches`, `notMatches`, `isNull`, `isNotNull`

### AND Rule

All conditions must pass:

```json
{
  "type": "and",
  "conditions": [
    { "type": "eq", "left": {...}, "right": {...} },
    { "type": "gte", "left": {...}, "right": {...} }
  ]
}
```

### OR Rule

At least one condition must pass:

```json
{
  "type": "or",
  "conditions": [
    { "type": "eq", "left": {...}, "right": {...} },
    { "type": "eq", "left": {...}, "right": {...} }
  ]
}
```

### NOT Rule

Inverts a condition:

```json
{
  "type": "not",
  "condition": { "type": "eq", "left": {...}, "right": {...} }
}
```

### Values

- Field: `{ "type": "field", "path": "user.age" }`
- String: `{ "type": "string", "value": "active" }`
- Number: `{ "type": "number", "value": 42 }`
- Boolean: `{ "type": "boolean", "value": true }`
- Null: `{ "type": "null" }`
- Array: `{ "type": "array", "values": [{ "type": "string", "value": "a" }, ...] }`

---

## Examples

### Loan Eligibility

```ts
const loanRule = {
  type: "and",
  conditions: [
    {
      type: "gte",
      left: { type: "field", path: "age" },
      right: { type: "number", value: 18 }
    },
    {
      type: "eq",
      left: { type: "field", path: "employment_status" },
      right: { type: "string", value: "employed" }
    },
    {
      type: "or",
      conditions: [
        {
          type: "gte",
          left: { type: "field", path: "credit_score" },
          right: { type: "number", value: 650 }
        },
        {
          type: "gte",
          left: { type: "field", path: "annual_income" },
          right: { type: "number", value: 75000 }
        }
      ]
    },
    {
      type: "eq",
      left: { type: "field", path: "bankruptcy_history" },
      right: { type: "boolean", value: false }
    }
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
  type: "and",
  conditions: [
    {
      type: "in",
      left: { type: "field", path: "country" },
      right: {
        type: "array",
        values: [
          { type: "string", value: "US" },
          { type: "string", value: "CA" },
          { type: "string", value: "MX" }
        ]
      }
    },
    {
      type: "notIn",
      left: { type: "field", path: "state" },
      right: {
        type: "array",
        values: [
          { type: "string", value: "AK" },
          { type: "string", value: "HI" }
        ]
      }
    }
  ]
};

const user = { country: "US", state: "CA" };
const result = evaluate(geoRule, user);
```

### Feature Flag with Complex Logic

```ts
const featureFlagRule = {
  type: "or",
  conditions: [
    {
      type: "eq",
      left: { type: "field", path: "user_group" },
      right: { type: "string", value: "beta_tester" }
    },
    {
      type: "and",
      conditions: [
        {
          type: "gte",
          left: { type: "field", path: "account_age_days" },
          right: { type: "number", value: 90 }
        },
        {
          type: "gte",
          left: { type: "field", path: "monthly_active_sessions" },
          right: { type: "number", value: 10 }
        }
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

const rule = {
  type: "gte",
  left: { type: "field", path: "age" },
  right: { type: "number", value: 18 }
};
const result = evaluate(rule, { age: 25 });
console.log(result.passed);
```

### Browser (ES Module)

```ts
import { safeValidateRule, evaluate } from "@qarar/sdk";

const rule = {
  type: "gte",
  left: { type: "field", path: "age" },
  right: { type: "number", value: 18 }
};
const result = evaluate(rule, { age: 25 });
console.log(result.passed);
```

### Browser (UMD/Global)

```html
<script src="https://unpkg.com/@qarar/sdk@latest/dist/index.umd.js"></script>
<script>
  const { safeValidateRule, evaluate } = window.Qarar;
  
  const rule = {
    type: "gte",
    left: { type: "field", path: "age" },
    right: { type: "number", value: 18 }
  };
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

### Validation Error: "Unknown type"

**Problem:**
```
ZodError: Invalid discriminator value. Expected ...
```

**Solution:** Check the `type` field. Valid types: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `contains`, `startsWith`, `endsWith`, `matches`, `between`, `and`, `or`, `not`.

### Rule Evaluation Returns Unexpected Result

**Problem:** A condition you expected to fail actually passed.

**Solution:** Inspect the full trace:
```ts
console.log(JSON.stringify(result.trace, null, 2));
```

Check the `actual` value from the trace against your `right` value. This usually reveals data type mismatches (e.g., `"25"` vs `25`).

### Missing Field in Data

**Problem:** A rule references `user.age` but input data doesn't have an `age` field.

**Solution:** Qarar treats missing fields as `null`. Use `isNull` or `isNotNull` operators to check for missing fields:

```ts
const rule = {
  type: "isNotNull",
  left: { type: "field", path: "email" }
};

const data = {}; // Missing 'email'
const result = evaluate(rule, data);
console.log(result.passed); // false (missing field is treated as null)
```

---
