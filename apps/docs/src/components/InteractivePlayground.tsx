import { useState, useEffect, useRef } from "react";
import {
  rule,
  switchRule,
  checkRule,
  checkDecisionTable,
  compileToSQL,
  compileToMongo,
  type Rule,
  type RuleNode,
  type DecisionTable,
  type TraceEntry,
  field,
} from "@qarar/sdk";
import { extractFieldPath } from "@qarar/spec";
import { RuleBuilder, DecisionTableBuilder } from "@qarar/react-builder";
import { getThemeTokens, qararTokens, cssVarTokens, type QararTheme } from "@qarar/theme";

// ---------------------------------------------------------------------------
// Presets Definition
// ---------------------------------------------------------------------------

interface FieldDef {
  path: string;
  label: string;
  type?: "string" | "number" | "boolean" | "enum";
}

interface Preset {
  id: string;
  title: string;
  category: "E-Commerce" | "FinTech" | "Decision Table" | "SaaS" | "Healthcare" | "Travel";
  badgeColor: string;
  description: string;
  isDecisionTable?: boolean;
  rule?: Rule;
  decisionTable?: DecisionTable<unknown>;
  sampleData: Record<string, unknown>;
  fields: FieldDef[];
}

const PRESETS: Preset[] = [
  {
    id: "ecommerce",
    title: "E-Commerce VIP Discount",
    category: "E-Commerce",
    badgeColor: qararTokens.dark.primary,
    description: "Grants 20% discount if customer is 18+, on a VIP or Premium plan, and cart exceeds $100.",
    rule: rule("VIP Discount Gate")
      .id("discount-v1")
      .where("customer.age")
      .gte(18)
      .and("customer.plan")
      .in(["vip", "premium"])
      .and("cart.total")
      .gt(100)
      .build(),
    sampleData: {
      customer: { age: 24, plan: "premium" },
      cart: { total: 150 },
    },
    fields: [
      { path: "customer.age", label: "Customer Age", type: "number" },
      { path: "customer.plan", label: "Subscription Plan", type: "enum" },
      { path: "cart.total", label: "Cart Total ($)", type: "number" },
    ],
  },
  {
    id: "dynamic-fields-arrays",
    title: "Dynamic {{ Field }} & Array Operations",
    category: "FinTech",
    badgeColor: qararTokens.dark.accent,
    description: "Evaluates dynamic field-to-field comparison (cart.total <= {{customer.creditLimit}}), array membership (tags), and date withinLast.",
    rule: rule("Dynamic Credit & Trial Policy")
      .id("credit-trial-policy")
      .where("cart.total").lte(field("customer.creditLimit"))
      .and("user.tags").arrayContains("verified-buyer")
      .and("user.registeredAt").withinLast("90 days")
      .build(),
    sampleData: {
      cart: { total: 450 },
      customer: { creditLimit: 1000 },
      user: {
        tags: ["verified-buyer", "newsletter-subscriber"],
        registeredAt: new Date(Date.now() - 15 * 86400 * 1000).toISOString(),
      },
    },
    fields: [
      { path: "cart.total", label: "Cart Total ($)", type: "number" },
      { path: "customer.creditLimit", label: "Credit Limit ($)", type: "number" },
      { path: "user.tags", label: "User Tags", type: "string" },
      { path: "user.registeredAt", label: "Registration Date", type: "string" },
    ],
  },
  {
    id: "saas-subscription-dates",
    title: "SaaS Subscription & Two-Sided Dates",
    category: "SaaS",
    badgeColor: qararTokens.dark.primary,
    description: "Evaluates two-sided date comparisons (paymentDate before trialEndsAt), duration offsets, and array set operations (all/any).",
    rule: rule("SaaS Free Trial & Plan Policy")
      .id("saas-trial-policy")
      .where("subscription.paymentDate").before(field("subscription.trialEndsAt"))
      .and("account.features").arrayContainsAll(["sso", "audit_logs"])
      .and("account.members").arrayLengthGte(5)
      .build(),
    sampleData: {
      subscription: {
        startDate: "2026-11-01T00:00:00Z",
        trialEndsAt: "2026-11-20T00:00:00Z",
        paymentDate: "2026-11-15T00:00:00Z",
        plan: "enterprise",
      },
      account: {
        features: ["sso", "audit_logs", "custom_domains"],
        members: ["alice", "bob", "carol", "dave", "eve"],
      },
    },
    fields: [
      { path: "subscription.startDate", label: "Start Date", type: "string" },
      { path: "subscription.trialEndsAt", label: "Trial End Date", type: "string" },
      { path: "subscription.paymentDate", label: "Payment Date", type: "string" },
      { path: "account.features", label: "Account Features", type: "string" },
      { path: "account.members", label: "Team Members", type: "string" },
    ],
  },
  {
    id: "decision-matrix",
    title: "Pricing Tier Switch Matrix",
    category: "Decision Table",
    badgeColor: qararTokens.dark.accent,
    description: "Dynamic switch case evaluating customer tier and cart total to return specific discount and shipping perks.",
    isDecisionTable: true,
    decisionTable: switchRule<{ discountPercent: number; freeShipping: boolean; tierLabel: string }>("Customer Pricing Matrix")
      .id("pricing-tier-matrix")
      .case("vip-branch", rule().where("customer.tier").eq("vip").and("cart.total").gte(200))
        .then({ discountPercent: 25, freeShipping: true, tierLabel: "VIP Platinum" })
      .case("gold-branch", rule().where("customer.tier").eq("gold").and("cart.total").gte(100))
        .then({ discountPercent: 15, freeShipping: true, tierLabel: "Gold Tier" })
      .case("silver-branch", rule().where("customer.tier").eq("silver"))
        .then({ discountPercent: 5, freeShipping: false, tierLabel: "Silver Tier" })
      .default({ discountPercent: 0, freeShipping: false, tierLabel: "Standard Tier" })
      .build(),
    sampleData: {
      customer: { tier: "vip" },
      cart: { total: 250 },
    },
    fields: [
      { path: "customer.tier", label: "Customer Tier", type: "enum" },
      { path: "cart.total", label: "Cart Total ($)", type: "number" },
    ],
  },
  {
    id: "fintech",
    title: "FinTech Risk & Fraud Gate",
    category: "FinTech",
    badgeColor: qararTokens.dark.fail,
    description: "Flags high-value transactions (> $5,000) when user is unverified or located in a flagged country.",
    rule: rule("High Value Fraud Gate")
      .id("risk-gate-v1")
      .where("transaction.amount")
      .gt(5000)
      .and(
        rule()
          .where("user.verified")
          .eq(false)
          .or("transaction.country")
          .in(["XX", "YY"])
          .buildNode()
      )
      .build(),
    sampleData: {
      transaction: { amount: 7500, country: "XX" },
      user: { verified: false },
    },
    fields: [
      { path: "transaction.amount", label: "Transaction Amount ($)", type: "number" },
      { path: "transaction.country", label: "Country Code", type: "string" },
      { path: "user.verified", label: "User Verified", type: "boolean" },
    ],
  },
  {
    id: "saas",
    title: "SaaS Feature Entitlements",
    category: "SaaS",
    badgeColor: qararTokens.dark.pass,
    description: "Unlocks advanced analytics for Admins, or Enterprise accounts with 50 or fewer active seats.",
    rule: rule("Analytics Entitlement Gate")
      .id("entitlement-analytics")
      .where("user.role")
      .eq("admin")
      .or(
        rule()
          .where("account.plan")
          .eq("enterprise")
          .and("account.seats")
          .lte(50)
          .buildNode()
      )
      .build(),
    sampleData: {
      user: { role: "member" },
      account: { plan: "enterprise", seats: 25 },
    },
    fields: [
      { path: "user.role", label: "User Role", type: "string" },
      { path: "account.plan", label: "Account Plan", type: "string" },
      { path: "account.seats", label: "Active Seats", type: "number" },
    ],
  },
  {
    id: "hipaa",
    title: "Healthcare HIPAA Consent",
    category: "Healthcare",
    badgeColor: qararTokens.dark.warn,
    description: "Verifies patient consent, age 21+, and data residency in approved regions (EU or US).",
    rule: rule("Medical Privacy Gate")
      .id("privacy-hipaa-v1")
      .where("patient.consentGiven")
      .eq(true)
      .and("patient.age")
      .gte(21)
      .and("data.region")
      .in(["EU", "US"])
      .build(),
    sampleData: {
      patient: { consentGiven: true, age: 29 },
      data: { region: "EU" },
    },
    fields: [
      { path: "patient.consentGiven", label: "Consent Given", type: "boolean" },
      { path: "patient.age", label: "Patient Age", type: "number" },
      { path: "data.region", label: "Data Residency Region", type: "string" },
    ],
  },
  {
    id: "airline",
    title: "Airline Lounge Upgrade",
    category: "Travel",
    badgeColor: qararTokens.dark.primaryLight,
    description: "Grants lounge access if flight is International and flyer status is Gold or Platinum.",
    rule: rule("Lounge Access Gate")
      .id("loyalty-lounge-v1")
      .where("flight.isInternational")
      .eq(true)
      .and("passenger.status")
      .in(["gold", "platinum"])
      .build(),
    sampleData: {
      flight: { isInternational: true },
      passenger: { status: "platinum" },
    },
    fields: [
      { path: "flight.isInternational", label: "International Flight", type: "boolean" },
      { path: "passenger.status", label: "Loyalty Status", type: "enum" },
    ],
  },
];

