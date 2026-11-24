/**
 * Standardized benchmark rules and decision tables representing real-world production use cases.
 */

import { rule, switchRule, type Rule, type DecisionTable } from "@qarar/sdk";

// ---------------------------------------------------------------------------
// 1. E-Commerce Rules
// ---------------------------------------------------------------------------

export const ecommerceSimpleRule: Rule = rule("E-Commerce Simple Age Gate")
  .id("ecom_simple_v1")
  .where("customer.age")
  .gte(18)
  .build();

export const ecommerceMediumRule: Rule = rule("VIP Discount Eligibility")
  .id("ecom_medium_v1")
  .where("customer.age")
  .gte(18)
  .and("customer.tier")
  .in(["vip", "platinum"])
  .and("cart.total")
  .gte(100)
  .build();

export const ecommerceComplexRule: Rule = rule("Omnichannel Promo Eligibility")
  .id("ecom_complex_v1")
  .where("customer.age")
  .gte(21)
  .and("customer.tier")
  .in(["vip", "platinum"])
  .and("cart.total")
  .gte(150)
  .and("cart.itemCount")
  .lte(10)
  .or(
    rule()
      .where("customer.loyaltyPoints")
      .gte(1500)
      .and("order.channel")
      .in(["mobile", "app"])
      .and("cart.hasCoupon")
      .eq(true)
  )
  .build();

// ---------------------------------------------------------------------------
// 2. FinTech Fraud Rules
// ---------------------------------------------------------------------------

export const fintechFraudRule: Rule = rule("High Risk Fraud Shield")
  .id("fintech_fraud_v1")
  .where("risk.score")
  .gte(650)
  .or(
    rule()
      .where("transaction.amount")
      .gte(5000)
      .and("risk.isNewDevice")
      .eq(true)
  )
  .or(
    rule()
      .where("transaction.velocityCount24h")
      .gte(10)
      .and("user.kycLevel")
      .eq("tier0")
  )
  .build();

// ---------------------------------------------------------------------------
// 3. Healthcare Authorization Rules
// ---------------------------------------------------------------------------

export const healthcareConsentRule: Rule = rule("HIPAA Consent & Claim Auth")
  .id("healthcare_consent_v1")
  .where("patient.consentSigned")
  .eq(true)
  .and("patient.hipaaAcknowledged")
  .eq(true)
  .and(
    rule()
      .where("claim.isPreAuthorized")
      .eq(true)
      .or(
        rule()
          .where("claim.serviceType")
          .eq("emergency")
      )
  )
  .build();

// ---------------------------------------------------------------------------
// 4. Decision Tables (10 & 50 Branches)
// ---------------------------------------------------------------------------

export function createPricingTable(branchCount: number = 10): DecisionTable<{ discount: number; freeShipping: boolean }> {
  let builder = switchRule<{ discount: number; freeShipping: boolean }>(`Tiered Pricing (${branchCount} branches)`)
    .id(`pricing_table_${branchCount}`)
    .default({ discount: 0, freeShipping: false });

  for (let i = 1; i <= branchCount; i++) {
    const minSpend = i * 20;
    const discount = Math.min(50, Math.floor(i * 1.5));
    const tier = i % 4 === 0 ? "platinum" : i % 3 === 0 ? "vip" : i % 2 === 0 ? "member" : "guest";

    builder = builder.case(
      `tier_branch_${i}`,
      rule()
        .where("cart.total")
        .gte(minSpend)
        .and("customer.tier")
        .eq(tier)
    ).then({ discount, freeShipping: i >= 5 });
  }

  return builder.build();
}

export const decisionTable10 = createPricingTable(10);
export const decisionTable50 = createPricingTable(50);

// ---------------------------------------------------------------------------
// 5. Array, Date, and Dynamic Field Rules (Stress Test Targets)
// ---------------------------------------------------------------------------

export const arrayOperationsRule: Rule = rule("Array Operations Rule")
  .id("array_ops_v1")
  .where("cart.categories")
  .arrayContains("electronics")
  .and("cart.categories")
  .arrayLengthGte(2)
  .build();

export const dateOperationsRule: Rule = rule("Date Window Operations Rule")
  .id("date_ops_v1")
  .where("order.createdAt")
  .withinLast("30 days")
  .and("user.registeredAt")
  .olderThan("90 days")
  .build();

export const dynamicFieldRule: Rule = rule("Dynamic Two-Sided Field Rule")
  .id("dynamic_field_v1")
  .where("cart.total")
  .lte("{{customer.creditLimit}}")
  .and("cart.itemCount")
  .lte("{{customer.maxItems}}")
  .build();

