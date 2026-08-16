---
title: Engine & checkRule API
description: Evaluate rule decision logic, extract failure reasons, and compile high-performance evaluation functions.
---

## `checkRule(rule, data, options?)`

One-shot rule checker that validates, evaluates, and explains decisions in a single call:

```ts
import { checkRule } from "@qarar/sdk";

const check = checkRule(rule, data);

if (!check.result) {
  console.log("Failed because:", check.reasons);
}
```

## `compileRule(rule)`

Pre-validates rule AST once on app initialization and returns a reusable evaluation function `(data) => EvaluationResult`:

```ts
import { compileRule } from "@qarar/sdk";

const isEligible = compileRule(rule);

// Fast evaluation with zero AST re-parsing overhead
const result = isEligible(customerData);
```

## `evaluate(rule, data)`

Runs decision evaluation against data payload and returns raw trace entries:

```ts
import { evaluate } from "@qarar/sdk";

const { result, trace } = evaluate(rule, data);
```