// ---------------------------------------------------------------------------
// TS Code Generator Helper
// ---------------------------------------------------------------------------

function generateTSCode(node?: RuleNode, indent = "  "): string {
  if (!node || typeof node !== "object") return 'where("field").eq(true)';
  if (node.type === "and") {
    const parts = (node.conditions || []).map((c) => generateTSCode(c, `${indent}  `));
    return `and(\n${parts.map((p) => `${indent}  ${p}`).join(",\n")}\n${indent})`;
  }
  if (node.type === "or") {
    const parts = (node.conditions || []).map((c) => generateTSCode(c, `${indent}  `));
    return `or(\n${parts.map((p) => `${indent}  ${p}`).join(",\n")}\n${indent})`;
  }
  if (node.type === "not") {
    return `not(${generateTSCode(node.condition, indent)})`;
  }
  if (node.type === "between") {
    const fieldPath = node.left && node.left.type === "field" ? node.left.path : "";
    const minVal = node.min && "value" in node.min ? node.min.value : 0;
    const maxVal = node.max && "value" in node.max ? node.max.value : 0;
    return `where("${fieldPath}").between(${minVal}, ${maxVal})`;
  }
  const fieldPath = node.left && node.left.type === "field" ? node.left.path : "";
  if (
    node.type === "isNull" ||
    node.type === "isNotNull" ||
    node.type === "arrayIsEmpty" ||
    node.type === "arrayIsNotEmpty"
  ) {
    return `where("${fieldPath}").${node.type}()`;
  }
  const val = node.right;
  let valStr = "";
  if (!val) valStr = '""';
  else if (val.type === "field") valStr = `field("${val.path}")`;
  else if (val.type === "string") {
    const dynamicField = extractFieldPath(val.value);
    valStr = dynamicField ? `field("${dynamicField}")` : `"${val.value}"`;
  }
  else if (val.type === "number" || val.type === "boolean") valStr = String(val.value);
  else if (val.type === "null") valStr = "null";
  else if (val.type === "array") {
    const items = (val.values || []).map((v) =>
      "value" in v ? (typeof v.value === "string" ? `"${v.value}"` : String(v.value)) : "null"
    );
    valStr = `[${items.join(", ")}]`;
  }
  return `where("${fieldPath}").${node.type || "eq"}(${valStr})`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InteractivePlayground() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    }
    return "light";
  });
  const [activePreset, setActivePreset] = useState<Preset>(PRESETS[0]);
  const [currentRule, setCurrentRule] = useState<Rule>(PRESETS[0].rule!);
  const [currentDecisionTable, setCurrentDecisionTable] = useState<DecisionTable<unknown> | undefined>(
    PRESETS[0].decisionTable
  );
  const [dataInput, setDataInput] = useState<string>(
    JSON.stringify(PRESETS[0].sampleData, null, 2)
  );
  const [jsonText, setJsonText] = useState<string>(
    JSON.stringify(PRESETS[0].isDecisionTable ? PRESETS[0].decisionTable : PRESETS[0].rule, null, 2)
  );
  const [editorTab, setEditorTab] = useState<"visual" | "matrix" | "json" | "ts">("visual");
  const [pushdownTab, setPushdownTab] = useState<"sql" | "mongo">("sql");
  const [sqlStyle, setSqlStyle] = useState<"snake" | "quote" | "path">("snake");
  const [copied, setCopied] = useState<string | null>(null);
  const [showNewRuleMenu, setShowNewRuleMenu] = useState(false);
  const newRuleMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (newRuleMenuRef.current && !newRuleMenuRef.current.contains(event.target as Node)) {
        setShowNewRuleMenu(false);
      }
    }
    if (showNewRuleMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNewRuleMenu]);

  // Sync theme with Starlight html data-theme
  useEffect(() => {
    const updateTheme = () => {
      const current = document.documentElement.getAttribute("data-theme");
      setTheme(current === "light" ? "light" : "dark");
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const isDark = theme === "dark";
  const t = getThemeTokens(isDark);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function loadPreset(p: Preset) {
    setActivePreset(p);
    if (p.isDecisionTable && p.decisionTable) {
      setCurrentDecisionTable(p.decisionTable);
      setCurrentRule(undefined as any);
      setJsonText(JSON.stringify(p.decisionTable, null, 2));
      setEditorTab("matrix");
    } else if (p.rule) {
      setCurrentRule(p.rule);
      setCurrentDecisionTable(undefined);
      setJsonText(JSON.stringify(p.rule, null, 2));
      setEditorTab("visual");
    }
    setDataInput(JSON.stringify(p.sampleData, null, 2));
  }

  function handleCreateNewStandardRule() {
    const blankRule: Rule = {
      id: "custom-rule-v1",
      name: "Custom Rule",
      version: "1",
      root: {
        type: "eq",
        left: { type: "field", path: "user.role" },
        right: { type: "string", value: "admin" },
      },
    };
    setCurrentRule(blankRule);
    setCurrentDecisionTable(undefined);
    setActivePreset({
      id: "custom-rule",
      title: "Custom Standard Rule",
      category: "SaaS",
      badgeColor: qararTokens.dark.primary,
      description: "Custom single boolean rule evaluating IF / AND / OR conditions.",
      rule: blankRule,
      sampleData: { user: { role: "admin" } },
      fields: [],
    });
    setDataInput(JSON.stringify({ user: { role: "admin" } }, null, 2));
    setJsonText(JSON.stringify(blankRule, null, 2));
    setEditorTab("visual");
    setShowNewRuleMenu(false);
  }

  function handleCreateNewSwitchRule() {
    const blankMatrix: DecisionTable<Record<string, unknown>> = {
      id: "custom-matrix-v1",
      name: "Custom Switch Matrix",
      version: "1",
      mode: "first",
      branches: [
        {
          id: "case-1",
          name: "Case 1: VIP Tier",
          condition: {
            type: "eq",
            left: { type: "field", path: "customer.tier" },
            right: { type: "string", value: "vip" },
          },
          output: { discountPercent: 20, freeShipping: true },
        },
        {
          id: "case-2",
          name: "Case 2: Regular Tier",
          condition: {
            type: "eq",
            left: { type: "field", path: "customer.tier" },
            right: { type: "string", value: "regular" },
          },
          output: { discountPercent: 5, freeShipping: false },
        },
      ],
      defaultOutput: { discountPercent: 0, freeShipping: false },
    };
    setCurrentDecisionTable(blankMatrix);
    setCurrentRule(undefined as any);
    setActivePreset({
      id: "custom-matrix",
      title: "Custom Switch Matrix",
      category: "Decision Table",
      badgeColor: qararTokens.dark.accent,
      description: "Custom multi-branch switch matrix evaluating conditions to return structured outputs.",
      isDecisionTable: true,
      decisionTable: blankMatrix,
      sampleData: { customer: { tier: "vip" } },
      fields: [],
    });
    setDataInput(JSON.stringify({ customer: { tier: "vip" } }, null, 2));
    setJsonText(JSON.stringify(blankMatrix, null, 2));
    setEditorTab("matrix");
    setShowNewRuleMenu(false);
  }

  function handleDecisionTableChange(updated: DecisionTable<unknown>) {
    setCurrentDecisionTable(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  }

  function handleRuleNodeChange(updatedNode: RuleNode) {
    const updatedRule: Rule = {
      ...currentRule,
      root: updatedNode,
    };
    setCurrentRule(updatedRule);
    setJsonText(JSON.stringify(updatedRule, null, 2));
  }

  function handleJsonTextChange(text: string) {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        if ("branches" in parsed) {
          setCurrentDecisionTable(parsed as DecisionTable<unknown>);
          setCurrentRule(undefined as any);
        } else if ("root" in parsed) {
          setCurrentRule(parsed as Rule);
          setCurrentDecisionTable(undefined);
        }
      }
    } catch {
      // ignore JSON parse errors while typing
    }
  }

  let testDataObj: Record<string, unknown> = {};
  let jsonError = false;
  try {
    testDataObj = JSON.parse(dataInput);
  } catch {
    jsonError = true;
  }

  // Live Rule Evaluation & Pushdown Compilation
  const isDecision = Boolean(currentDecisionTable);
  let decisionResult = null;
  let singleRuleResult = null;
  let sqlResult = { sql: "" };
  let mongoCompiled = { filter: {} as Record<string, unknown> };

  try {
    if (isDecision && currentDecisionTable) {
      decisionResult = checkDecisionTable(currentDecisionTable, testDataObj);
      sqlResult = { sql: "-- SQL Pushdown not applicable for Decision Matrix" };
      mongoCompiled = { filter: { note: "MongoDB filter not applicable for Decision Matrix" } };
    } else if (currentRule) {
      singleRuleResult = checkRule(currentRule, testDataObj);
      try {
        sqlResult = compileToSQL(currentRule, { columnStyle: sqlStyle });
      } catch (err: any) {
        sqlResult = { sql: `-- SQL compile notice: ${err?.message || "Incomplete rule"}` };
      }
      try {
        mongoCompiled = compileToMongo(currentRule);
      } catch (err: any) {
        mongoCompiled = { filter: { notice: err?.message || "Incomplete rule" } };
      }
    }
  } catch {
    // Graceful fallback during typing
  }

  let generatedCode = "";
  try {
    if (isDecision && currentDecisionTable) {
      generatedCode = `import { switchRule, rule, checkDecisionTable } from "@qarar/sdk";

const pricingMatrix = switchRule("${currentDecisionTable?.name || "Decision Table"}")
  .id("${currentDecisionTable?.id || "matrix-v1"}")
  .case("vip-branch", rule().where("customer.tier").eq("vip").and("cart.total").gte(200))
    .then({ discountPercent: 25, freeShipping: true })
  .default(${JSON.stringify(currentDecisionTable?.defaultOutput || {})})
  .build();

const decision = checkDecisionTable(pricingMatrix, data);
console.log(decision.matchedBranch?.id); // "${decisionResult?.matchedBranch?.id || ""}"`;
    } else if (currentRule) {
      const safeId = (currentRule.id || "discount_rule").replace(/[^a-zA-Z0-9]+/g, "_");
      generatedCode = `import { rule, where, checkRule } from "@qarar/sdk";

const ${safeId} = rule("${currentRule.name || "Rule"}")
  .id("${currentRule.id || "rule-v1"}")
  .where(${generateTSCode(currentRule.root)})
  .build();

const decision = checkRule(${safeId}, data);
console.log(decision.result); // ${singleRuleResult?.result ?? false}`;
    }
  } catch {
    generatedCode = `// Generated TypeScript will update when rule AST is valid`;
  }

  return (
    <div
      className="not-content"
      style={{
        borderRadius: "10px",
        border: "1px solid var(--qarar-border)",
        backgroundColor: "var(--qarar-bg)",
        color: "var(--qarar-text)",
        padding: "18px",
        boxShadow: "var(--qarar-shadow-sm)",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Sleek Top Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          paddingBottom: "14px",
          marginBottom: "16px",
          borderBottom: "1px solid var(--qarar-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--qarar-text-muted)" }}>
            Preset:
          </span>
          <select
            value={activePreset.id}
            onChange={(e) => {
              const found = PRESETS.find((p) => p.id === e.target.value);
              if (found) loadPreset(found);
            }}
            style={{
              height: "32px",
              padding: "0 10px",
              borderRadius: "6px",
              border: "1px solid var(--qarar-input-border)",
              backgroundColor: "var(--qarar-input-bg)",
              color: "var(--qarar-input-text)",
              fontSize: "0.84rem",
              fontWeight: 500,
              outline: "none",
              cursor: "pointer",
            }}
          >
            {activePreset.id.startsWith("custom") && (
              <option value={activePreset.id}>
                {activePreset.title} (Custom)
              </option>
            )}
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--qarar-text-muted)",
              lineHeight: "1.4",
            }}
          >
            {activePreset.description}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* New Rule Dropdown with 2 Options */}
          <div ref={newRuleMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowNewRuleMenu((prev) => !prev)}
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--qarar-text)",
                backgroundColor: "var(--qarar-surface-3)",
                border: "1px solid var(--qarar-border)",
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>+ New Rule</span>
              <span style={{ fontSize: "0.62rem", opacity: 0.7 }}>▼</span>
            </button>

            {showNewRuleMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  zIndex: 100,
                  minWidth: "260px",
                  backgroundColor: "var(--qarar-surface-2)",
                  border: "1px solid var(--qarar-border)",
                  borderRadius: "8px",
                  padding: "6px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                }}
              >
                <button
                  type="button"
                  onClick={handleCreateNewStandardRule}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "transparent",
                    color: "var(--qarar-text)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--qarar-surface-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Standard Rule</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--qarar-text-muted)", marginTop: "2px" }}>
                    Single boolean rule (IF / AND / OR) with pushdown
                  </span>
                </button>

                <div style={{ height: "1px", backgroundColor: "var(--qarar-border)", margin: "4px 0" }} />

                <button
                  type="button"
                  onClick={handleCreateNewSwitchRule}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "transparent",
                    color: "var(--qarar-text)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--qarar-surface-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Switch Rule (Decision Matrix)</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--qarar-text-muted)", marginTop: "2px" }}>
                    Multi-branch matrix returning structured outputs
                  </span>
                </button>
              </div>
            )}
          </div>
          <a
            href="/recipes/business-patterns/"
            style={{
              fontSize: "0.78rem",
              fontWeight: 500,
              color: "var(--qarar-primary)",
              textDecoration: "none",
              padding: "5px 10px",
            }}
          >
            Recipes ↗
          </a>
        </div>
      </div>

      {/* Main Studio 2-Column Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "16px", alignItems: "start" }}>
        
        {/* Left Column: Logic Authoring */}
        <div
          style={{
            border: "1px solid var(--qarar-border)",
            borderRadius: "8px",
            backgroundColor: "var(--qarar-surface)",
            overflow: "hidden",
          }}
        >
          {/* Editor Header & Mode Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderBottom: "1px solid var(--qarar-border)",
              backgroundColor: "var(--qarar-surface-2)",
            }}
          >
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--qarar-text)" }}>
              Rule Logic
            </span>

            {/* Segmented Control */}
            <div
              style={{
                display: "inline-flex",
                backgroundColor: "var(--qarar-surface-3)",
                borderRadius: "6px",
                padding: "2px",
                gap: "2px",
              }}
            >
              {!isDecision && (
                <button
                  type="button"
                  onClick={() => setEditorTab("visual")}
                  style={{
                    padding: "4px 10px",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: editorTab === "visual" ? "var(--qarar-bg)" : "transparent",
                    color: editorTab === "visual" ? "var(--qarar-text)" : "var(--qarar-text-muted)",
                    fontWeight: editorTab === "visual" ? 600 : 500,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    boxShadow: editorTab === "visual" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  Visual
                </button>
              )}

              {isDecision && (
                <button
                  type="button"
                  onClick={() => setEditorTab("matrix")}
                  style={{
                    padding: "4px 10px",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: editorTab === "matrix" ? "var(--qarar-bg)" : "transparent",
                    color: editorTab === "matrix" ? "var(--qarar-accent)" : "var(--qarar-text-muted)",
                    fontWeight: editorTab === "matrix" ? 600 : 500,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    boxShadow: editorTab === "matrix" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  Matrix
                </button>
              )}

              <button
                type="button"
                onClick={() => setEditorTab("json")}
                style={{
                  padding: "4px 10px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: editorTab === "json" ? "var(--qarar-bg)" : "transparent",
                  color: editorTab === "json" ? "var(--qarar-text)" : "var(--qarar-text-muted)",
                  fontWeight: editorTab === "json" ? 600 : 500,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: editorTab === "json" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                JSON AST
              </button>

              <button
                type="button"
                onClick={() => setEditorTab("ts")}
                style={{
                  padding: "4px 10px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: editorTab === "ts" ? "var(--qarar-bg)" : "transparent",
                  color: editorTab === "ts" ? "var(--qarar-text)" : "var(--qarar-text-muted)",
                  fontWeight: editorTab === "ts" ? 600 : 500,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: editorTab === "ts" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                TypeScript
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div style={{ padding: "12px" }}>
            {editorTab === "visual" && !isDecision && (
              <RuleBuilder
                value={currentRule}
                onChange={handleRuleNodeChange}
                fields={activePreset.fields}
                theme={cssVarTokens}
              />
            )}

            {editorTab === "matrix" && isDecision && currentDecisionTable && (
              <DecisionTableBuilder
                value={currentDecisionTable}
                onChange={handleDecisionTableChange}
                fields={activePreset.fields}
                matchedBranchId={decisionResult?.matchedBranch?.id ?? null}
                theme={cssVarTokens}
              />
            )}

            {editorTab === "json" && (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(jsonText, "json")}
                    style={{
                      fontSize: "0.74rem",
                      backgroundColor: "var(--qarar-surface-3)",
                      color: "var(--qarar-text)",
                      border: "1px solid var(--qarar-border)",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {copied === "json" ? "Copied" : "Copy JSON"}
                  </button>
                </div>
                <textarea
                  rows={16}
                  value={jsonText}
                  onChange={(e) => handleJsonTextChange(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "var(--qarar-code-bg)",
                    color: "var(--qarar-code-text)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "0.82rem",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--qarar-border)",
                    boxSizing: "border-box",
                    outline: "none",
                    lineHeight: "1.4",
                  }}
                />
              </div>
            )}

            {editorTab === "ts" && (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedCode, "ts")}
                    style={{
                      fontSize: "0.74rem",
                      backgroundColor: "var(--qarar-surface-3)",
                      color: "var(--qarar-text)",
                      border: "1px solid var(--qarar-border)",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {copied === "ts" ? "Copied" : "Copy Code"}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    width: "100%",
                    backgroundColor: "var(--qarar-code-bg)",
                    color: "var(--qarar-code-ts)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "0.82rem",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid var(--qarar-border)",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    boxSizing: "border-box",
                    lineHeight: "1.4",
                  }}
                >
                  {generatedCode}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Evaluation & Pushdown Queries */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          
          {/* Card 1: Live Evaluation & Input Payload */}
          <div
            style={{
              border: "1px solid var(--qarar-border)",
              borderRadius: "8px",
              backgroundColor: "var(--qarar-surface)",
              overflow: "hidden",
            }}
          >
            {/* Header with Status Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: "1px solid var(--qarar-border)",
                backgroundColor: "var(--qarar-surface-2)",
              }}
            >
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--qarar-text)" }}>
                Live Evaluation
              </span>

              {isDecision && decisionResult && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    backgroundColor: decisionResult.matched ? "var(--qarar-pass-bg)" : "var(--qarar-warn-bg)",
                    color: decisionResult.matched ? "var(--qarar-pass)" : "var(--qarar-warn)",
                    border: `1px solid ${decisionResult.matched ? "var(--qarar-pass-border)" : "var(--qarar-warn-border)"}`,
                  }}
                >
                  {decisionResult.matched
                    ? `Matched: ${decisionResult.matchedBranch?.id ?? "Case"}`
                    : "Default Fallback"}
                </span>
              )}

              {!isDecision && singleRuleResult && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    backgroundColor: singleRuleResult.result ? "var(--qarar-pass-bg)" : "var(--qarar-fail-bg)",
                    color: singleRuleResult.result ? "var(--qarar-pass)" : "var(--qarar-fail)",
                    border: `1px solid ${singleRuleResult.result ? "var(--qarar-pass-border)" : "var(--qarar-fail-border)"}`,
                  }}
                >
                  {singleRuleResult.result ? "Pass" : "Fail"}
                </span>
              )}
            </div>

            {/* Input Payload Textarea */}
            <div style={{ padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--qarar-text-muted)" }}>
                  Input Payload (JSON)
                </span>
                <button
                  type="button"
                  onClick={() => setDataInput(JSON.stringify(activePreset.sampleData, null, 2))}
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--qarar-primary)",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Reset Sample
                </button>
              </div>

              <textarea
                rows={5}
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "var(--qarar-input-bg)",
                  color: "var(--qarar-input-text)",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "0.82rem",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--qarar-input-border)",
                  boxSizing: "border-box",
                  outline: "none",
                  lineHeight: "1.4",
                }}
              />
              {jsonError && (
                <span style={{ color: "var(--qarar-fail)", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>
                  Invalid JSON syntax
                </span>
              )}

              {/* Decision Table Output */}
              {isDecision && decisionResult && (
                <div style={{ marginTop: "10px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--qarar-text-muted)" }}>
                    Output Data:
                  </span>
                  <pre
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "0.78rem",
                      fontFamily: "ui-monospace, monospace",
                      color: "var(--qarar-code-text)",
                      backgroundColor: "var(--qarar-code-bg)",
                      border: "1px solid var(--qarar-border)",
                      padding: "8px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    {JSON.stringify(decisionResult.output, null, 2)}
                  </pre>
                </div>
              )}

              {/* Explanations (Failure reasons) */}
              {!isDecision && singleRuleResult && !singleRuleResult.result && singleRuleResult.reasons.length > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "var(--qarar-fail-bg)",
                    border: "1px solid var(--qarar-fail-border)",
                    color: "var(--qarar-fail)",
                    fontSize: "0.78rem",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "4px" }}>Failure reasons:</strong>
                  <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.4" }}>
                    {singleRuleResult.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Execution Trace */}
              {!isDecision && singleRuleResult && (
                <div style={{ marginTop: "12px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--qarar-text-muted)", display: "block", marginBottom: "6px" }}>
                    Execution Trace
                  </span>
                  <div
                    style={{
                      backgroundColor: "var(--qarar-bg)",
                      border: "1px solid var(--qarar-border)",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontSize: "0.78rem",
                      fontFamily: "ui-monospace, monospace",
                      maxHeight: "140px",
                      overflowY: "auto",
                    }}
                  >
                    <TraceNodeView entry={singleRuleResult.trace} depth={0} theme={t} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Database Pushdown Queries */}
          {!isDecision && (
            <div
              style={{
                border: "1px solid var(--qarar-border)",
                borderRadius: "8px",
                backgroundColor: "var(--qarar-surface)",
                overflow: "hidden",
              }}
            >
              {/* Pushdown Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--qarar-border)",
                  backgroundColor: "var(--qarar-surface-2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--qarar-text)" }}>
                    Database Pushdown
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* SQL / Mongo Toggle */}
                  <div
                    style={{
                      display: "inline-flex",
                      backgroundColor: "var(--qarar-surface-3)",
                      borderRadius: "4px",
                      padding: "2px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPushdownTab("sql")}
                      style={{
                        padding: "2px 8px",
                        border: "none",
                        borderRadius: "3px",
                        backgroundColor: pushdownTab === "sql" ? "var(--qarar-bg)" : "transparent",
                        color: pushdownTab === "sql" ? "var(--qarar-text)" : "var(--qarar-text-muted)",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      SQL
                    </button>
                    <button
                      type="button"
                      onClick={() => setPushdownTab("mongo")}
                      style={{
                        padding: "2px 8px",
                        border: "none",
                        borderRadius: "3px",
                        backgroundColor: pushdownTab === "mongo" ? "var(--qarar-bg)" : "transparent",
                        color: pushdownTab === "mongo" ? "var(--qarar-text)" : "var(--qarar-text-muted)",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      MongoDB
                    </button>
                  </div>

                  {pushdownTab === "sql" && (
                    <select
                      value={sqlStyle}
                      onChange={(e) => setSqlStyle(e.target.value as any)}
                      style={{
                        height: "24px",
                        padding: "0 6px",
                        borderRadius: "4px",
                        border: "1px solid var(--qarar-border)",
                        backgroundColor: "var(--qarar-input-bg)",
                        color: "var(--qarar-text)",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      <option value="snake">snake_case</option>
                      <option value="quote">"quoted"</option>
                      <option value="path">path</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Pushdown Output */}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--qarar-text-muted)" }}>
                    {pushdownTab === "sql" ? "WHERE Clause" : "Filter Query"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        pushdownTab === "sql" ? sqlResult.sql : JSON.stringify(mongoCompiled.filter, null, 2),
                        "pushdown"
                      )
                    }
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--qarar-primary)",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {copied === "pushdown" ? "Copied" : "Copy"}
                  </button>
                </div>

                <pre
                  style={{
                    margin: 0,
                    backgroundColor: "var(--qarar-code-bg)",
                    color: "var(--qarar-code-text)",
                    border: "1px solid var(--qarar-border)",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "0.8rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    lineHeight: "1.4",
                  }}
                >
                  {pushdownTab === "sql" ? sqlResult.sql : JSON.stringify(mongoCompiled.filter, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trace Tree Component
// ---------------------------------------------------------------------------

function TraceNodeView({ entry, depth, theme }: { entry: TraceEntry; depth: number; theme: QararTheme }) {
  if (entry.type === "logical") {
    return (
      <div style={{ marginLeft: `${depth * 10}px`, margin: "4px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: entry.passed ? "var(--qarar-pass)" : "var(--qarar-fail)", fontWeight: 600, fontSize: "0.8rem" }}>
            {entry.passed ? "✓" : "✗"}
          </span>
          <span style={{ fontWeight: 600, color: "var(--qarar-text)", textTransform: "uppercase", fontSize: "0.74rem" }}>
            {entry.operator}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
          {entry.children.map((child, i) => (
            <TraceNodeView key={i} entry={child} depth={depth + 1} theme={theme} />
          ))}
        </div>
      </div>
    );
  }

  if (entry.type === "between") {
    return (
      <div style={{ marginLeft: `${depth * 10}px`, margin: "3px 0", color: entry.passed ? "var(--qarar-pass)" : "var(--qarar-fail)" }}>
        <span>{entry.passed ? "✓ " : "✗ "}</span>
        <span style={{ color: "var(--qarar-text)" }}>{entry.field}</span> between [{String(entry.min)}, {String(entry.max)}]
        <span style={{ color: "var(--qarar-text-muted)" }}> (value: {JSON.stringify(entry.actual)})</span>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: `${depth * 10}px`, margin: "3px 0", color: entry.passed ? "var(--qarar-pass)" : "var(--qarar-fail)" }}>
      <span>{entry.passed ? "✓ " : "✗ "}</span>
      <span style={{ color: "var(--qarar-text)" }}>{entry.field}</span> {entry.operator} {JSON.stringify(entry.expected)}
      <span style={{ color: "var(--qarar-text-muted)" }}> (value: {JSON.stringify(entry.actual)})</span>
    </div>
  );
}
