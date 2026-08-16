---
title: "Decision Tables & Dynamic Switch Cases"
description: "Replace hardcoded if/else statements and switch cases with dynamic, JSON-configurable decision matrices."
---

Real-world business systems frequently need to compute dynamic outputs or actions based on complex rules (e.g. dynamic pricing tiers, risk routing, discount matrix, feature entitlement allocation).

Instead of hardcoding `switch(tier)` statements or `if ... else if` chains in TypeScript, Qarar provides **Decision Tables (`switchRule`)**.

```text
                               Input Payload
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │     DecisionTable      │
                        │ (Dynamic JSON Switch)  │
                        └───────────┬────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
 Case 1: VIP Tier             Case 2: Gold Tier            Default Case
 🟢 MATCHED                   ⚪ Skipped                   ⚪ Skipped
 ➔ Output:                    ➔ Output:                    ➔ Output:
   { discount: 25,              { discount: 15,              { discount: 0,
     freeShipping: true }         freeShipping: true }         freeShipping: false }
```

---

## 1. JSON Decision Table AST Format

Store your switch-case matrix in PostgreSQL, MongoDB, or Redis as a JSON definition:

```json
{
  "id": "pricing-tier-matrix",
  "name": "Customer Pricing Matrix",
  "version": "1",
  "mode": "first",
  "defaultOutput": {
    "discountPercent": 0,
    "freeShipping": false,
    "tierLabel": "Standard"
  },
  "branches": [
    {
      "id": "vip-branch",
      "name": "VIP Platinum",
      "condition": {
        "type": "and",
        "conditions": [
          {
            "type": "eq",
            "left": { "type": "field", "path": "customer.tier" },
            "right": { "type": "string", "value": "vip" }
          },
          {
            "type": "gte",
            "left": { "type": "field", "path": "cart.total" },
            "right": { "type": "number", "value": 200 }
          }
        ]
      },
      "output": {
        "discountPercent": 25,
        "freeShipping": true,
        "tierLabel": "VIP Platinum"
      }
    },
    {
      "id": "gold-branch",
      "name": "Gold Tier",
      "condition": {
        "type": "eq",
        "left": { "type": "field", "path": "customer.tier" },
        "right": { "type": "string", "value": "gold" }
      },
      "output": {
        "discountPercent": 15,
        "freeShipping": true,
        "tierLabel": "Gold"
      }
    }
  ]
}
```

---

## 2. Dynamic Execution (`checkDecisionTable`)

Pass your JSON Decision Table and input data payload to `checkDecisionTable`:

```ts
import { checkDecisionTable } from "@qarar/sdk";

interface PricingOutput {
  discountPercent: number;
  freeShipping: boolean;
  tierLabel: string;
}

// Fetch JSON DecisionTable from DB/Cache at runtime
const decisionTable = await db.decisionTables.findUnique({ where: { id: "pricing-tier-matrix" } });

const payload = {
  customer: { tier: "vip" },
  cart: { total: 250 },
};

// Evaluate dynamic switch-case matrix
const decision = checkDecisionTable<PricingOutput>(decisionTable, payload);

console.log(decision.matched); // true
console.log(decision.matchedBranch?.id); // "vip-branch"
console.log(decision.output);
// Output: { discountPercent: 25, freeShipping: true, tierLabel: "VIP Platinum" }
```

---

## 3. Fluent Builder API (`switchRule`)

Build type-safe Decision Table ASTs programmatically:

```ts
import { switchRule, rule, where } from "@qarar/sdk";

const pricingMatrix = switchRule<PricingOutput>("Pricing Matrix")
  .id("pricing-matrix-v1")
  .case("vip-tier", rule().where("customer.tier").eq("vip").and("cart.total").gte(200))
    .then({ discountPercent: 25, freeShipping: true, tierLabel: "VIP Platinum" })
  .case("gold-tier", where("customer.tier").eq("gold"))
    .then({ discountPercent: 15, freeShipping: true, tierLabel: "Gold" })
  .default({ discountPercent: 0, freeShipping: false, tierLabel: "Standard" })
  .build();
```
