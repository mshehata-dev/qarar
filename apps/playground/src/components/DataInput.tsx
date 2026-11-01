import { useState, useEffect } from "react";
import { FileJson, ArrowLeftRight, LayoutGrid, Plus, X } from "lucide-react";
import { cn } from "../lib/utils";
import { inferFieldsFromData } from "../schema";
import type { FieldDef } from "../schema";

const MAX_DATA_INPUT_CHARS = 100_000;
const MAX_CSV_LINES = 5_000;

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function csvToObject(csv: string): Record<string, unknown> {
  if (csv.length > MAX_DATA_INPUT_CHARS) {
    throw new Error(`CSV input too large (${csv.length} chars). Limit is ${MAX_DATA_INPUT_CHARS}.`);
  }
  const lines = csv.trim().split("\n").filter((l) => l.trim());
  if (lines.length > MAX_CSV_LINES) {
    throw new Error(`CSV input has too many rows (${lines.length}). Limit is ${MAX_CSV_LINES}.`);
  }
  if (lines.length === 0) return {};
  const firstLine = lines[0].split(",").map((s) => s.trim().replace(/"/g, ""));
  const secondLine = lines[1]?.split(",").map((s) => s.trim().replace(/"/g, "")) ?? [];
  const firstCell = firstLine[0]?.toLowerCase() ?? "";
  const isKeyValue =
    firstLine.length === 2 &&
    (firstCell === "field" || firstCell === "path" || firstCell === "key" || firstLine[0].includes(".") || secondLine[0]?.includes("."));

  if (isKeyValue && lines.length >= 1) {
    const result: Record<string, unknown> = {};
    const startIndex = firstCell === "field" || firstCell === "path" || firstCell === "key" ? 1 : 0;
    for (const line of lines.slice(startIndex)) {
      const [rawKey, rawVal] = line.split(",").map((s) => s.trim());
      if (!rawKey) continue;
      setNested(result, rawKey.replace(/"/g, ""), parseValue(rawVal?.replace(/"/g, "") ?? ""));
    }
    return result;
  }
  const headers = firstLine.map((h) => h.trim().replace(/"/g, ""));
  const dataRow = lines[1]?.split(",").map((v) => v.trim().replace(/"/g, "")) ?? [];
  const result: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    setNested(result, h, parseValue(dataRow[i] ?? ""));
  });
  return result;
}

function parseValue(raw: string): unknown {
  const lower = raw.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  if (lower === "null" || lower === "") return null;
  const num = Number(raw);
  if (!Number.isNaN(num) && raw.trim() !== "") return num;
  return raw;
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cur) || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

interface FormEntry { id: string; key: string; value: string; }

function formEntriesToObject(entries: FormEntry[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const e of entries) {
    if (!e.key.trim()) continue;
    setNested(result, e.key.trim(), parseValue(e.value));
  }
  return result;
}

function objectToFormEntries(obj: Record<string, unknown>): FormEntry[] {
  const entries: FormEntry[] = [];
  function flatten(o: unknown, prefix: string) {
    if (o !== null && typeof o === "object" && !Array.isArray(o)) {
      for (const [k, v] of Object.entries(o as Record<string, unknown>))
        flatten(v, prefix ? `${prefix}.${k}` : k);
    } else {
      entries.push({ id: Math.random().toString(36).slice(2), key: prefix, value: String(o ?? "") });
    }
  }
  flatten(obj, "");
  return entries;
}

// ---------------------------------------------------------------------------
// DataInput
// ---------------------------------------------------------------------------

type InputFormat = "json" | "csv" | "form";

interface Props {
  value: string;
  onChange: (json: string) => void;
  onInferFields?: (fields: FieldDef[]) => void;
}

const TABS: { id: InputFormat; label: string; icon: React.ReactNode }[] = [
  { id: "json", label: "JSON", icon: <FileJson size={13} /> },
  { id: "csv",  label: "CSV",  icon: <ArrowLeftRight size={13} /> },
  { id: "form", label: "Form", icon: <LayoutGrid size={13} /> },
];

export function DataInput({ value, onChange, onInferFields }: Props) {
  const [format, setFormat] = useState<InputFormat>("json");
  const [csvText, setCsvText] = useState("");
  const [formEntries, setFormEntries] = useState<FormEntry[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  function switchFormat(next: InputFormat) {
    setParseError(null);
    if (next === "csv" && format !== "csv") {
      try {
        const flat = objectToFormEntries(JSON.parse(value) as Record<string, unknown>);
        const seededCsv = flat.map((e) => `${e.key},${e.value}`).join("\n");
        if (seededCsv.length > MAX_DATA_INPUT_CHARS) {
          setParseError(`Generated CSV is too large to edit safely. Limit is ${MAX_DATA_INPUT_CHARS} chars.`);
          setCsvText("");
        } else {
          setCsvText(seededCsv);
        }
      } catch { setCsvText(""); }
    }
    if (next === "form" && format !== "form") {
      try {
        setFormEntries(objectToFormEntries(JSON.parse(value) as Record<string, unknown>));
      } catch { setFormEntries([]); }
    }
    setFormat(next);
  }

  useEffect(() => {
    if (format !== "csv") return;
    try {
      const parsed = csvToObject(csvText);
      onChange(JSON.stringify(parsed, null, 2));
      onInferFields?.(inferFieldsFromData(parsed));
      setParseError(null);
    } catch (e) { setParseError(e instanceof Error ? e.message : "CSV parse error"); }
  }, [csvText, format, onChange, onInferFields]);

  useEffect(() => {
    if (format !== "form") return;
    const parsed = formEntriesToObject(formEntries);
    onChange(JSON.stringify(parsed, null, 2));
    onInferFields?.(inferFieldsFromData(parsed));
  }, [formEntries, format, onChange, onInferFields]);

  useEffect(() => {
    if (format !== "json") return;
    try {
      if (value.length > MAX_DATA_INPUT_CHARS) {
        setParseError(`JSON input is too large (${value.length} chars). Limit is ${MAX_DATA_INPUT_CHARS}.`);
        return;
      }
      const parsed = JSON.parse(value) as Record<string, unknown>;
      onInferFields?.(inferFieldsFromData(parsed));
      setParseError(null);
    } catch (e) {
      setParseError(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [value, format, onInferFields]);

  const monoClass = "w-full leading-relaxed";

  return (
    <div className="flex flex-col gap-2.5">
      {/* Tab strip */}
      <div className="flex gap-0.5 bg-base border border-rim rounded-md p-0.5 w-fit">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => switchFormat(id)}
            className={cn(
              "flex items-center gap-1 px-3 h-[26px] rounded text-[11px] font-medium transition-all",
              format === id
                ? "bg-accent text-white"
                : "text-muted hover:text-subtle"
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {parseError && (
        <div className="text-[11px] text-fail bg-fail/10 border border-fail/30 rounded-md px-3 py-2">
          {parseError}
        </div>
      )}

      {format === "json" && (
        <textarea
          className={monoClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={9}
          spellCheck={false}
        />
      )}

      {format === "csv" && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted">
            Format: <code className="text-accent font-mono">field.path,value</code> or regular CSV headers.
          </p>
          <textarea
            className={monoClass}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={9}
            spellCheck={false}
            placeholder={"customer.age,25\ncustomer.plan,premium\ncustomer.country,US"}
          />
        </div>
      )}

      {format === "form" && (
        <div className="flex flex-col gap-2 bg-surface border border-rim rounded-lg p-3">
          {formEntries.map((e) => (
            <div key={e.id} className="flex items-center gap-2">
              <input
                value={e.key}
                onChange={(ev) => setFormEntries((p) => p.map((x) => x.id === e.id ? { ...x, key: ev.target.value } : x))}
                placeholder="field.path"
                spellCheck={false}
                className="w-40 font-mono text-[11px]"
              />
              <span className="text-accent font-bold">=</span>
              <input
                value={e.value}
                onChange={(ev) => setFormEntries((p) => p.map((x) => x.id === e.id ? { ...x, value: ev.target.value } : x))}
                placeholder="value"
                spellCheck={false}
                className="flex-1 font-mono text-[11px]"
              />
              <button
                onClick={() => setFormEntries((p) => p.filter((x) => x.id !== e.id))}
                className="flex items-center justify-center w-6 h-6 text-muted hover:text-fail hover:bg-fail/10 rounded transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setFormEntries((p) => [...p, { id: Math.random().toString(36).slice(2), key: "", value: "" }])}
            className="flex items-center gap-1.5 text-[11px] text-muted hover:text-ink border border-dashed border-rim hover:border-rim-2 rounded px-3 h-7 mt-1 self-start transition-colors"
          >
            <Plus size={11} /> Add field
          </button>
        </div>
      )}
    </div>
  );
}
