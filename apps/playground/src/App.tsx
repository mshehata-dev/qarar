import { useCallback, useEffect, useMemo, useState } from "react";
import { safeValidateRule, evaluate, explainFailures } from "@qarar/sdk";
import type { EvaluationResult } from "@qarar/sdk";
import type { RuleNode } from "@qarar/spec";
import { compile as compileSql } from "@qarar/compiler-sql";
import { compile as compileMongo } from "@qarar/compiler-mongo";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { TraceTree } from "./components/TraceTree";
import { Accordion } from "./components/Accordion";
import { DataInput } from "./components/DataInput";
import { CopyButton } from "./components/CopyButton";
import { DEFAULT_SCHEMA, OPERATOR_LABELS, inferFieldsFromData, mergeSchema } from "./schema";
import type { FieldDef, SchemaConfig } from "./schema";
import { RuleBuilder, type FieldDefinition } from "@qarar/react-builder";
import { EXAMPLES, CATEGORY_COLORS } from "./examples";
import { qararTokens } from "@qarar/theme";
import { cn } from "./lib/utils";
import {
  Play,
  Database,
  Layers,
  Code2,
  TriangleAlert,
  CheckCircle2,
  XCircle,
  Braces,
  Sun,
  Moon,
  RotateCcw,
  Home,
  BookOpen,
  Wrench,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const BRAND_NAME = "Qarar";
const THEME_STORAGE_KEY = "qarar.theme.v1";
const VERSION_STORAGE_KEY = "qarar.version.v1";
const VERSIONED_EXAMPLES: Record<string, typeof EXAMPLES> = {
  "0.1.0": EXAMPLES,
  "0.0.4": EXAMPLES,
  "0.0.3": EXAMPLES,
  "0.0.2": EXAMPLES,
};
const AVAILABLE_VERSIONS = Object.keys(VERSIONED_EXAMPLES);
const DEFAULT_VERSION = "0.0.4";

type AppSection = "landing" | "install" | "docs" | "playground";
type RuleTab = "builder" | "json";

const APP_SECTIONS: { id: AppSection; label: string; icon: React.ReactNode }[] = [
  { id: "landing", label: "Landing", icon: <Home size={12} /> },
  { id: "install", label: "Install Guide", icon: <Wrench size={12} /> },
  { id: "docs", label: "Technical Docs", icon: <BookOpen size={12} /> },
  { id: "playground", label: "Playground", icon: <FlaskConical size={12} /> },
];

function isSupportedVersion(version: string | undefined): version is string {
  return !!version && AVAILABLE_VERSIONS.includes(version);
}

function resolveVersion(version: string | undefined): string {
  return isSupportedVersion(version) ? version : DEFAULT_VERSION;
}

function getExamplesForVersion(version: string): typeof EXAMPLES {
  return VERSIONED_EXAMPLES[resolveVersion(version)] ?? EXAMPLES;
}

function getDefaultExampleId(version: string): string {
  return getExamplesForVersion(version)[0]?.id ?? EXAMPLES[0].id;
}

function sectionPath(section: AppSection, version: string): string {
  if (section === "landing") return "/";
  if (section === "install") return `/${version}/install`;
  if (section === "docs") return `/${version}/docs`;
  return `/${version}/playground/${getDefaultExampleId(version)}`;
}

function isSectionActive(section: AppSection, pathname: string, version: string): boolean {
  if (section === "landing") return pathname === "/";
  if (section === "install") return pathname === `/${version}/install`;
  if (section === "docs") return pathname === `/${version}/docs`;
  return pathname.startsWith(`/${version}/playground/`);
}

function mapPathToVersion(pathname: string, version: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "install" || (isSupportedVersion(parts[0]) && parts[1] === "install")) return `/${version}/install`;
  if (parts[0] === "docs" || (isSupportedVersion(parts[0]) && parts[1] === "docs")) return `/${version}/docs`;
  if (parts[0] === "playground") {
    const candidate = isSupportedVersion(parts[1]) ? parts[2] : parts[1];
    const resolved = getExamplesForVersion(version).some((e) => e.id === candidate) ? candidate : getDefaultExampleId(version);
    return `/${version}/playground/${resolved}`;
  }
  if (isSupportedVersion(parts[0]) && parts[1] === "playground") {
    const candidate = parts[2];
    const resolved = getExamplesForVersion(version).some((e) => e.id === candidate) ? candidate : getDefaultExampleId(version);
    return `/${version}/playground/${resolved}`;
  }
  return pathname;
}

