---
title: SaaS Feature Gating & Entitlements Recipe
description: Enforce subscription plan tier limits and seat count checks.
---

Control feature access dynamically based on customer plan tier and usage limits.

## Recipe Code

```ts
import { rule, checkRule } from "@qarar/sdk";

const analyticsEntitlement = rule("Advanced Analytics Access")
  .id("feature-analytics")
  .where("user.role").eq("admin")
  .or(
    rule()
      .where("account.plan").in(["pro", "enterprise"])
      .and("account.seats").lte(50)
      .buildNode()
  )
  .build();

const userContext = {
  user: { role: "member" },
  account: { plan: "pro", seats: 20 },
};

const check = checkRule(analyticsEntitlement, userContext);
console.log("Can access analytics:", check.result); // true
```
