---
title: Next.js App Router Integration
description: How to use Qarar in Next.js Server Actions, Route Handlers, and Middleware.
---

Qarar runs seamlessly in Next.js 14/15 App Router applications on server components, route handlers, and server actions.

## Server Action Example

Use `checkRule` inside a Next.js Server Action to validate eligibility before processing business transactions:

```ts
// app/actions/checkout.ts
"use server";

import { checkRule, rule } from "@qarar/sdk";

const discountRule = rule("VIP Discount Check")
  .where("customer.age").gte(18)
  .and("customer.plan").in(["vip", "premium"])
  .build();

export async function processCheckoutAction(formData: FormData) {
  const customer = {
    age: Number(formData.get("age")),
    plan: String(formData.get("plan")),
  };

  const check = checkRule(discountRule, { customer });

  if (!check.result) {
    return {
      success: false,
      reasons: check.reasons,
    };
  }

  // Process checkout logic...
  return { success: true };
}
```

## Route Handler Example

Use `compileToSQL` inside a Next.js API Route Handler to fetch only qualified records from PostgreSQL:

```ts
// app/api/eligible-users/route.ts
import { NextResponse } from "next/server";
import { compileToSQL, rule } from "@qarar/sdk";
import { db } from "@/lib/db";

const promoRule = rule("Active Promo Gate")
  .where("user.status").eq("active")
  .and("user.points").gte(500)
  .build();

export async function GET() {
  const { sql } = compileToSQL(promoRule, { columnStyle: "snake" });
  
  // Database pushdown query
  const users = await db.query(`SELECT * FROM users WHERE ${sql}`);

  return NextResponse.json({ users });
}
```