function readStoredTheme(): boolean {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) !== "light";
  } catch {
    return true;
  }
}

function readStoredVersion(): string {
  try {
    return resolveVersion(localStorage.getItem(VERSION_STORAGE_KEY) ?? undefined);
  } catch {
    return DEFAULT_VERSION;
  }
}

export default function App() {
  const [dark, setDark] = useState<boolean>(() => readStoredTheme());
  const [selectedVersion, setSelectedVersion] = useState<string>(() => readStoredVersion());
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      // Browser privacy mode may block storage writes.
    }
  }, [dark]);

  useEffect(() => {
    try {
      localStorage.setItem(VERSION_STORAGE_KEY, selectedVersion);
    } catch {
      // Browser privacy mode may block storage writes.
    }
  }, [selectedVersion]);

  useEffect(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const routeVersion = isSupportedVersion(parts[0])
      ? parts[0]
      : parts[0] === "docs"
        ? (isSupportedVersion(parts[1]) ? parts[1] : undefined)
        : parts[0] === "playground"
          ? (isSupportedVersion(parts[1]) ? parts[1] : undefined)
          : undefined;
    if (routeVersion && routeVersion !== selectedVersion) {
      setSelectedVersion(routeVersion);
    }
  }, [location.pathname, selectedVersion]);

  function handleVersionChange(next: string) {
    const resolved = resolveVersion(next);
    setSelectedVersion(resolved);
    navigate(mapPathToVersion(location.pathname, resolved), { replace: true });
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-base text-ink">
      <nav className="h-12 shrink-0 flex items-center justify-between px-4 bg-surface border-b border-rim">
        <div className="flex items-center gap-2.5">
          <span className="text-accent font-black text-lg leading-none">◈</span>
          <span className="font-bold text-[15px] tracking-tight">{BRAND_NAME}</span>
          <select
            value={selectedVersion}
            onChange={(e) => handleVersionChange(e.target.value)}
            className="h-7 rounded-md border border-rim bg-base px-2 text-[11px] font-semibold text-muted hover:text-ink"
            title="Select docs/playground version"
          >
            {AVAILABLE_VERSIONS.map((version) => (
              <option key={version} value={version}>
                v{version}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 bg-base border border-rim rounded-md p-0.5">
          {APP_SECTIONS.map((item) => (
            <NavLink
              key={item.id}
              to={sectionPath(item.id, selectedVersion)}
              end={item.id === "landing"}
              className={() =>
                cn(
                  "h-7 px-2.5 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors",
                  isSectionActive(item.id, location.pathname, selectedVersion)
                    ? "bg-accent text-white"
                    : "text-muted hover:text-ink hover:bg-surface"
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
        <button
          onClick={() => setDark((v) => !v)}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-rim text-muted hover:text-ink hover:border-rim-2 transition-colors text-[11px] font-medium"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun size={13} /> : <Moon size={13} />}
          {dark ? "Light" : "Dark"}
        </button>
      </nav>

      <main className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          <Route path="/" element={<LandingSection version={selectedVersion} />} />
          <Route path="/install" element={<Navigate to={`/${selectedVersion}/install`} replace />} />
          <Route path="/docs" element={<Navigate to={`/${selectedVersion}/docs`} replace />} />
          <Route path="/playground" element={<Navigate to={`/${selectedVersion}/playground/${getDefaultExampleId(selectedVersion)}`} replace />} />
          <Route path="/:version/install" element={<VersionedInstallSection />} />
          <Route path="/:version/docs" element={<TechnicalDocsSection />} />
          <Route path="/:version/playground" element={<VersionedPlaygroundIndex />} />
          <Route path="/:version/playground/:exampleId" element={<PlaygroundSection dark={dark} />} />
          <Route path="/docs/:version" element={<LegacyDocsRedirect />} />
          <Route path="/playground/:version/:exampleId" element={<LegacyVersionedPlaygroundRedirect />} />
          <Route path="/playground/:exampleId" element={<LegacyPlaygroundRedirect version={selectedVersion} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function LandingSection({ version }: { version: string }) {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <div className="rounded-2xl border border-rim bg-surface p-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">{BRAND_NAME}</p>
          <h1 className="text-4xl font-black tracking-tight mt-2">Decision intelligence for modern product teams.</h1>
          <p className="text-sm text-subtle mt-3 max-w-3xl">
            Define business policy once, execute deterministically, and ship explainable pass/fail outcomes.
            Built for risk, compliance, support, and engineering workflows.
          </p>
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            <Link
              to={`/${version}/playground/${getDefaultExampleId(version)}`}
              className="inline-flex items-center justify-center h-10 px-5 rounded-md border border-accent bg-accent text-white text-sm font-semibold hover:brightness-105 active:translate-y-px transition-all shadow-sm"
            >
              Open Playground
            </Link>
            <Link
              to={`/${version}/docs`}
              className="inline-flex items-center justify-center h-10 px-5 rounded-md border border-rim text-sm font-semibold text-subtle hover:text-ink hover:border-rim-2 transition-colors"
            >
              Read Technical Docs
            </Link>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard title="Spec-first" text="Typed JSON AST with strict validation and release-safe portability." />
          <FeatureCard title="Explainable" text="Trace every decision path with clear failure reasons for auditability." />
          <FeatureCard title="Composable" text="Author with visual builder or JSON and evaluate anywhere in your stack." />
        </div>
        <Card title="Why Qarar">
          <div className="grid md:grid-cols-2 gap-3 text-[12px] text-muted">
            <div>✅ Deterministic rule outcomes with stable behavior across versions.</div>
            <div>✅ Built-in explainability for customer support and compliance review.</div>
            <div>✅ Versioned docs + versioned playground routes for release-safe onboarding.</div>
            <div>✅ Internal compiler layer for SQL/Mongo targeting without exposing complexity.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-rim bg-surface p-4">
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-[12px] text-muted mt-1">{text}</p>
    </div>
  );
}

function InstallGuideSection() {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <h2 className="text-2xl font-bold tracking-tight">{BRAND_NAME} SDK Install Guide</h2>
        <Card title="Single SDK package (recommended)">
          <CodeBlock code={`pnpm add @qarar/sdk`} />
        </Card>
        <Card title="Rebrand status">
          <p className="text-[12px] text-muted">
            Product branding is now <strong className="text-ink">Qarar</strong>. The npm scope currently remains
            <code className="text-accent"> @qarar/* </code>
            for compatibility and will be migrated in a future release.
          </p>
        </Card>
        <Card title="Typical usage">
          <CodeBlock
            code={`import { safeValidateRule, evaluate, explainFailures } from "@qarar/sdk";
// SQL/Mongo compilers are internal modules in this repository.
import { compile as compileSql } from "@qarar/compiler-sql";
import { compile as compileMongo } from "@qarar/compiler-mongo";

const parsed = safeValidateRule(ruleJson);
if (!parsed.success) throw parsed.error;

const result = evaluate(parsed.data, inputData);
const { sql } = compileSql(parsed.data);
const { filter } = compileMongo(parsed.data);
const failures = explainFailures(result.trace);`}
          />
        </Card>
        <Card title="Monorepo scripts">
          <CodeBlock code={`pnpm install\npnpm lint\npnpm test\npnpm build\npnpm --filter @qarar/playground dev`} />
        </Card>
      </div>
    </div>
  );
}

function VersionedInstallSection() {
  const { version } = useParams<{ version: string }>();
  if (!isSupportedVersion(version)) {
    return <Navigate to={`/${DEFAULT_VERSION}/install`} replace />;
  }
  return <InstallGuideSection />;
}

function LegacyDocsRedirect() {
  const { version } = useParams<{ version: string }>();
  const resolvedVersion = resolveVersion(version);
  return <Navigate to={`/${resolvedVersion}/docs`} replace />;
}

function TechnicalDocsSection() {
  const { version } = useParams<{ version: string }>();
  if (!isSupportedVersion(version)) {
    return <Navigate to={`/${DEFAULT_VERSION}/docs`} replace />;
  }
  const docsVersion = resolveVersion(version);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <h2 className="text-2xl font-bold tracking-tight">{BRAND_NAME} Technical Documentation</h2>
        <div className="text-[12px] text-muted">
          Docs version: <code className="text-accent">v{docsVersion}</code>. Future releases should keep this version route
          available so examples/docs remain linked to the release they were published with.
        </div>
        <Card title="Architecture flow">
          <CodeBlock code={`Qarar Rule AST -> validate (@qarar/sdk)\n-> evaluate + trace (@qarar/sdk)\n-> explain failures (@qarar/sdk)\n-> compile SQL (internal)\n-> compile Mongo (internal)`} />
        </Card>
        <Card title="Execution contract">
          <ul className="list-disc ml-4 text-[12px] text-muted space-y-1">
            <li>Validation runs before execution and returns structured schema errors.</li>
            <li>Evaluation is deterministic and produces a full trace tree for explainability.</li>
            <li>Fail states are surfaced explicitly (invalid JSON, schema errors, runtime errors).</li>
            <li>Rules and examples are version-addressed by route for release-safe documentation.</li>
          </ul>
        </Card>
        <Card title="Versioning policy">
          <div className="text-[12px] text-muted space-y-1">
            <p>Public docs route: <code className="text-accent">/{docsVersion}/docs</code></p>
            <p>Playground route: <code className="text-accent">/{docsVersion}/playground/:exampleId</code></p>
            <p>New versions should add docs/examples without mutating prior version behavior.</p>
          </div>
        </Card>
        <Card title="Supported operators">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
              <div key={key} className="text-[12px] border border-rim rounded px-2 py-1 bg-surface-2 flex justify-between gap-2">
                <code className="text-accent">{key}</code>
                <span className="text-muted">{label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Rule AST example">
          <CodeBlock
            code={`{
  "id": "premium-eligibility",
  "name": "Premium Eligibility",
  "version": "1",
  "root": {
    "type": "and",
    "conditions": [
      { "type": "gte", "left": { "type": "field", "path": "customer.age" }, "right": { "type": "number", "value": 18 } },
      { "type": "in", "left": { "type": "field", "path": "customer.plan" }, "right": { "type": "array", "values": [{ "type": "string", "value": "premium" }, { "type": "string", "value": "enterprise" }] } }
    ]
  }
}`}
          />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-rim bg-surface p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {children}
    </section>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="text-[11px] leading-relaxed text-ink font-mono whitespace-pre-wrap break-all bg-base border border-rim rounded-md p-3">
      {code}
    </pre>
  );
}

// ------------------------- Playground section -------------------------

const WORKSPACE_STATE_KEY = "qarar.playground.workspace.v2";
const OUTPUT_PANEL_COLLAPSED_KEY = "qarar.playground.output.collapsed.v1";

interface WorkspaceState {
  selectedId: string;
  ruleTab: RuleTab;
  ruleText: string;
  dataText: string;
}

function LegacyPlaygroundRedirect({ version }: { version: string }) {
  const { exampleId } = useParams<{ exampleId: string }>();
  const examples = getExamplesForVersion(version);
  const resolved = examples.some((e) => e.id === exampleId) ? exampleId : getDefaultExampleId(version);
  return <Navigate to={`/${version}/playground/${resolved}`} replace />;
}

function LegacyVersionedPlaygroundRedirect() {
  const { version, exampleId } = useParams<{ version: string; exampleId: string }>();
  const resolvedVersion = resolveVersion(version);
  const examples = getExamplesForVersion(resolvedVersion);
  const resolvedExampleId = examples.some((e) => e.id === exampleId) ? exampleId : getDefaultExampleId(resolvedVersion);
  return <Navigate to={`/${resolvedVersion}/playground/${resolvedExampleId}`} replace />;
}

function VersionedPlaygroundIndex() {
  const { version } = useParams<{ version: string }>();
  const resolvedVersion = resolveVersion(version);
  return <Navigate to={`/${resolvedVersion}/playground/${getDefaultExampleId(resolvedVersion)}`} replace />;
}

function PlaygroundSection({ dark }: { dark: boolean }) {
  const navigate = useNavigate();
  const { version, exampleId } = useParams<{ version: string; exampleId: string }>();
  const resolvedVersion = resolveVersion(version);
  const examples = useMemo(() => getExamplesForVersion(resolvedVersion), [resolvedVersion]);
  const categories = useMemo(() => Array.from(new Set(examples.map((e) => e.category))), [examples]);
  const defaultExample = examples[0] ?? EXAMPLES[0];
  const workspaceKey = `${WORKSPACE_STATE_KEY}.${resolvedVersion}`;

  const [selectedId, setSelectedId] = useState(defaultExample.id);
  const current = examples.find((e) => e.id === selectedId) ?? defaultExample;
  const [ruleTab, setRuleTab] = useState<RuleTab>("builder");
  const [ruleText, setRuleText] = useState(() => JSON.stringify(defaultExample.rule, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dataText, setDataText] = useState(() => JSON.stringify(defaultExample.data, null, 2));
  const [schema, setSchema] = useState<SchemaConfig>(() => mergeSchema(DEFAULT_SCHEMA, inferFieldsFromData(defaultExample.data)));
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [sqlOutput, setSqlOutput] = useState<string | null>(null);
  const [mongoOutput, setMongoOutput] = useState<string | null>(null);
  const [failures, setFailures] = useState<string[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [outputCollapsed, setOutputCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(OUTPUT_PANEL_COLLAPSED_KEY);
      return stored === null ? true : stored === "1";
    } catch {
      return true;
    }
  });

  const currentRule = useMemo<RuleNode>(() => {
    try {
      const parsed = JSON.parse(ruleText);
      return (parsed && typeof parsed === "object" && "root" in parsed)
        ? (parsed.root as RuleNode)
        : ((defaultExample.rule as { root: RuleNode }).root);
    } catch {
      return (defaultExample.rule as { root: RuleNode }).root;
    }
  }, [ruleText, defaultExample.rule]);

  const handleRuleChange = useCallback((updatedRoot: RuleNode) => {
    try {
      const parsed = JSON.parse(ruleText) as Record<string, unknown>;
      parsed.root = updatedRoot;
      setRuleText(JSON.stringify(parsed, null, 2));
    } catch {
      setRuleText(JSON.stringify({ name: current.name, root: updatedRoot }, null, 2));
    }
  }, [ruleText, current.name]);

  const builderFields = useMemo<FieldDefinition[]>(() => {
    return schema.fields.map((f) => ({
      path: f.path,
      label: f.label,
      type: (f.enumValues && f.enumValues.length > 0 ? "enum" : f.type) as "string" | "number" | "boolean" | "enum",
      options: f.enumValues,
    }));
  }, [schema.fields]);

  const handleInferredFields = useCallback((fields: FieldDef[]) => {
    setSchema(mergeSchema(DEFAULT_SCHEMA, fields));
  }, []);

  const resolveExampleId = useCallback(
    (id?: string) => examples.find((e) => e.id === id)?.id ?? defaultExample.id,
    [defaultExample.id, examples]
  );

  const loadExample = useCallback((id: string) => {
    const ex = examples.find((e) => e.id === id) ?? defaultExample;
    setSelectedId(ex.id);
    setRuleText(JSON.stringify(ex.rule, null, 2));
    setDataText(JSON.stringify(ex.data, null, 2));
    setSchema(mergeSchema(DEFAULT_SCHEMA, inferFieldsFromData(ex.data)));
    setJsonError(null);
    setResult(null);
    setSqlOutput(null);
    setMongoOutput(null);
    setFailures(null);
    setRunError(null);
  }, [defaultExample, examples]);

  useEffect(() => {
    const normalizedVersion = resolveVersion(version);
    const normalizedExampleId = resolveExampleId(exampleId);
    if (version !== normalizedVersion || exampleId !== normalizedExampleId) {
      navigate(`/${normalizedVersion}/playground/${normalizedExampleId}`, { replace: true });
    }
  }, [exampleId, navigate, resolveExampleId, version]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(workspaceKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
      const routeId = resolveExampleId(exampleId);
      const ex = examples.find((e) => e.id === routeId) ?? defaultExample;
      const nextRuleText = parsed.ruleText ?? JSON.stringify(ex.rule, null, 2);
      const nextDataText = parsed.dataText ?? JSON.stringify(ex.data, null, 2);
      setSelectedId(ex.id);
      setRuleTab(parsed.ruleTab === "json" ? "json" : "builder");
      setRuleText(nextRuleText);
      setDataText(nextDataText);
      try {
        setSchema(mergeSchema(DEFAULT_SCHEMA, inferFieldsFromData(JSON.parse(nextDataText) as Record<string, unknown>)));
      } catch {
        setSchema(mergeSchema(DEFAULT_SCHEMA, inferFieldsFromData(ex.data)));
      }
      setWorkspaceError(null);
    } catch (e) {
      setWorkspaceError(`Failed to load saved workspace: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [defaultExample, exampleId, examples, resolveExampleId, workspaceKey]);

  useEffect(() => {
    const routeId = resolveExampleId(exampleId);
    if (routeId !== selectedId) {
      loadExample(routeId);
    }
  }, [exampleId, resolveExampleId, selectedId, loadExample]);

  useEffect(() => {
    try {
      const state: WorkspaceState = { selectedId, ruleTab, ruleText, dataText };
      localStorage.setItem(workspaceKey, JSON.stringify(state));
      setWorkspaceError(null);
    } catch (e) {
      setWorkspaceError(`Failed to save workspace: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [dataText, ruleTab, ruleText, selectedId, workspaceKey]);

  useEffect(() => {
    try {
      localStorage.setItem(OUTPUT_PANEL_COLLAPSED_KEY, outputCollapsed ? "1" : "0");
    } catch {
      // Browser privacy mode may block storage writes.
    }
  }, [outputCollapsed]);

  function resetWorkspace() {
    try {
      localStorage.removeItem(workspaceKey);
      setWorkspaceError(null);
    } catch (e) {
      setWorkspaceError(`Failed to clear saved workspace: ${e instanceof Error ? e.message : String(e)}`);
    }
    setRuleTab("builder");
    navigate(`/${resolvedVersion}/playground/${defaultExample.id}`, { replace: true });
  }

  function switchTab(next: RuleTab) {
    setJsonError(null);
    if (ruleTab === "json" && next === "builder") {
      try {
        const parsed = JSON.parse(ruleText);
        if (!parsed || typeof parsed !== "object" || !("root" in parsed)) {
          setJsonError("Rule JSON must contain a 'root' node.");
          return;
        }
      } catch {
        setJsonError("Fix JSON errors before switching to Builder.");
        return;
      }
    }
    setRuleTab(next);
  }

  function run() {
    setRunError(null);
    setResult(null);
    setSqlOutput(null);
    setMongoOutput(null);
    setFailures(null);

    let parsedRule: unknown;
    let parsedData: unknown;
    try {
      parsedRule = JSON.parse(ruleText);
    } catch {
      setRunError("Rule JSON is invalid.");
      return;
    }
    try {
      parsedData = JSON.parse(dataText);
    } catch {
      setRunError("Test data JSON is invalid.");
      return;
    }

    const validated = safeValidateRule(parsedRule);
    if (!validated.success) {
      setRunError(`Schema error:\n${validated.error.issues.map((i) => `  ${i.path.join(".")} — ${i.message}`).join("\n")}`);
      return;
    }
    try {
      const evalResult = evaluate(validated.data, parsedData as Record<string, unknown>);
      setResult(evalResult);
      setSqlOutput(compileSql(validated.data).sql);
      setMongoOutput(JSON.stringify(compileMongo(validated.data).filter, null, 2));
      setFailures(explainFailures(evalResult.trace));
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    }
  }

  const catColor = CATEGORY_COLORS[current.category] ?? qararTokens.dark.primary;

  return (
    <div className="h-full flex overflow-hidden">
      <aside className="w-52 shrink-0 flex flex-col border-r border-rim bg-surface overflow-y-auto">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">Examples</span>
          <button
            onClick={resetWorkspace}
            className="h-6 px-2 rounded border border-rim text-[10px] text-muted hover:text-ink hover:border-rim-2"
            title="Reset playground workspace"
          >
            <RotateCcw size={11} />
          </button>
        </div>
        {categories.map((cat) => (
          <div key={cat} className="mb-3">
            <div className="flex items-center gap-1.5 px-4 py-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[cat] ?? qararTokens.dark.primary }} />
              <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: CATEGORY_COLORS[cat] ?? qararTokens.dark.primary }}>
                {cat}
              </span>
            </div>
            {examples.filter((e) => e.category === cat).map((ex) => {
              const active = selectedId === ex.id;
              const color = CATEGORY_COLORS[ex.category] ?? qararTokens.dark.primary;
              return (
                <button
                  key={ex.id}
                  onClick={() => navigate(`/${resolvedVersion}/playground/${ex.id}`)}
                  title={ex.description}
                  style={active ? { background: `${color}18`, borderRight: `2px solid ${color}`, color } : {}}
                  className={cn(
                    "w-full text-left px-4 py-1.5 text-[12px] transition-colors",
                    active ? "font-semibold pr-3" : "text-subtle hover:text-ink hover:bg-surface-2 border-r-2 border-r-transparent"
                  )}
                >
                  {ex.name}
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="flex-1 flex overflow-hidden">
      <div
        className={cn("flex flex-col border-r border-rim min-w-0", outputCollapsed ? "flex-[1.2]" : "")}
        style={outputCollapsed ? undefined : { width: "37%" }}
      >
          <PanelHeader title="Rule">
            <div className="flex items-center gap-0.5 bg-base border border-rim rounded-md p-0.5">
              {(["builder", "json"] as RuleTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 h-6 rounded text-[11px] font-medium transition-all",
                    ruleTab === t ? "bg-accent text-white" : "text-muted hover:text-subtle"
                  )}
                >
                  {t === "builder" ? <Layers size={11} /> : <Code2 size={11} />}
                  {t === "builder" ? "Builder" : "JSON"}
                </button>
              ))}
            </div>
          </PanelHeader>
          <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-rim/40 bg-base/50">
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm shrink-0"
              style={{ background: catColor, color: dark ? "#000" : "#fff" }}
            >
              {current.category}
            </span>
            <span className="text-[11px] text-muted truncate">{current.description}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {jsonError && (
              <div className="flex items-start gap-2 text-[11px] text-fail bg-fail/10 border border-fail/25 rounded-lg px-3 py-2 mb-3">
                <TriangleAlert size={12} className="mt-px shrink-0" />
                {jsonError}
              </div>
            )}
            {ruleTab === "builder" ? (
              <RuleBuilder
                value={currentRule}
                onChange={handleRuleChange}
                fields={builderFields}
                theme={dark ? "dark" : "light"}
              />
            ) : (
              <textarea value={ruleText} onChange={(e) => setRuleText(e.target.value)} rows={28} spellCheck={false} />
            )}
          </div>
        </div>

        <div
          className={cn("flex flex-col border-r border-rim min-w-0", outputCollapsed ? "flex-1" : "")}
          style={outputCollapsed ? undefined : { width: "28%" }}
        >
          <PanelHeader title="Test Data" />
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <DataInput value={dataText} onChange={setDataText} onInferFields={handleInferredFields} />
            <div className="flex items-center gap-2">
              <button onClick={run} className="flex items-center gap-2 self-start bg-accent hover:opacity-90 active:scale-[0.97] text-white font-semibold text-sm px-5 h-9 rounded-lg transition-all">
                <Play size={13} className="fill-white" /> Run
              </button>
            </div>

            {workspaceError && (
              <div className="bg-warn/8 border border-warn/25 rounded-lg px-3 py-2">
                <pre className="text-[11px] text-warn whitespace-pre-wrap font-mono leading-relaxed">{workspaceError}</pre>
              </div>
            )}
            {runError && (
              <div className="bg-fail/8 border border-fail/25 rounded-lg px-3 py-3">
                <pre className="text-[11px] text-fail whitespace-pre-wrap font-mono leading-relaxed">{runError}</pre>
              </div>
            )}
            {result && (
              <div className={cn("flex flex-col gap-3 border-2 rounded-xl p-4 bg-surface", result.result ? "border-pass/50" : "border-fail/50")}>
                <div className="flex items-center gap-2.5">
                  {result.result ? <CheckCircle2 size={18} className="text-pass shrink-0" /> : <XCircle size={18} className="text-fail shrink-0" />}
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-sm font-bold tracking-wide", result.result ? "text-pass" : "text-fail")}>{result.result ? "PASS" : "FAIL"}</span>
                    <span className="text-[11px] text-muted">{result.result ? "All conditions met" : `${failures?.length ?? 0} failed`}</span>
                  </div>
                </div>
                {failures && failures.length > 0 && (
                  <div className="bg-fail/8 border border-fail/20 rounded-lg px-3 py-2.5 flex flex-col gap-1.5">
                    {failures.map((f, i) => (
                      <div key={i} className="text-[11px] text-fail leading-snug flex items-start gap-1.5">
                        <span className="shrink-0 font-bold mt-px">✗</span>
                        {f}
                      </div>
                    ))}
                  </div>
                )}
                <Accordion title="Evaluation Trace" icon={<span>🌿</span>} defaultOpen>
                  <TraceTree trace={result.trace} />
                </Accordion>
              </div>
            )}
          </div>
        </div>

        <div className={cn("flex flex-col min-w-0 border-l border-rim transition-[width]", outputCollapsed ? "w-10" : "flex-1")}>
          {outputCollapsed ? (
            <div className="h-full flex flex-col items-center">
              <button
                onClick={() => setOutputCollapsed(false)}
                className="h-10 w-full border-b border-rim bg-surface text-muted hover:text-ink transition-colors flex items-center justify-center"
                title="Show compiled output"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] tracking-widest uppercase font-bold text-muted mt-3">
                Output
              </div>
            </div>
          ) : (
            <>
              <PanelHeader title="Compiled Output">
                <button
                  onClick={() => setOutputCollapsed(true)}
                  className="h-6 px-2 rounded border border-rim text-[10px] text-muted hover:text-ink hover:border-rim-2 transition-colors flex items-center gap-1"
                  title="Hide compiled output"
                >
                  <ChevronRight size={12} />
                  Hide
                </button>
              </PanelHeader>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                <Accordion
                  title="SQL WHERE Clause"
                  icon={<Database size={12} />}
                  defaultOpen
                  accentClass="text-accent"
                  actions={sqlOutput ? <CopyButton text={`WHERE ${sqlOutput}`} /> : undefined}
                >
                  {sqlOutput ? (
                    <pre className="text-[11px] font-mono text-ink whitespace-pre-wrap break-all leading-relaxed">
                      <span className="text-accent font-bold">WHERE </span>
                      {sqlOutput}
                    </pre>
                  ) : (
                    <p className="text-[11px] text-muted italic py-0.5">Run a rule to see the SQL WHERE clause</p>
                  )}
                </Accordion>

                <Accordion
                  title="MongoDB Filter"
                  icon={<span className="text-emerald-500 text-xs">🍃</span>}
                  defaultOpen
                  accentClass="text-emerald-500"
                  actions={mongoOutput ? <CopyButton text={mongoOutput} /> : undefined}
                >
                  {mongoOutput ? (
                    <pre className="text-[11px] font-mono text-ink whitespace-pre-wrap break-all leading-relaxed">{mongoOutput}</pre>
                  ) : (
                    <p className="text-[11px] text-muted italic py-0.5">Run a rule to see the MongoDB filter</p>
                  )}
                </Accordion>

                <Accordion title="Rule AST (JSON)" icon={<Braces size={12} />} defaultOpen={false} accentClass="text-warn" actions={<CopyButton text={ruleText} />}>
                  <pre className="text-[11px] font-mono text-ink whitespace-pre-wrap break-all leading-relaxed">{ruleText}</pre>
                </Accordion>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-surface border-b border-rim">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{title}</span>
      {children}
    </div>
  );
}
