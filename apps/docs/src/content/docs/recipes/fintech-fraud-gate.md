---
title: FinTech Risk & Fraud Assessment Recipe
description: Multi-condition risk scoring and transaction flagging with audit reasons.
---

FinTech apps require strict risk assessment rules that can be audited by compliance officers.

## Recipe Code

```ts
import { rule, checkRule } from "@qarar/sdk";

const riskRule = rule("High Value Fraud Gate")
  .id("risk-gate-001")
  .where("transaction.amount").gt(10000)
  .and(
    rule()
      .where("user.isVerified").eq(false)
      .or("transaction.ipCountry").in(["XX", "YY"])
      .buildNode()
  )
  .build();

// Test suspicious transaction
const suspiciousTx = {
  transaction: { amount: 15000, ipCountry: "XX" },
  user: { isVerified: false },
};

const check = checkRule(riskRule, suspiciousTx);

if (check.result) {
  console.log("FLAG FOR MANUAL REVIEW! Reasons:", check.reasons);
}
```
