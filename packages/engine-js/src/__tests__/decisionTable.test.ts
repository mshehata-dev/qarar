import { describe, it, expect } from "vitest";
import { DecisionTable } from "@qarar/spec";
import { evaluateDecisionTable } from "../index.js";

describe("evaluateDecisionTable", () => {
  interface PricingOutput {
    discountPercent: number;
    tier: string;
  }

  const table: DecisionTable<PricingOutput> = {
    id: "pricing-switch",
    name: "Pricing Tier Switch",
    version: "1",
    mode: "first",
    defaultOutput: { discountPercent: 0, tier: "Standard" },
    branches: [
      {
        id: "vip-branch",
        name: "VIP Branch",
        condition: {
          type: "and",
          conditions: [
            {
              type: "eq",
              left: { type: "field", path: "customer.tier" },
              right: { type: "string", value: "vip" },
            },
            {
              type: "gte",
              left: { type: "field", path: "cart.total" },
              right: { type: "number", value: 200 },
            },
          ],
        },
        output: { discountPercent: 25, tier: "VIP Gold" },
      },
      {
        id: "gold-branch",
        name: "Gold Branch",
        condition: {
          type: "eq",
          left: { type: "field", path: "customer.tier" },
          right: { type: "string", value: "gold" },
        },
        output: { discountPercent: 15, tier: "Gold" },
      },
    ],
  };

  it("evaluates first matching branch successfully", () => {
    const data = {
      customer: { tier: "vip" },
      cart: { total: 250 },
    };

    const res = evaluateDecisionTable(table, data);
    expect(res.matched).toBe(true);
    expect(res.matchedBranch?.id).toBe("vip-branch");
    expect(res.output).toEqual({ discountPercent: 25, tier: "VIP Gold" });
  });

  it("falls through to second branch when first branch fails", () => {
    const data = {
      customer: { tier: "gold" },
      cart: { total: 50 },
    };

    const res = evaluateDecisionTable(table, data);
    expect(res.matched).toBe(true);
    expect(res.matchedBranch?.id).toBe("gold-branch");
    expect(res.output).toEqual({ discountPercent: 15, tier: "Gold" });
  });

  it("returns defaultOutput when no branches match", () => {
    const data = {
      customer: { tier: "regular" },
      cart: { total: 50 },
    };

    const res = evaluateDecisionTable(table, data);
    expect(res.matched).toBe(false);
    expect(res.matchedBranch).toBeNull();
    expect(res.output).toEqual({ discountPercent: 0, tier: "Standard" });
  });
});
