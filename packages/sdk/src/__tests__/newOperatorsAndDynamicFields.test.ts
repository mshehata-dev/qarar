import { describe, it, expect } from "vitest";
import {
  rule,
  field,
  checkRule,
  compileRule,
  compileToSQL,
  compileToMongo,
} from "../index.js";

describe("New Operators & Dynamic {{ field.path }} Fields", () => {
  describe("1. Array Operations", () => {
    it("evaluates arrayContains and notArrayContains", () => {
      const tagRule = rule("Tag Policy")
        .where("user.tags").arrayContains("vip")
        .and("user.tags").notArrayContains("banned")
        .build();

      expect(
        checkRule(tagRule, { user: { tags: ["vip", "early-adopter"] } }).result
      ).toBe(true);

      expect(
        checkRule(tagRule, { user: { tags: ["vip", "banned"] } }).result
      ).toBe(false);

      expect(
        checkRule(tagRule, { user: { tags: ["regular"] } }).result
      ).toBe(false);
    });

    it("evaluates arrayContainsAny, arrayContainsAll, arrayContainsNone, arrayIsEmpty, arrayIsNotEmpty", () => {
      const permsRule = rule("Permissions Policy")
        .where("user.permissions").arrayContainsAny(["admin", "billing"])
        .and("user.features").arrayContainsAll(["audit_logs", "sso"])
        .and("user.flags").arrayContainsNone(["banned", "suspended"])
        .and("user.tags").arrayIsNotEmpty()
        .and("user.pendingInvites").arrayIsEmpty()
        .build();

      expect(
        checkRule(permsRule, {
          user: {
            permissions: ["editor", "billing"],
            features: ["sso", "audit_logs", "custom_domains"],
            flags: ["verified"],
            tags: ["beta-user"],
            pendingInvites: [],
          },
        }).result
      ).toBe(true);

      // Fails when arrayContainsNone fails (has banned flag)
      expect(
        checkRule(permsRule, {
          user: {
            permissions: ["admin"],
            features: ["audit_logs", "sso"],
            flags: ["banned"],
            tags: ["beta-user"],
            pendingInvites: [],
          },
        }).result
      ).toBe(false);

      // Fails when arrayContainsAll fails (missing sso)
      expect(
        checkRule(permsRule, {
          user: {
            permissions: ["admin"],
            features: ["audit_logs"],
            flags: [],
            tags: ["beta-user"],
            pendingInvites: [],
          },
        }).result
      ).toBe(false);

      // Fails when arrayIsEmpty fails (has 1 pending invite)
      expect(
        checkRule(permsRule, {
          user: {
            permissions: ["admin"],
            features: ["audit_logs", "sso"],
            flags: [],
            tags: ["beta-user"],
            pendingInvites: ["invite_1"],
          },
        }).result
      ).toBe(false);
    });

    it("evaluates arrayLength operators (eq, gte, lte, gt, lt)", () => {
      const cartRule = rule("Cart Count Policy")
        .where("cart.items").arrayLengthGte(2)
        .and("cart.items").arrayLengthLte(5)
        .build();

      expect(checkRule(cartRule, { cart: { items: [1, 2, 3] } }).result).toBe(true);
      expect(checkRule(cartRule, { cart: { items: [1] } }).result).toBe(false);
      expect(checkRule(cartRule, { cart: { items: [1, 2, 3, 4, 5, 6] } }).result).toBe(false);
    });

    it("handles non-array left side safely without throwing", () => {
      const safeCheck = rule("Safe Array Check")
        .where("user.tags").arrayContains("admin")
        .build();

      expect(checkRule(safeCheck, { user: { tags: null } }).result).toBe(false);
      expect(checkRule(safeCheck, { user: { tags: "admin" } }).result).toBe(false);
      expect(checkRule(safeCheck, { user: {} }).result).toBe(false);
    });
  });

  describe("2. Date & Time Operations (UTC / Epoch / Relative)", () => {
    it("evaluates before and after date comparisons", () => {
      const promoRule = rule("Promo Window")
        .where("order.timestamp").after("2026-01-01T00:00:00Z")
        .and("order.timestamp").before("2026-12-31T23:59:59Z")
        .build();

      expect(
        checkRule(promoRule, { order: { timestamp: "2026-06-15T12:00:00Z" } }).result
      ).toBe(true);

      expect(
        checkRule(promoRule, { order: { timestamp: "2025-12-31T23:59:59Z" } }).result
      ).toBe(false);

      expect(
        checkRule(promoRule, { order: { timestamp: "2027-01-01T00:00:00Z" } }).result
      ).toBe(false);
    });

    it("evaluates olderThan relative duration (e.g. 30 days)", () => {
      const accountAgeRule = rule("Senior Account Gate")
        .where("user.createdAt").olderThan("30 days")
        .build();

      const fortyDaysAgo = new Date(Date.now() - 40 * 86400 * 1000).toISOString();
      const tenDaysAgo = new Date(Date.now() - 10 * 86400 * 1000).toISOString();

      expect(checkRule(accountAgeRule, { user: { createdAt: fortyDaysAgo } }).result).toBe(true);
      expect(checkRule(accountAgeRule, { user: { createdAt: tenDaysAgo } }).result).toBe(false);
    });

    it("evaluates withinLast relative duration (e.g. 7 days)", () => {
      const recentActivityRule = rule("Recent Activity Gate")
        .where("user.lastLogin").withinLast("7 days")
        .build();

      const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
      const tenDaysAgo = new Date(Date.now() - 10 * 86400 * 1000).toISOString();

      expect(checkRule(recentActivityRule, { user: { lastLogin: twoDaysAgo } }).result).toBe(true);
      expect(checkRule(recentActivityRule, { user: { lastLogin: tenDaysAgo } }).result).toBe(false);
    });

    it("evaluates two-sided dynamic date comparisons (subscription trial vs payment date)", () => {
      const subRule = rule("Subscription Trial Check")
        .where("subscription.paymentDate").before("{{subscription.trialEndsAt}}")
        .build();

      expect(
        checkRule(subRule, {
          subscription: {
            paymentDate: "2026-11-15T00:00:00Z",
            trialEndsAt: "2026-11-20T00:00:00Z",
          },
        }).result
      ).toBe(true);

      expect(
        checkRule(subRule, {
          subscription: {
            paymentDate: "2026-11-25T00:00:00Z",
            trialEndsAt: "2026-11-20T00:00:00Z",
          },
        }).result
      ).toBe(false);
    });

    it("evaluates dynamic date comparison with duration offset math (e.g. {{ date + 14 days }})", () => {
      const offerRule = rule("Two-Week Free Offer Verification")
        .where("subscription.endDate").after("{{subscription.startDate + 14 days}}")
        .build();

      // Passing: endDate is 20 days after startDate (> 14 days)
      expect(
        checkRule(offerRule, {
          subscription: {
            startDate: "2026-11-01T00:00:00Z",
            endDate: "2026-11-21T00:00:00Z",
          },
        }).result
      ).toBe(true);

      // Failing: endDate is only 7 days after startDate (< 14 days)
      expect(
        checkRule(offerRule, {
          subscription: {
            startDate: "2026-11-01T00:00:00Z",
            endDate: "2026-11-08T00:00:00Z",
          },
        }).result
      ).toBe(false);
    });
  });

  describe("3. Dynamic Two-Sided Field Comparisons ({{ field.path }})", () => {
    it("compares two fields using {{ field.path }} syntax", () => {
      const creditRule = rule("Credit Check")
        .where("cart.total").lte("{{customer.creditLimit}}")
        .build();

      // Passing: 400 <= 500
      expect(
        checkRule(creditRule, {
          cart: { total: 400 },
          customer: { creditLimit: 500 },
        }).result
      ).toBe(true);

      // Failing: 600 <= 500
      expect(
        checkRule(creditRule, {
          cart: { total: 600 },
          customer: { creditLimit: 500 },
        }).result
      ).toBe(false);
    });

    it("compares two fields using field('path') helper", () => {
      const discountRule = rule("Discount Ceiling")
        .where("cart.discount").lt(field("cart.total"))
        .build();

      expect(
        checkRule(discountRule, {
          cart: { discount: 20, total: 100 },
        }).result
      ).toBe(true);

      expect(
        checkRule(discountRule, {
          cart: { discount: 120, total: 100 },
        }).result
      ).toBe(false);
    });

    it("evaluates strict type safety without loose JS coercions", () => {
      const strictRule = rule("Strict Number Check")
        .where("item.price").gt("{{item.category}}")
        .build();

      // Comparing number to string must safely return false
      expect(
        checkRule(strictRule, {
          item: { price: 100, category: "electronics" },
        }).result
      ).toBe(false);

      // Comparing array to string must safely return false
      const arrayVsString = rule("Array vs String")
        .where("item.tags").eq("{{item.name}}")
        .build();

      expect(
        checkRule(arrayVsString, {
          item: { tags: ["apple"], name: "apple" },
        }).result
      ).toBe(false);
    });
  });

  describe("4. Compilers (SQL & MongoDB Pushdown)", () => {
    it("compiles array and date operators to SQL", () => {
      const r = rule("Pushdown SQL")
        .where("user.tags").arrayContains("vip")
        .and("order.timestamp").before("2026-12-31T00:00:00Z")
        .and("cart.total").gt("{{customer.creditLimit}}")
        .build();

      const { sql } = compileToSQL(r, { columnStyle: "snake" });
      expect(sql).toContain("'vip' = ANY(user_tags)");
      expect(sql).toContain("order_timestamp < '2026-12-31T00:00:00Z'");
      expect(sql).toContain("cart_total > customer_creditLimit");
    });

    it("compiles array and date operators to MongoDB", () => {
      const r = rule("Pushdown Mongo")
        .where("user.tags").arrayContains("vip")
        .and("order.timestamp").before("2026-12-31T00:00:00Z")
        .and("cart.total").gt("{{customer.creditLimit}}")
        .build();

      const { filter } = compileToMongo(r);
      expect(filter).toEqual({
        $and: [
          { "user.tags": "vip" },
          { "order.timestamp": { $lt: "2026-12-31T00:00:00Z" } },
          { $expr: { $gt: ["$cart.total", "$customer.creditLimit"] } },
        ],
      });
    });

    it("compiles two-sided date comparisons to MongoDB using $expr", () => {
      const subRule = rule("Date Pushdown Mongo")
        .where("subscription.paymentDate").before("{{subscription.trialEndsAt}}")
        .build();

      const { filter } = compileToMongo(subRule);
      expect(filter).toEqual({
        $expr: {
          $lt: ["$subscription.paymentDate", "$subscription.trialEndsAt"],
        },
      });
    });

    it("compiles arrayContainsAny, arrayContainsAll, arrayContainsNone to SQL and Mongo", () => {
      const r = rule("Array Sets Pushdown")
        .where("user.roles").arrayContainsAny(["admin", "moderator"])
        .and("user.tags").arrayContainsAll(["verified", "active"])
        .and("user.flags").arrayIsEmpty()
        .build();

      const { sql } = compileToSQL(r, { columnStyle: "snake" });
      expect(sql).toContain("user_roles && ARRAY('admin', 'moderator')");
      expect(sql).toContain("user_tags @> ARRAY('verified', 'active')");
      expect(sql).toContain("ARRAY_LENGTH(user_flags, 1) IS NULL OR ARRAY_LENGTH(user_flags, 1) = 0");

      const { filter } = compileToMongo(r);
      expect(filter).toEqual({
        $and: [
          { "user.roles": { $in: ["admin", "moderator"] } },
          { "user.tags": { $all: ["verified", "active"] } },
          { "user.flags": { $size: 0 } },
        ],
      });
    });
  });
});
