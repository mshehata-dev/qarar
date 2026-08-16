import { describe, it, expect } from "vitest";
import { validateDecisionTable, DecisionTable } from "../index.ts";

describe("DecisionTable Schema Validation", () => {
  it("validates a valid decision table", () => {
    const table: DecisionTable<string> = {
      id: "switch-tier",
      name: "Customer Tier Switch",
      version: "1",
      mode: "first",
      defaultOutput: "STANDARD",
      branches: [
        {
          id: "b1",
          name: "VIP Branch",
          condition: {
            type: "eq",
            left: { type: "field", path: "tier" },
            right: { type: "string", value: "vip" },
          },
          output: "VIP_PROMO",
        },
      ],
    };

    const validated = validateDecisionTable(table);
    expect(validated.id).toBe("switch-tier");
    expect(validated.branches).toHaveLength(1);
    expect(validated.defaultOutput).toBe("STANDARD");
  });

  it("throws on missing required fields", () => {
    expect(() => validateDecisionTable({ id: "invalid" })).toThrow();
  });
});
