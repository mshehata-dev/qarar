import { useState, useEffect } from "react";
import {
  rule,
  switchRule,
  checkRule,
  checkDecisionTable,
  compileToSQL,
  compileToMongo,
  Rule,
  RuleNode,
  DecisionTable,
  TraceEntry,
} from "@qarar/sdk";
import { RuleBuilder } from "@qarar/react-builder";
import { getThemeTokens, qararTokens, type QararTheme } from "@qarar/theme";

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
    title: "🛒 E-Commerce VIP Discount Gate",
    category: "E-Commerce",
    badgeColor: qararTokens.dark.primary,
    description: "Grants 20% discount if customer is 18+, on a VIP/Premium plan, and cart exceeds $100.",
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
    id: "decision-matrix",
    title: "🔀 Pricing Tier Switch Matrix",
    category: "Decision Table",
    badgeColor: qararTokens.dark.accent,
    description: "Dynamic switch case evaluating customer tier & cart total to return specific discount & shipping perks.",
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
    title: "🛡️ FinTech Risk & Fraud Assessment",
    category: "FinTech",
    badgeColor: qararTokens.dark.fail,
    description: "Flags high-value transactions (> $5,000) when the user is unverified or located in a flagged region.",
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
    title: "🚀 SaaS Enterprise Feature Gate",
    category: "SaaS",
    badgeColor: qararTokens.dark.pass,
    description: "Unlocks advanced analytics for Admins, or Enterprise accounts with 50 or fewer seats.",
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
    title: "🔒 Medical Privacy & Consent Gate",
    category: "Healthcare",
    badgeColor: qararTokens.dark.warn,
    description: "Grants access if patient consent is verified, age >= 21, and data region matches 'EU' or 'US'.",
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
    title: "✈️ Loyalty Lounge Upgrade Gate",
    category: "Travel",
    badgeColor: qararTokens.dark.primaryLight,
    description: "Qualifies passenger for lounge access if flight is International and flyer status is Gold or Platinum.",
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

