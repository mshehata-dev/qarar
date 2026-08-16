---
title: Schema Validation API (createQarar)
description: Bind Qarar to Zod domain schemas to enforce payload data validation before rule execution.
---

## `createQarar(zodSchema)`

Creates a schema-bound Qarar instance that validates input data payloads against a Zod schema before executing decision rules:

```ts
import { z } from "zod";
import { createQarar } from "@qarar/sdk";

const CustomerSchema = z.object({
  customer: z.object({
    age: z.number(),
    plan: z.enum(["basic", "vip", "premium"]),
  }),
});

const q = createQarar(CustomerSchema);

// Build rule
const myRule = q.rule("Schema Bound Rule")
  .where("customer.age").gte(18)
  .build();

// Evaluate payload with data validation
const check = q.check(myRule, payload);

if (!check.ok) {
  console.log("Data validation error:", check.reasons);
}
```
