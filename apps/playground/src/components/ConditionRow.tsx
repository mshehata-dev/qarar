import { useMemo, useState } from "react";
import type { FieldDef, SchemaConfig } from "../schema";
import type { BuilderComparison } from "../builderModel";
import { OPERATOR_LABELS } from "../schema";
import { cn } from "../lib/utils";
import { X } from "lucide-react";

interface Props {
  node: BuilderComparison;
  schema: SchemaConfig;
  onChange: (updated: BuilderComparison) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const ARRAY_OPS = new Set(["in", "notIn"]);
const STRING_OPS = new Set(["contains", "notContains", "startsWith", "endsWith", "matches", "notMatches"]);
const UNARY_OPS = new Set(["isNull", "isNotNull"]);

export function ConditionRow({ node, schema, onChange, onRemove, canRemove }: Props) {
  const field: FieldDef | undefined = schema.fields.find((f) => f.path === node.field);
  const [arrayDraft, setArrayDraft] = useState("");
  const arrayValues = useMemo(
    () => node.value.split(",").map((s) => s.trim()).filter(Boolean),
    [node.value]
  );

  function setField(path: string) {
    const nf = schema.fields.find((f) => f.path === path);
    onChange({ ...node, field: path, operator: nf?.operators[0] ?? "eq", value: "", value2: undefined });
  }

  const isBetween = node.operator === "between";
  const isUnary   = UNARY_OPS.has(node.operator);
  const isArray   = ARRAY_OPS.has(node.operator);
  const isString  = STRING_OPS.has(node.operator) || (field?.type === "string" && !ARRAY_OPS.has(node.operator) && node.operator !== "between");

  function setArrayValues(values: string[]) {
    onChange({ ...node, value: values.join(", ") });
  }

  function addArrayValue(raw: string) {
    const next = raw.trim();
    if (!next || arrayValues.includes(next)) return;
    setArrayValues([...arrayValues, next]);
    setArrayDraft("");
  }

  function removeArrayValue(value: string) {
    setArrayValues(arrayValues.filter((v) => v !== value));
  }

  function renderValue() {
    if (isBetween) return (
      <div className="flex items-center gap-1.5">
        <input type="number" value={node.value} placeholder="min" className="w-20" onChange={(e) => onChange({ ...node, value: e.target.value })} />
        <span className="text-muted text-xs">–</span>
        <input type="number" value={node.value2 ?? ""} placeholder="max" className="w-20" onChange={(e) => onChange({ ...node, value2: e.target.value })} />
      </div>
    );

    if (isUnary) return (
      <span className="text-[11px] text-muted italic">no value needed</span>
    );

    if (isArray) {
      return (
        <div className="flex flex-col gap-1.5">
          {arrayValues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {arrayValues.map((value) => (
                <span key={value} className="inline-flex items-center gap-1 px-2 h-[24px] text-[11px] rounded border bg-surface-2 border-rim-2 text-ink">
                  {value}
                  <button
                    onClick={() => removeArrayValue(value)}
                    className="text-muted hover:text-fail leading-none"
                    title={`Remove ${value}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {field?.enumValues && (
            <div className="flex flex-wrap gap-1">
              {field.enumValues.map((v) => {
                const active = arrayValues.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => (active ? removeArrayValue(v) : addArrayValue(v))}
                    className={cn(
                      "px-2 h-[24px] text-[11px] rounded border transition-colors",
                      active
                        ? "bg-accent border-accent text-white"
                        : "bg-surface-2 border-rim-2 text-subtle hover:border-accent hover:text-ink"
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <input
              type={field?.type === "number" ? "number" : "text"}
              value={arrayDraft}
              placeholder="Add value"
              className="w-28"
              onChange={(e) => setArrayDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addArrayValue(arrayDraft);
                }
              }}
            />
            <button
              onClick={() => addArrayValue(arrayDraft)}
              className="h-[26px] px-2 text-[11px] rounded border border-rim-2 bg-surface-2 text-subtle hover:text-ink hover:border-accent"
            >
              Add
            </button>
          </div>
        </div>
      );
    }

    if (field?.enumValues && !isString) return (
      <>
        <input
          list={`condition-options-${node.id}`}
          type={field?.type === "number" ? "number" : "text"}
          value={node.value}
          placeholder="Pick or type"
          className="w-28"
          onChange={(e) => onChange({ ...node, value: e.target.value })}
        />
        <datalist id={`condition-options-${node.id}`}>
          {field.enumValues.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </>
    );

    if (field?.type === "boolean") return (
      <select value={node.value} onChange={(e) => onChange({ ...node, value: e.target.value })}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );

    return (
      <input
        type={field?.type === "number" ? "number" : "text"}
        value={node.value}
        placeholder={field?.type === "number" ? "0" : "value"}
        className="w-28"
        onChange={(e) => onChange({ ...node, value: e.target.value })}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap py-1 pl-1">
      {/* field */}
      <select value={node.field} onChange={(e) => setField(e.target.value)} className="max-w-[130px]">
        {schema.fields.map((f) => <option key={f.path} value={f.path}>{f.label}</option>)}
      </select>

      {/* operator — accent color via inline style since global appearance is reset */}
      <select
        value={node.operator}
        onChange={(e) => onChange({ ...node, operator: e.target.value as BuilderComparison["operator"], value: "", value2: undefined })}
        style={{ color: "var(--color-accent)", fontWeight: 600, minWidth: 80 }}
      >
        {(field?.operators ?? ["eq"]).map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
      </select>

      {renderValue()}

      {canRemove && (
        <button
          onClick={onRemove}
          className="flex items-center justify-center w-6 h-6 rounded text-muted hover:text-fail hover:bg-fail/10 transition-colors"
          title="Remove"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