function generateTSCode(node: RuleNode, indent = "  "): string {
  if (node.type === "and") {
    const parts = node.conditions.map((c) => generateTSCode(c, indent + "  "));
    return `and(\n${parts.map((p) => `${indent}  ${p}`).join(",\n")}\n${indent})`;
  }
  if (node.type === "or") {
    const parts = node.conditions.map((c) => generateTSCode(c, indent + "  "));
    return `or(\n${parts.map((p) => `${indent}  ${p}`).join(",\n")}\n${indent})`;
  }
  if (node.type === "not") {
    return `not(${generateTSCode(node.condition, indent)})`;
  }
  if (node.type === "between") {
    const fieldPath = node.left.type === "field" ? node.left.path : "";
    const minVal = "value" in node.min ? node.min.value : 0;
    const maxVal = "value" in node.max ? node.max.value : 0;
    return `where("${fieldPath}").between(${minVal}, ${maxVal})`;
  }
  const fieldPath = node.left.type === "field" ? node.left.path : "";
  const val = node.right;
  let valStr = "";
  if (val.type === "string") valStr = `"${val.value}"`;
  else if (val.type === "number" || val.type === "boolean") valStr = String(val.value);
  else if (val.type === "null") valStr = "null";
  else if (val.type === "array") {
    const items = val.values.map((v) => ("value" in v ? typeof v.value === "string" ? `"${v.value}"` : String(v.value) : "null"));
    valStr = `[${items.join(", ")}]`;
  }
  return `where("${fieldPath}").${node.type}(${valStr})`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InteractivePlayground() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activePreset, setActivePreset] = useState<Preset>(PRESETS[0]);
  const [currentRule, setCurrentRule] = useState<Rule>(PRESETS[0].rule!);
  const [currentDecisionTable, setCurrentDecisionTable] = useState<DecisionTable<unknown> | undefined>(PRESETS[0].decisionTable);
  const [dataInput, setDataInput] = useState<string>(
    JSON.stringify(PRESETS[0].sampleData, null, 2)
  );
  const [jsonText, setJsonText] = useState<string>(
    JSON.stringify(PRESETS[0].isDecisionTable ? PRESETS[0].decisionTable : PRESETS[0].rule, null, 2)
  );
  const [editorTab, setEditorTab] = useState<"visual" | "matrix" | "json" | "ts">("visual");
  const [sqlStyle, setSqlStyle] = useState<"snake" | "quote" | "path">("snake");
  const [copied, setCopied] = useState<string | null>(null);

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

  // Dynamic theme tokens from @qarar/theme
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
      setJsonText(JSON.stringify(p.decisionTable, null, 2));
      setEditorTab("matrix");
    } else if (p.rule) {
      setCurrentRule(p.rule);
      setJsonText(JSON.stringify(p.rule, null, 2));
      setEditorTab("visual");
    }
    setDataInput(JSON.stringify(p.sampleData, null, 2));
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
        } else if ("root" in parsed) {
          setCurrentRule(parsed as Rule);
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
  const isDecision = activePreset.isDecisionTable && currentDecisionTable;
  const decisionResult = isDecision ? checkDecisionTable(currentDecisionTable, testDataObj) : null;
  const singleRuleResult = !isDecision ? checkRule(currentRule, testDataObj) : null;

  const sqlResult = !isDecision ? compileToSQL(currentRule, { columnStyle: sqlStyle }) : { sql: "N/A (Decision Table)" };
  const mongoCompiled = !isDecision ? compileToMongo(currentRule) : { filter: { note: "N/A (Decision Table)" } };

  const generatedCode = isDecision
    ? `import { switchRule, rule, where, checkDecisionTable } from "@qarar/sdk";

const pricingMatrix = switchRule("${currentDecisionTable?.name}")
  .id("${currentDecisionTable?.id}")
  .case("vip-branch", rule().where("customer.tier").eq("vip").and("cart.total").gte(200))
    .then({ discountPercent: 25, freeShipping: true })
  .default(${JSON.stringify(currentDecisionTable?.defaultOutput)})
  .build();

const decision = checkDecisionTable(pricingMatrix, data);
console.log(decision.matchedBranch?.id); // "${decisionResult?.matchedBranch?.id}"`
    : `import { rule, where, checkRule } from "@qarar/sdk";

const ${currentRule.id.replace(/[^a-zA-Z0-9]+/g, "_")} = rule("${currentRule.name}")
  .id("${currentRule.id}")
  .where(${generateTSCode(currentRule.root)})
  .build();

const decision = checkRule(${currentRule.id.replace(/[^a-zA-Z0-9]+/g, "_")}, data);
console.log(decision.result); // ${singleRuleResult?.result}`;

  return (
    <div
      className="not-content"
      style={{
        borderRadius: "16px",
        border: `1px solid ${t.border}`,
        backgroundColor: t.bg,
        color: t.text,
        padding: "20px",
        boxShadow: t.shadow,
        fontFamily: "system-ui, -apple-system, sans-serif",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}
    >
      {/* Sleek Preset Template Toolbar */}
      <div
        style={{
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "16px",
            padding: "12px 16px",
            backgroundColor: t.subcardBg,
            border: `1px solid ${t.border}`,
            borderRadius: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: t.textMuted }}>
              Rule Template:
            </span>
            <select
              value={activePreset.id}
              onChange={(e) => {
                const found = PRESETS.find((p) => p.id === e.target.value);
                if (found) loadPreset(found);
              }}
              style={{
                height: "36px",
                padding: "0 12px",
                borderRadius: "6px",
                border: `1px solid ${t.inputBorder}`,
                backgroundColor: t.inputBg,
                color: t.text,
                fontSize: "0.85rem",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
                minWidth: "260px",
              }}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <span
              style={{
                fontSize: "0.78rem",
                color: t.textMuted,
                maxWidth: "380px",
                lineHeight: "1.3",
              }}
            >
              {activePreset.description}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                const blankRule: Rule = {
                  id: "custom-rule-v1",
                  name: "New Custom Rule",
                  version: "1",
                  root: {
                    type: "eq",
                    left: { type: "field", path: "user.role" },
                    right: { type: "string", value: "admin" },
                  },
                };
                setCurrentRule(blankRule);
                setJsonText(JSON.stringify(blankRule, null, 2));
                setEditorTab("visual");
              }}
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: isDark ? "#94a3b8" : "#475569",
                backgroundColor: "transparent",
                border: `1px solid ${t.borderSubtle}`,
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              + New Blank Rule
            </button>
            <a
              href="/recipes/ecommerce-discounts/"
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: t.primary,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              📖 View Recipes in Docs →
            </a>
          </div>
        </div>
      </div>

      {/* Main Studio Dual Pane */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "22px" }}>
        
        {/* Left Pane: Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          
          {/* Editor Tabs Navigation */}
          <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, backgroundColor: t.subcardBg, borderRadius: "10px 10px 0 0", padding: "4px 8px 0 8px" }}>
            {!isDecision && (
              <button
                type="button"
                onClick={() => setEditorTab("visual")}
                style={{
                  padding: "10px 18px",
                  borderBottom: editorTab === "visual" ? `3px solid ${t.primary}` : "3px solid transparent",
                  color: editorTab === "visual" ? t.primary : t.textMuted,
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                }}
              >
                🎨 Visual Builder
              </button>
            )}

            {isDecision && (
              <button
                type="button"
                onClick={() => setEditorTab("matrix")}
                style={{
                  padding: "10px 18px",
                  borderBottom: editorTab === "matrix" ? `3px solid ${t.accent}` : "3px solid transparent",
                  color: editorTab === "matrix" ? t.accent : t.textMuted,
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                }}
              >
                🔀 Decision Matrix View
              </button>
            )}

            <button
              type="button"
              onClick={() => setEditorTab("json")}
              style={{
                padding: "10px 18px",
                borderBottom: editorTab === "json" ? `3px solid ${t.primary}` : "3px solid transparent",
                color: editorTab === "json" ? t.primary : t.textMuted,
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.88rem",
              }}
            >
              📄 JSON AST Editor
            </button>

            <button
              type="button"
              onClick={() => setEditorTab("ts")}
              style={{
                padding: "10px 18px",
                borderBottom: editorTab === "ts" ? `3px solid ${t.primary}` : "3px solid transparent",
                color: editorTab === "ts" ? t.primary : t.textMuted,
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.88rem",
              }}
            >
              ⚡ TypeScript Code
            </button>
          </div>

          {/* Active Tab Views */}
          {editorTab === "visual" && !isDecision && (
            <div>
              <RuleBuilder
                value={currentRule}
                onChange={handleRuleNodeChange}
                fields={activePreset.fields}
                theme={t}
              />
            </div>
          )}

          {editorTab === "matrix" && isDecision && currentDecisionTable && (
            <div style={{ backgroundColor: t.subcardBg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, color: t.accent, fontSize: "1rem", fontWeight: 800 }}>
                  🔀 Decision Table Matrix: {currentDecisionTable.name}
                </h4>
                <span style={{ fontSize: "0.75rem", backgroundColor: t.accentSubtle, color: t.accent, padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                  Mode: {currentDecisionTable.mode ?? "first"} match wins
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {currentDecisionTable.branches.map((b, i) => {
                  const isMatchedBranch = decisionResult?.matchedBranch?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor: isMatchedBranch ? t.passBorder : t.border,
                        backgroundColor: isMatchedBranch ? t.passBg : t.cardBg,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontWeight: 800, color: isMatchedBranch ? t.pass : t.text, fontSize: "0.88rem" }}>
                          Case {i + 1}: {b.name ?? b.id}
                        </span>
                        {isMatchedBranch ? (
                          <span style={{ backgroundColor: t.pass, color: "#ffffff", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 800 }}>
                            MATCHED BRANCH ✅
                          </span>
                        ) : (
                          <span style={{ color: t.textMuted, fontSize: "0.72rem" }}>Skipped</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: t.textMuted, marginTop: "4px" }}>
                        Output Payload: <code style={{ color: t.codeText }}>{JSON.stringify(b.output)}</code>
                      </div>
                    </div>
                  );
                })}

                <div style={{ padding: "10px 12px", borderRadius: "8px", border: `1px dashed ${t.borderSubtle}`, backgroundColor: t.cardBg, fontSize: "0.8rem", color: t.textMuted }}>
                  ⚪ Default Fallback Output: <code style={{ color: t.codeTs }}>{JSON.stringify(currentDecisionTable.defaultOutput)}</code>
                </div>
              </div>
            </div>
          )}

          {editorTab === "json" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(jsonText, "json")}
                  style={{
                    fontSize: "0.75rem",
                    backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                    color: t.text,
                    border: `1px solid ${t.borderSubtle}`,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {copied === "json" ? "Copied! ✓" : "Copy JSON AST"}
                </button>
              </div>
              <textarea
                rows={18}
                value={jsonText}
                onChange={(e) => handleJsonTextChange(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: t.codeBg,
                  color: t.codeText,
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  padding: "14px",
                  borderRadius: "10px",
                  border: `1px solid ${t.border}`,
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
                    fontSize: "0.75rem",
                    backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                    color: t.text,
                    border: `1px solid ${t.borderSubtle}`,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {copied === "ts" ? "Copied! ✓" : "Copy TypeScript Code"}
                </button>
              </div>
              <pre
                style={{
                  width: "100%",
                  backgroundColor: t.codeBg,
                  color: t.codeTs,
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  padding: "14px",
                  borderRadius: "10px",
                  border: `1px solid ${t.border}`,
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

          {/* Database Target Query Generator (Single Rules Only) */}
          {!isDecision && (
            <div style={{ backgroundColor: t.subcardBg, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                <h4 style={{ margin: 0, color: t.text, fontSize: "0.95rem", fontWeight: 700 }}>
                  🗄️ Database Query Pushdown (Live Compiler)
                </h4>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: t.textMuted }}>Column Style:</span>
                  {(["snake", "quote", "path"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSqlStyle(style)}
                      style={{
                        fontSize: "0.72rem",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        border: "1px solid",
                        borderColor: sqlStyle === style ? t.primary : t.borderSubtle,
                        backgroundColor: sqlStyle === style ? t.primaryHover : "transparent",
                        color: sqlStyle === style ? "#ffffff" : t.textMuted,
                        cursor: "pointer",
                      }}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem", fontFamily: "monospace" }}>
                <div style={{ backgroundColor: t.cardBg, padding: "12px", borderRadius: "8px", border: `1px solid ${t.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: t.accent, fontWeight: "bold", marginBottom: "6px" }}>
                    <span>SQL WHERE Clause (~1.6M ops/sec)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sqlResult.sql, "sql")}
                      style={{ fontSize: "0.72rem", color: t.textMuted, border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                    >
                      {copied === "sql" ? "Copied!" : "Copy SQL"}
                    </button>
                  </div>
                  <div
                    style={{
                      backgroundColor: t.codeBg,
                      color: t.codeText,
                      border: `1px solid ${t.border}`,
                      padding: "10px 14px",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      fontSize: "0.85rem",
                      lineHeight: "1.4",
                    }}
                  >
                    {sqlResult.sql || "Invalid SQL"}
                  </div>
                </div>

                <div style={{ backgroundColor: t.cardBg, padding: "12px", borderRadius: "8px", border: `1px solid ${t.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: t.primary, fontWeight: "bold", marginBottom: "6px" }}>
                    <span>MongoDB Filter Object (~13.7M ops/sec)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(mongoCompiled.filter), "mongo")}
                      style={{ fontSize: "0.72rem", color: t.textMuted, border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                    >
                      {copied === "mongo" ? "Copied!" : "Copy Mongo"}
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      backgroundColor: t.codeBg,
                      color: t.codeText,
                      border: `1px solid ${t.border}`,
                      padding: "10px 14px",
                      borderRadius: "6px",
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.3",
                    }}
                  >
                    {JSON.stringify(mongoCompiled.filter, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Test Data Payload & Live Decision Outcome */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Data Payload Input */}
          <div style={{ backgroundColor: t.subcardBg, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <h4 style={{ margin: 0, color: t.text, fontSize: "0.95rem", fontWeight: 700 }}>
                📥 Mock Input Payload (JSON Data)
              </h4>
              <button
                type="button"
                onClick={() => setDataInput(JSON.stringify(activePreset.sampleData, null, 2))}
                style={{ fontSize: "0.72rem", color: t.primary, backgroundColor: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Reset Sample Data
              </button>
            </div>
            <textarea
              rows={8}
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: t.inputBg,
                color: t.inputDataColor,
                fontFamily: "monospace",
                fontSize: "0.85rem",
                padding: "12px",
                borderRadius: "8px",
                border: `1px solid ${t.inputBorder}`,
                boxSizing: "border-box",
                outline: "none",
                lineHeight: "1.4",
              }}
            />
            {jsonError && (
              <span style={{ color: t.fail, fontSize: "0.75rem", display: "block", marginTop: "6px", fontWeight: 600 }}>
                ⚠️ Syntax Error: Invalid JSON format
              </span>
            )}
          </div>

          {/* Decision Outcome Status Banner */}
          {isDecision && decisionResult && (
            <div
              style={{
                backgroundColor: decisionResult.matched ? t.passBg : t.failBg,
                border: `1.5px solid ${decisionResult.matched ? t.passBorder : t.failBorder}`,
                borderRadius: "12px",
                padding: "18px",
                boxShadow: decisionResult.matched ? "0 0 20px rgba(16, 185, 129, 0.2)" : "0 0 20px rgba(239, 68, 68, 0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: "1.05rem", color: decisionResult.matched ? (isDark ? t.text : t.pass) : (isDark ? t.text : t.fail) }}>
                    Decision Table Match:
                  </span>
                  <div style={{ fontSize: "0.8rem", color: t.textMuted, marginTop: "2px" }}>
                    Matched Branch: <strong style={{ color: decisionResult.matched ? t.pass : t.warn }}>{decisionResult.matchedBranch?.name ?? decisionResult.matchedBranch?.id ?? "Default Fallback"}</strong>
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: decisionResult.matched ? t.pass : t.warn,
                    color: "#ffffff",
                    padding: "6px 16px",
                    borderRadius: "9999px",
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  {decisionResult.matched ? "MATCHED ✅" : "DEFAULT FALLBACK ⚪"}
                </span>
              </div>

              <div style={{ marginTop: "12px", borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "12px" }}>
                <strong style={{ fontSize: "0.85rem", color: decisionResult.matched ? t.pass : t.warn }}>
                  Selected Output Config:
                </strong>
                <pre style={{ margin: "6px 0 0 0", fontSize: "0.82rem", color: t.codeText, backgroundColor: t.codeBg, border: `1px solid ${t.border}`, padding: "10px", borderRadius: "6px" }}>
                  {JSON.stringify(decisionResult.output, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!isDecision && singleRuleResult && (
            <div
              style={{
                backgroundColor: singleRuleResult.result ? t.passBg : t.failBg,
                border: `1.5px solid ${singleRuleResult.result ? t.passBorder : t.failBorder}`,
                borderRadius: "12px",
                padding: "18px",
                boxShadow: singleRuleResult.result ? "0 0 20px rgba(16, 185, 129, 0.2)" : "0 0 20px rgba(239, 68, 68, 0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: "1.05rem", color: singleRuleResult.result ? (isDark ? t.text : t.pass) : (isDark ? t.text : t.fail) }}>
                    Rule Evaluation Outcome:
                  </span>
                  <div style={{ fontSize: "0.78rem", color: t.textMuted, marginTop: "2px" }}>
                    Latency: ~0.0002 ms (~4.4M evals/sec)
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: singleRuleResult.result ? t.pass : t.fail,
                    color: "#ffffff",
                    padding: "6px 16px",
                    borderRadius: "9999px",
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  {singleRuleResult.result ? "PASS ✅" : "FAIL ❌"}
                </span>
              </div>

              {/* Failure Reasons */}
              <div style={{ marginTop: "12px", borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "12px" }}>
                <strong style={{ fontSize: "0.85rem", color: singleRuleResult.result ? t.pass : t.fail }}>
                  Human Audit Explanation (explainFailures):
                </strong>
                {singleRuleResult.reasons.length === 0 ? (
                  <p style={{ margin: "6px 0 0 0", fontSize: "0.85rem", color: t.pass }}>
                    All rule conditions were satisfied successfully!
                  </p>
                ) : (
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px", fontSize: "0.85rem", color: t.fail, lineHeight: "1.5" }}>
                    {singleRuleResult.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Execution Trace Visualizer */}
          {!isDecision && singleRuleResult && (
            <div style={{ backgroundColor: t.subcardBg, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px" }}>
              <h4 style={{ margin: "0 0 10px 0", color: t.text, fontSize: "0.95rem", fontWeight: 700 }}>
                🌳 Execution Trace Tree Visualizer
              </h4>
              <div style={{ fontSize: "0.82rem", fontFamily: "monospace", overflowX: "auto" }}>
                <TraceNodeView entry={singleRuleResult.trace} depth={0} theme={t} />
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
      <div style={{ marginLeft: `${depth * 14}px`, borderLeft: `2px solid ${theme.borderSubtle}`, paddingLeft: "10px", margin: "6px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: entry.passed ? theme.pass : theme.fail, fontWeight: "bold", fontSize: "0.9rem" }}>
            {entry.passed ? "✓" : "✗"}
          </span>
          <span style={{ fontWeight: 800, color: entry.operator === "or" ? theme.accent : theme.primary, textTransform: "uppercase" }}>
            {entry.operator} GATE
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          {entry.children.map((child, i) => (
            <TraceNodeView key={i} entry={child} depth={depth + 1} theme={theme} />
          ))}
        </div>
      </div>
    );
  }

  if (entry.type === "between") {
    return (
      <div style={{ marginLeft: `${depth * 14}px`, color: entry.passed ? theme.pass : theme.fail, margin: "4px 0" }}>
        <span>{entry.passed ? "✓" : "✗"} </span>
        <span style={{ color: theme.primaryLight }}>{entry.field}</span> between [{String(entry.min)}, {String(entry.max)}]
        <span style={{ color: theme.textMuted }}> (actual: {JSON.stringify(entry.actual)})</span>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: `${depth * 14}px`, color: entry.passed ? theme.pass : theme.fail, margin: "4px 0" }}>
      <span>{entry.passed ? "✓" : "✗"} </span>
      <span style={{ color: theme.primaryLight }}>{entry.field}</span> {entry.operator} {JSON.stringify(entry.expected)}
      <span style={{ color: theme.textMuted }}> (actual: {JSON.stringify(entry.actual)})</span>
    </div>
  );
}
