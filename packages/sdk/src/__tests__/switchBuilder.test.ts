import { describe, it, expect } from "vitest";
import { switchRule, checkDecisionTable, rule, where } from "../index.js";

describe("switchRule & checkDecisionTable (Switch Case Replacement)", () => {
  interface PricingConfig {
    discountPercent: number;
    freeShipping: boolean;
    tierLabel: string;
  }

  const pricingSwitch = switchRule<PricingConfig>("Pricing Matrix")
    .id("pricing-matrix-v1")
    .description("Replaces hardcoded switch(tier) statement with dynamic decision table")
    .case("vip-tier", rule().where("customer.tier").eq("vip").and("cart.total").gte(200))
      .then({ discountPercent: 25, freeShipping: true, tierLabel: "VIP Platinum" })
    .case("gold-tier", where("customer.tier").eq("gold"))
      .then({ discountPercent: 15, freeShipping: true, tierLabel: "Gold" })
    .case("silver-tier", where("customer.tier").eq("silver"))
      .then({ discountPercent: 10, freeShipping: false, tierLabel: "Silver" })
    .default({ discountPercent: 0, freeShipping: false, tierLabel: "Standard" })
    .build();

  it("builds a valid DecisionTable AST object", () => {
    expect(pricingSwitch.id).toBe("pricing-matrix-v1");
    expect(pricingSwitch.branches).toHaveLength(3);
    expect(pricingSwitch.defaultOutput).toEqual({
      discountPercent: 0,
      freeShipping: false,
      tierLabel: "Standard",
    });
  });

  it("evaluates VIP case correctly", () => {
    const payload = {
      customer: { tier: "vip" },
      cart: { total: 250 },
    };

    const decision = checkDecisionTable<PricingConfig>(pricingSwitch, payload);

    expect(decision.ok).toBe(true);
    expect(decision.matched).toBe(true);
    expect(decision.matchedBranch?.id).toBe("vip-tier");
    expect(decision.output).toEqual({
      discountPercent: 25,
      freeShipping: true,
      tierLabel: "VIP Platinum",
    });
  });

  it("evaluates Gold case correctly", () => {
    const payload = {
      customer: { tier: "gold" },
      cart: { total: 50 },
    };

    const decision = checkDecisionTable<PricingConfig>(pricingSwitch, payload);

    expect(decision.matchedBranch?.id).toBe("gold-tier");
    expect(decision.output.discountPercent).toBe(15);
  });

  it("returns default output when no case matches", () => {
    const payload = {
      customer: { tier: "bronze" },
      cart: { total: 20 },
    };

    const decision = checkDecisionTable<PricingConfig>(pricingSwitch, payload);

    expect(decision.matched).toBe(false);
    expect(decision.matchedBranch).toBeNull();
    expect(decision.output).toEqual({
      discountPercent: 0,
      freeShipping: false,
      tierLabel: "Standard",
    });
  });
});
