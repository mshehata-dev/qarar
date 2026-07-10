import type { SchemaConfig } from "../schema";
import type { BuilderGroup, BuilderNode } from "../builderModel";
import { defaultComparison, defaultGroup } from "../builderModel";
import { ConditionRow } from "./ConditionRow";
import { cn } from "../lib/utils";
import { Plus, X } from "lucide-react";

interface Props {
  node: BuilderGroup;
  schema: SchemaConfig;
  depth: number;
  isRoot?: boolean;
  onChange: (updated: BuilderGroup) => void;
  onRemove?: () => void;
}

const LOGIC_STYLES = {
  and: { btn: "bg-accent text-white border-accent", inactive: "text-accent border-accent/40 hover:border-accent", bar: "border-accent/50" },
  or:  { btn: "bg-amber-500 text-white border-amber-500",               inactive: "text-amber-400 border-amber-500/40 hover:border-amber-500",                          bar: "border-amber-500/50" },
  not: { btn: "bg-fail text-white border-fail",     inactive: "text-fail border-fail/40 hover:border-fail",           bar: "border-fail/50" },
} as const;

const INDENT_BARS = [
  "border-l-accent/50",
  "border-l-emerald-500/50",
  "border-l-amber-500/50",
  "border-l-purple-500/50",
  "border-l-fail/50",
];

export function LogicGroup({ node, schema, depth, isRoot = false, onChange, onRemove }: Props) {
  const ls = LOGIC_STYLES[node.logic];

  function setLogic(logic: "and" | "or" | "not") {
    const children = logic === "not" ? [node.children[0] ?? defaultComparison()] : node.children;
    onChange({ ...node, logic, children });
  }

  function updateChild(index: number, updated: BuilderNode) {
    onChange({ ...node, children: node.children.map((c, i) => (i === index ? updated : c)) });
  }

  function removeChild(index: number) {
    onChange({ ...node, children: node.children.filter((_, i) => i !== index) });
  }

  return (
    <div className={cn(
      "rounded-lg border-l-2 pl-3 py-2",
      depth === 0 ? "border-l-transparent" : INDENT_BARS[depth % INDENT_BARS.length]
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          {(["and", "or", "not"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLogic(l)}
              className={cn(
                "px-2.5 py-1 text-xs font-bold tracking-wider rounded-md border transition-all",
                node.logic === l ? LOGIC_STYLES[l].btn : cn("bg-transparent", LOGIC_STYLES[l].inactive)
              )}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {!isRoot && (
          <button
            onClick={onRemove}
            className="flex items-center gap-1 text-xs text-muted hover:text-fail border border-rim hover:border-fail/40 rounded-md px-2 py-1 transition-colors"
          >
            <X size={11} /> group
          </button>
        )}
      </div>

      {/* Children */}
      <div className={cn(
        "flex flex-col gap-1 pl-2 border-l",
        depth === 0 ? `border-l-${ls.bar.replace("border-", "")}` : "border-l-rim"
      )}>
        {node.children.map((child, i) => {
          if (child.kind === "group") {
            return (
              <LogicGroup
                key={child.id}
                node={child}
                schema={schema}
                depth={depth + 1}
                onChange={(u) => updateChild(i, u)}
                onRemove={() => removeChild(i)}
              />
            );
          }
          return (
            <ConditionRow
              key={child.id}
              node={child}
              schema={schema}
              onChange={(u) => updateChild(i, u)}
              onRemove={() => removeChild(i)}
              canRemove={node.logic !== "not" || node.children.length > 1}
            />
          );
        })}
      </div>

      {/* Add row */}
      {node.logic !== "not" && (
        <div className="flex gap-2 mt-3 pl-2">
          <button
            onClick={() => onChange({ ...node, children: [...node.children, defaultComparison(schema.fields[0]?.path ?? "")] })}
            className="flex items-center gap-1 text-xs text-muted hover:text-ink border border-dashed border-rim hover:border-rim-2 rounded-md px-3 py-1 transition-colors"
          >
            <Plus size={11} /> Condition
          </button>
          <button
            onClick={() => onChange({ ...node, children: [...node.children, defaultGroup("and")] })}
            className="flex items-center gap-1 text-xs text-muted hover:text-ink border border-dashed border-rim hover:border-rim-2 rounded-md px-3 py-1 transition-colors"
          >
            <Plus size={11} /> Group
          </button>
        </div>
      )}
    </div>
  );
}

