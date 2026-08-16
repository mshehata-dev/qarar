import { useState } from "react";
import {
  rule,
  checkRule,
  compileToSQL,
  compileToMongo,
  Rule,
  RuleNode,
  TraceEntry,
} from "@qarar/sdk";
import { RuleBuilder } from "@qarar/react-builder";

// ---------------------------------------------------------------------------
// Presets Definition
// ---------------------------------------------------------------------------

interface Preset {
  id: string;
  title: string;
  badge?: string;
  description: string;
  rule: Rule;
  sampleData: Record<string, unknown>;
  fields: { path: string; label: string; type?: "string" | "number" | "boolean" | "enum" }[];
}

const PRESETS: Preset[] = [
  {
    id: "ecommerce",
    title: "🛒 E-Commerce VIP Discount",
    badge: "E-Commerce",
    description: "Applies 20% discount if customer is 18+, on a VIP/Premium plan, and total cart exceeds $100.",
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
    id: "fintech",
    title: "🛡️ FinTech Risk & Fraud Assessment",
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
    title: "🚀 SaaS Enterprise Feature Flag",
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
    title: "🔒 Health & Privacy Data Gate",
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
    title: "✈️ Loyalty Upgrade Gate",
    description: "Qualifies passenger for lounge access if flight is International and frequent flyer status is Gold or Platinum.",
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
  const [activePreset, setActivePreset] = useState<Preset>(PRESETS[0]);
  const [currentRule, setCurrentRule] = useState<Rule>(PRESETS[0].rule);
  const [dataInput, setDataInput] = useState<string>(
    JSON.stringify(PRESETS[0].sampleData, null, 2)
  );
  const [jsonText, setJsonText] = useState<string>(
    JSON.stringify(PRESETS[0].rule, null, 2)
  );
  const [editorTab, setEditorTab] = useState<"visual" | "json" | "ts">("visual");
  const [sqlStyle, setSqlStyle] = useState<"snake" | "quote" | "path">("snake");
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function loadPreset(p: Preset) {
    setActivePreset(p);
    setCurrentRule(p.rule);
    setJsonText(JSON.stringify(p.rule, null, 2));
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
      if (parsed && typeof parsed === "object" && "root" in parsed) {
        setCurrentRule(parsed);
      }
    } catch {
      // ignore parsing errors while typing
    }
  }

  let testDataObj: Record<string, unknown> = {};
  let jsonError = false;
  try {
    testDataObj = JSON.parse(dataInput);
  } catch {
    jsonError = true;
  }

  const checkResult = checkRule(currentRule, testDataObj);
  const sqlResult = compileToSQL(currentRule, { columnStyle: sqlStyle });
  const mongoCompiled = compileToMongo(currentRule);

  const generatedCode = `import { rule, where, or, checkRule } from "@qarar/sdk";

const ${currentRule.id.replace(/[^a-zA-Z0-9]+/g, "_")} = rule("${currentRule.name}")
  .id("${currentRule.id}")
  .where(${generateTSCode(currentRule.root)})
  .build();

const decision = checkRule(${currentRule.id.replace(/[^a-zA-Z0-9]+/g, "_")}, data);
console.log(decision.result); // ${checkResult.result}`;

  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #334155",
        backgroundColor: "#020617",
        color: "#f8fafc",
        padding: "24px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, color: "#60a5fa", fontSize: "1.4rem", fontWeight: 800 }}>
              ⚡ Qarar Interactive Rule Studio & Playground
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
              Build rules visually or via JSON, test live data payloads, and generate production SQL & MongoDB queries.
            </p>
          </div>
          <span
            style={{
              backgroundColor: "#1e293b",
              color: "#38bdf8",
              border: "1px solid #334155",
              padding: "4px 12px",
              borderRadius: "9999px",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            v0.0.4 SDK Live
          </span>
        </div>

        <div style={{ backgroundColor: "#1e1b4b", border: "1px solid #6366f1", borderRadius: "8px", padding: "10px 14px", marginTop: "12px", fontSize: "0.85rem", color: "#e0e7ff" }}>
          💡 <strong>Zero-Deploy Dynamic Logic:</strong> Save this JSON AST in PostgreSQL, MongoDB, or Redis. Update rules live in your database without editing code or redeploying servers!
        </div>

        {/* Presets Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "16px" }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => loadPreset(p)}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid",
                borderColor: activePreset.id === p.id ? "#3b82f6" : "#1e293b",
                backgroundColor: activePreset.id === p.id ? "#1e3a8a" : "#0f172a",
                color: activePreset.id === p.id ? "#ffffff" : "#cbd5e1",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "0.85rem", color: activePreset.id === p.id ? "#93c5fd" : "#f1f5f9" }}>
                {p.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px", lineHeight: "1.2" }}>
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
        {/* Left Section: Editors */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Tabs Navigation */}
          <div style={{ display: "flex", borderBottom: "1px solid #334155", backgroundColor: "#0f172a", borderRadius: "8px 8px 0 0", padding: "4px 8px 0 8px" }}>
            <button
              type="button"
              onClick={() => setEditorTab("visual")}
              style={{
                padding: "8px 16px",
                borderBottom: editorTab === "visual" ? "3px solid #3b82f6" : "none",
                color: editorTab === "visual" ? "#60a5fa" : "#94a3b8",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              🎨 Visual Builder
            </button>
            <button
              type="button"
              onClick={() => setEditorTab("json")}
              style={{
                padding: "8px 16px",
                borderBottom: editorTab === "json" ? "3px solid #3b82f6" : "none",
                color: editorTab === "json" ? "#60a5fa" : "#94a3b8",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              📄 JSON AST
            </button>
            <button
              type="button"
              onClick={() => setEditorTab("ts")}
              style={{
                padding: "8px 16px",
                borderBottom: editorTab === "ts" ? "3px solid #3b82f6" : "none",
                color: editorTab === "ts" ? "#60a5fa" : "#94a3b8",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              ⚡ TypeScript Code
            </button>
          </div>

          {/* Active Tab View */}
          {editorTab === "visual" && (
            <div style={{ borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#0f172a", padding: "12px" }}>
              <RuleBuilder
                value={currentRule}
                onChange={handleRuleNodeChange}
                fields={activePreset.fields}
              />
            </div>
          )}

          {editorTab === "json" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(jsonText, "json")}
                  style={{ fontSize: "0.75rem", backgroundColor: "#1e293b", color: "#cbd5e1", border: "1px solid #334155", padding: "2px 8px", borderRadius: "4px", cursor: "pointer" }}
                >
                  {copied === "json" ? "Copied! ✓" : "Copy JSON"}
                </button>
              </div>
              <textarea
                rows={16}
                value={jsonText}
                onChange={(e) => handleJsonTextChange(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#090d16",
                  color: "#38bdf8",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {editorTab === "ts" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedCode, "ts")}
                  style={{ fontSize: "0.75rem", backgroundColor: "#1e293b", color: "#cbd5e1", border: "1px solid #334155", padding: "2px 8px", borderRadius: "4px", cursor: "pointer" }}
                >
                  {copied === "ts" ? "Copied! ✓" : "Copy Code"}
                </button>
              </div>
              <pre
                style={{
                  width: "100%",
                  backgroundColor: "#090d16",
                  color: "#a7f3d0",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  boxSizing: "border-box",
                }}
              >
                {generatedCode}
              </pre>
            </div>
          )}

          {/* Database Target Query Generator */}
          <div style={{ marginTop: "12px", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "10px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <h4 style={{ margin: 0, color: "#e2e8f0", fontSize: "0.95rem", fontWeight: 700 }}>
                🗄️ Database Query Pushdown (Live)
              </h4>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>SQL Style:</span>
                {(["snake", "quote", "path"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setSqlStyle(style)}
                    style={{
                      fontSize: "0.7rem",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: "1px solid",
                      borderColor: sqlStyle === style ? "#3b82f6" : "#334155",
                      backgroundColor: sqlStyle === style ? "#1e40af" : "transparent",
                      color: sqlStyle === style ? "#ffffff" : "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8rem", fontFamily: "monospace" }}>
              <div style={{ backgroundColor: "#020617", padding: "10px", borderRadius: "6px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#a855f7", fontWeight: "bold", marginBottom: "4px" }}>
                  <span>SQL WHERE Clause</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sqlResult.sql, "sql")}
                    style={{ fontSize: "0.7rem", color: "#94a3b8", border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                  >
                    {copied === "sql" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <code style={{ color: "#e2e8f0", wordBreak: "break-all" }}>
                  {sqlResult.sql || "Invalid SQL"}
                </code>
              </div>

              <div style={{ backgroundColor: "#020617", padding: "10px", borderRadius: "6px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#38bdf8", fontWeight: "bold", marginBottom: "4px" }}>
                  <span>MongoDB Filter</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(JSON.stringify(mongoCompiled.filter), "mongo")}
                    style={{ fontSize: "0.7rem", color: "#94a3b8", border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                  >
                    {copied === "mongo" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre style={{ margin: 0, color: "#e2e8f0", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(mongoCompiled.filter, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Test Input Data & Evaluation Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Data Payload Input */}
          <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "10px", padding: "14px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#e2e8f0", fontSize: "0.95rem", fontWeight: 700 }}>
              📥 Mock Input Payload (JSON Data)
            </h4>
            <textarea
              rows={8}
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#020617",
                color: "#4ade80",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #334155",
                boxSizing: "border-box",
              }}
            />
            {jsonError && (
              <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block", marginTop: "4px" }}>
                Syntax Error: Invalid JSON input format
              </span>
            )}
          </div>

          {/* Decision Status Badge */}
          <div
            style={{
              backgroundColor: checkResult.result ? "#064e3b" : "#450a0a",
              border: `1.5px solid ${checkResult.result ? "#059669" : "#dc2626"}`,
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                Rule Decision Outcome:
              </span>
              <span
                style={{
                  backgroundColor: checkResult.result ? "#10b981" : "#ef4444",
                  color: "#ffffff",
                  padding: "6px 16px",
                  borderRadius: "9999px",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  letterSpacing: "0.05em",
                  boxShadow: checkResult.result ? "0 0 10px rgba(16, 185, 129, 0.4)" : "0 0 10px rgba(239, 68, 68, 0.4)",
                }}
              >
                {checkResult.result ? "PASS ✅" : "FAIL ❌"}
              </span>
            </div>

            {/* Failure Reasons */}
            <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px" }}>
              <strong style={{ fontSize: "0.85rem", color: checkResult.result ? "#a7f3d0" : "#fca5a5" }}>
                Human Explanation / Audit Trail:
              </strong>
              {checkResult.reasons.length === 0 ? (
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#a7f3d0" }}>
                  All rule conditions were satisfied successfully!
                </p>
              ) : (
                <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px", fontSize: "0.85rem", color: "#fca5a5", lineHeight: "1.4" }}>
                  {checkResult.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Interactive Trace Tree Visualizer */}
          <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "10px", padding: "14px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#e2e8f0", fontSize: "0.95rem", fontWeight: 700 }}>
              🌳 Execution Trace Tree
            </h4>
            <div style={{ fontSize: "0.8rem", fontFamily: "monospace", overflowX: "auto" }}>
              <TraceNodeView entry={checkResult.trace} depth={0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trace Tree Component
// ---------------------------------------------------------------------------

function TraceNodeView({ entry, depth }: { entry: TraceEntry; depth: number }) {
  if (entry.type === "logical") {
    return (
      <div style={{ marginLeft: `${depth * 12}px`, borderLeft: "2px solid #334155", paddingLeft: "8px", margin: "4px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: entry.passed ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
            {entry.passed ? "✓" : "✗"}
          </span>
          <span style={{ fontWeight: "bold", color: "#60a5fa", textTransform: "uppercase" }}>
            {entry.operator}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          {entry.children.map((child, i) => (
            <TraceNodeView key={i} entry={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  if (entry.type === "between") {
    return (
      <div style={{ marginLeft: `${depth * 12}px`, color: entry.passed ? "#86efac" : "#fca5a5", margin: "2px 0" }}>
        <span>{entry.passed ? "✓" : "✗"} </span>
        <span style={{ color: "#93c5fd" }}>{entry.field}</span> between [{String(entry.min)}, {String(entry.max)}]
        <span style={{ color: "#94a3b8" }}> (actual: {JSON.stringify(entry.actual)})</span>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: `${depth * 12}px`, color: entry.passed ? "#86efac" : "#fca5a5", margin: "2px 0" }}>
      <span>{entry.passed ? "✓" : "✗"} </span>
      <span style={{ color: "#93c5fd" }}>{entry.field}</span> {entry.operator} {JSON.stringify(entry.expected)}
      <span style={{ color: "#94a3b8" }}> (actual: {JSON.stringify(entry.actual)})</span>
    </div>
  );
}
