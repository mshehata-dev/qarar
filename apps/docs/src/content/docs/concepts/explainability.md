---
title: Explainability & Execution Traces
description: How Qarar records execution traces and extracts human-readable failure reasons.
---

One of the primary core principles of Qarar is **mandatory explainability**. Non-technical teams and customer support agents should immediately understand why a decision was made without inspecting backend application logs.

## Execution Traces (`TraceEntry`)

When calling `evaluate(rule, data)` or `checkRule(rule, data)`, Qarar records a full execution trace tree:

```ts
const { result, trace } = evaluate(rule, data);
```

The trace captures:
- Exact field paths evaluated (`customer.age`)
- Actual runtime values resolved (`16`)
- Expected values or thresholds (`18`)
- Pass/Fail state of every condition node.

## Extracting Human Reasons (`explainFailures`)

Convert evaluation traces into plain-English reasons for support UI displays or audit logs:

```ts
import { explainFailures } from "@qarar/sdk";

const reasons = explainFailures(trace);
console.log(reasons);
// Output: [ "customer.age: 16 is not >= 18" ]
```
