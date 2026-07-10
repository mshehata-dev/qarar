/**
 * Built-in example rules for the playground.
 * Each example has a rule AST + matching test data.
 */

export interface Example {
  id: string;
  name: string;
  description: string;
  category: string;
  expectedResult: boolean;
  rule: object;
  data: object;
}

export const EXAMPLES: Example[] = [
  // ── 0. Blank Starter ───────────────────────────────────────────────────────
  {
    id: "blank-starter",
    name: "Blank Starter",
    category: "Start",
    description: "Start from a minimal rule and empty-ish test data, then build your own logic.",
    expectedResult: true,
    rule: {
      id: "blank-starter",
      name: "Blank Starter",
      description: "Minimal starter rule",
      version: "1",
      root: {
        type: "eq",
        left: { type: "field", path: "customer.age" },
        right: { type: "number", value: 0 },
      },
    },
    data: {
      customer: { age: 0 },
    },
  },

  // ── 1. Premium Eligibility ─────────────────────────────────────────────────
  {
    id: "premium-eligibility",
    name: "Premium Eligibility",
    category: "Access",
    description: "Customer must be an adult with a premium plan in an eligible country.",
    expectedResult: false,
    rule: {
      id: "premium-eligibility",
      name: "Premium Eligibility",
      description: "Customer must be adult, on premium plan, in eligible country",
      version: "1",
      root: {
        type: "and",
        conditions: [
          { type: "gt", left: { type: "field", path: "customer.age" }, right: { type: "number", value: 18 } },
          { type: "eq", left: { type: "field", path: "customer.plan" }, right: { type: "string", value: "premium" } },
          { type: "in", left: { type: "field", path: "customer.country" }, right: { type: "array", values: [{ type: "string", value: "EG" }, { type: "string", value: "US" }, { type: "string", value: "GB" }] } },
        ],
      },
    },
    data: {
      customer: { age: 16, plan: "premium", country: "EG" },
    },
  },

  // ── 2. Fraud Detection ─────────────────────────────────────────────────────
  {
    id: "fraud-detection",
    name: "Fraud Detection",
    category: "Risk",
    description: "Flag a transaction as suspicious if the amount is unusually high, the country is high-risk, and the account is not verified.",
    expectedResult: true,
    rule: {
      id: "fraud-detection",
      name: "Suspicious Transaction",
      description: "High-value transaction from high-risk, unverified account",
      version: "1",
      root: {
        type: "and",
        conditions: [
          { type: "gte", left: { type: "field", path: "transaction.amount" }, right: { type: "number", value: 5000 } },
          { type: "in", left: { type: "field", path: "transaction.country" }, right: { type: "array", values: [{ type: "string", value: "XX" }, { type: "string", value: "YY" }, { type: "string", value: "ZZ" }] } },
          { type: "eq", left: { type: "field", path: "account.verified" }, right: { type: "boolean", value: false } },
        ],
      },
    },
    data: {
      transaction: { amount: 7500, country: "XX" },
      account: { verified: false },
    },
  },

  // ── 3. Discount Eligibility ────────────────────────────────────────────────
  {
    id: "discount-eligibility",
    name: "Loyalty Discount",
    category: "Promotions",
    description: "Apply a 20% discount if the customer has gold/platinum tier and order exceeds $100.",
    expectedResult: true,
    rule: {
      id: "discount-eligibility",
      name: "Loyalty Discount",
      description: "Gold/Platinum customers with order total > $100 get 20% off",
      version: "1",
      root: {
        type: "and",
        conditions: [
          { type: "in", left: { type: "field", path: "customer.tier" }, right: { type: "array", values: [{ type: "string", value: "gold" }, { type: "string", value: "platinum" }] } },
          { type: "gt", left: { type: "field", path: "order.total" }, right: { type: "number", value: 100 } },
        ],
      },
    },
    data: {
      customer: { tier: "gold" },
      order: { total: 250 },
    },
  },

  // ── 4. KYC / Age Gate ─────────────────────────────────────────────────────
  {
    id: "age-gate",
    name: "KYC Age Verification",
    category: "Compliance",
    description: "User must be between 18 and 75 years old and have a verified identity.",
    expectedResult: false,
    rule: {
      id: "age-gate",
      name: "KYC Age Verification",
      description: "Working-age adults only, identity verified",
      version: "1",
      root: {
        type: "and",
        conditions: [
          { type: "between", left: { type: "field", path: "user.age" }, min: { type: "number", value: 18 }, max: { type: "number", value: 75 } },
          { type: "eq", left: { type: "field", path: "user.identity_verified" }, right: { type: "boolean", value: true } },
        ],
      },
    },
    data: {
      user: { age: 17, identity_verified: true },
    },
  },

  // ── 5. Email Domain Check ──────────────────────────────────────────────────
  {
    id: "email-domain",
    name: "Corporate Email",
    category: "Access",
    description: "Allow access only to users with a corporate email (not Gmail/Yahoo/Hotmail).",
    expectedResult: false,
    rule: {
      id: "email-domain",
      name: "Corporate Email Required",
      description: "Block free email providers",
      version: "1",
      root: {
        type: "and",
        conditions: [
          { type: "notContains", left: { type: "field", path: "user.email" }, right: { type: "string", value: "gmail.com" } },
          { type: "notContains", left: { type: "field", path: "user.email" }, right: { type: "string", value: "yahoo.com" } },
          { type: "notContains", left: { type: "field", path: "user.email" }, right: { type: "string", value: "hotmail.com" } },
        ],
      },
    },
    data: {
      user: { email: "john@gmail.com" },
    },
  },

  // ── 6. Free Trial Eligibility ──────────────────────────────────────────────
  {
    id: "free-trial",
    name: "Free Trial Eligibility",
    category: "Promotions",
    description: "Offer a free trial only to new users who haven't previously subscribed.",
    expectedResult: true,
    rule: {
      id: "free-trial",
      name: "Free Trial Eligibility",
      description: "New users on the free plan without prior subscription history",
      version: "1",
      root: {
        type: "and",
        conditions: [
          { type: "eq", left: { type: "field", path: "customer.plan" }, right: { type: "string", value: "free" } },
          { type: "eq", left: { type: "field", path: "customer.ever_subscribed" }, right: { type: "boolean", value: false } },
          { type: "lte", left: { type: "field", path: "customer.age" }, right: { type: "number", value: 35 } },
        ],
      },
    },
    data: {
      customer: { plan: "free", ever_subscribed: false, age: 28 },
    },
  },

  // ── 7. Premium Upgrade Prompt ──────────────────────────────────────────────
  {
    id: "upgrade-prompt",
    name: "Upgrade Prompt",
    category: "Growth",
    description: "Show an upgrade prompt when the user is on a basic plan OR has high usage in a key market.",
    expectedResult: true,
    rule: {
      id: "upgrade-prompt",
      name: "Show Upgrade Prompt",
      description: "Basic plan users OR high-usage users in key markets",
      version: "1",
      root: {
        type: "or",
        conditions: [
          { type: "eq", left: { type: "field", path: "customer.plan" }, right: { type: "string", value: "basic" } },
          {
            type: "and",
            conditions: [
              { type: "gte", left: { type: "field", path: "usage.monthly_events" }, right: { type: "number", value: 10000 } },
              { type: "in", left: { type: "field", path: "customer.country" }, right: { type: "array", values: [{ type: "string", value: "US" }, { type: "string", value: "GB" }, { type: "string", value: "DE" }] } },
            ],
          },
        ],
      },
    },
    data: {
      customer: { plan: "enterprise", country: "US" },
      usage: { monthly_events: 15000 },
    },
  },

  // ── 8. Refund Eligibility ──────────────────────────────────────────────────
  {
    id: "refund-eligibility",
    name: "Refund Eligibility",
    category: "Operations",
    description: "Allow refund if order was placed in the last 30 days, amount is under $500, and account is not flagged.",
    expectedResult: false,
    rule: {
      id: "refund-eligibility",
      name: "Refund Eligibility",
      description: "Eligible for refund: recent order, small amount, clean account",
      version: "1",
      root: {
        type: "and",
        conditions: [
          { type: "lte", left: { type: "field", path: "order.days_since_purchase" }, right: { type: "number", value: 30 } },
          { type: "lt", left: { type: "field", path: "order.total" }, right: { type: "number", value: 500 } },
          { type: "eq", left: { type: "field", path: "account.flagged" }, right: { type: "boolean", value: false } },
        ],
      },
    },
    data: {
      order: { days_since_purchase: 45, total: 120 },
      account: { flagged: false },
    },
  },
];

export const EXAMPLE_MAP = Object.fromEntries(EXAMPLES.map((e) => [e.id, e]));

export const CATEGORY_COLORS: Record<string, string> = {
  Start: "#22c55e",
  Access: "#6c8ef5",
  Risk: "#f87171",
  Promotions: "#34d399",
  Compliance: "#f5a623",
  Growth: "#a78bfa",
  Operations: "#64748b",
};
