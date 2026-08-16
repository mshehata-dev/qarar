---
title: "Quickstart: Zero-Deploy JSON Rules"
description: "Store business rules as JSON, fetch them dynamically, and update logic without redeploying code."
---

The core goal of Qarar is **Zero-Deploy Business Logic**: allowing business rules to be updated on the fly in JSON without modifying source code or triggering server deployments.

```text
  ┌────────────────────────┐      ┌────────────────────────┐
  │  Database / API / CMS  │      │   Your Application     │
  │                        │      │                        │
  │  [JSON Rule Definition]├─────►│  checkRule(rule, data) │
  └────────────────────────┘      └────────────────────────┘
```

---

## 1. Define Rule as Dynamic JSON AST

Save your business rule as a JSON definition in your database (Postgres, MongoDB, Redis) or CMS:

```json
{
  "id": "promo-summer-2026",
  "name": "Summer Promotion Gate",
  "version": "1",
  "root": {
    "type": "and",
    "conditions": [
      {
        "type": "gte",
        "left": { "type": "field", "path": "customer.age" },
        "right": { "type": "number", "value": 18 }
      },
      {
        "type": "in",
        "left": { "type": "field", "path": "customer.plan" },
        "right": {
          "type": "array",
          "values": [
            { "type": "string", "value": "vip" },
            { "type": "string", "value": "premium" }
          ]
        }
      }
    ]
  }
}
```

---

## 2. Execute JSON Rule Dynamically

Fetch the JSON rule from your database at runtime and pass it to `checkRule`:

```ts
import { checkRule } from "@qarar/sdk";

// Fetch JSON rule dynamically from DB or API
const ruleJSON = await db.rules.findUnique({ where: { id: "promo-summer-2026" } });

// Input payload to test
const payload = {
  customer: { age: 24, plan: "premium" },
};

// Evaluate dynamic JSON rule
const check = checkRule(ruleJSON, payload);

console.log(check.result); // true | false
```

---

## 3. Update Rule Logic Without Code Deployment

When your Product or Risk team changes the rule in your database or Admin UI (e.g. lowering required age to 16 or adding `"gold"` plan):

1. The JSON record in the database is updated.
2. The next API request automatically uses the new JSON rule.
3. **Zero code changes. Zero Git commits. Zero deployment pipeline waits.**

---

## 4. (Optional) Programmatic Generation

If you need seed scripts or developer utilities to generate valid JSON ASTs programmatically, use the `rule()` builder API:

```ts
import { rule } from "@qarar/sdk";

// Generates valid JSON AST object to store in DB
const jsonToSave = rule("Summer Promo")
  .where("customer.age").gte(18)
  .and("customer.plan").in(["vip", "premium"])
  .build();

await db.rules.save(jsonToSave);
```
