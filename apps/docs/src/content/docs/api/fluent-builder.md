---
title: Fluent Rule Builder API
description: Construct valid Qarar AST JSON objects programmatically using fluent chainable methods.
---

The `rule()` API allows developers to construct type-safe Qarar JSON AST rules without writing raw JSON AST nodes by hand.

## `rule(nameOrId?: string)`

Starts a top-level rule builder chain:

```ts
import { rule } from "@qarar/sdk";

const myRule = rule("Customer Eligibility Gate")
  .id("rule-101")
  .description("Check user age and subscription tier")
  .where("customer.age").gte(18)
  .and("customer.plan").in(["vip", "premium"])
  .build();
```

## Methods

- `.id(id: string)`: Set rule ID.
- `.name(name: string)`: Set human readable rule name.
- `.description(desc: string)`: Set optional description string.
- `.version(ver: string)`: Set rule version string (default `"1"`).
- `.where(fieldPath | conditionNode)`: Add initial condition to root logic gate.
- `.and(fieldPath | conditionNode)`: Add condition combined via `AND`.
- `.or(fieldPath | conditionNode)`: Add condition combined via `OR`.
- `.not(conditionNode)`: Add inverted condition.
- `.build()`: Validates and returns top-level `Rule` object.
- `.buildNode()`: Returns underlying `RuleNode` (useful for nesting sub-groups).
