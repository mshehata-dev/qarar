---
title: E-Commerce Promotional Discount Recipe
description: How to build dynamic promotional discount rules and push them to database queries.
---

In e-commerce platforms, discount rules change frequently based on campaigns, holidays, and marketing promotions.

## Recipe Code

```ts
import { rule, checkRule, compileToSQL } from "@qarar/sdk";

// 1. Build discount rule
const promoRule = rule("Black Friday VIP Discount")
  .id("promo-bf-2026")
  .where("cart.total").gte(100)
  .and("user.tier").in(["vip", "gold"])
  .and("user.country").neq("RESTRICTED_REGION")
  .build();

// 2. Filter target database users in SQL
const { sql } = compileToSQL(promoRule, { columnStyle: "snake" });
console.log(`SELECT * FROM users WHERE ${sql}`);

// 3. Evaluate cart checkout payload
const cartPayload = {
  cart: { total: 150 },
  user: { tier: "vip", country: "US" },
};

const decision = checkRule(promoRule, cartPayload);
if (decision.result) {
  console.log("Apply 20% discount!");
}
```
