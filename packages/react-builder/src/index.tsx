import React, { useState, useEffect } from "react";
import type { RuleNode } from "@qarar/spec";
import { getThemeTokens, type QararTheme } from "@qarar/theme";
import {
  fromAST,
  toAST,
  defaultComparison,
  defaultGroup,
  BuilderNode,
  BuilderGroup,
  BuilderComparison,
  AllOp,
} from "./builderModel.js";

export interface FieldDefinition {
  path: string;
  label?: string;
  type?: "string" | "number" | "boolean" | "enum";
  options?: string[];
}

export interface RuleBuilderProps {
  value: { root: RuleNode } | RuleNode;
  onChange: (node: RuleNode) => void;
  fields?: FieldDefinition[];
  className?: string;
  theme?: "dark" | "light" | QararTheme;
}

const OPERATORS: { value: AllOp; label: string }[] = [
  { value: "eq", label: "= equals" },
  { value: "neq", label: "≠ not equals" },
  { value: "gt", label: "> greater than" },
  { value: "gte", label: "≥ greater or equal" },
  { value: "lt", label: "< less than" },
  { value: "lte", label: "≤ less or equal" },
  { value: "in", label: "∈ in list" },
  { value: "notIn", label: "∉ not in list" },
  { value: "between", label: "↔ between range" },
  { value: "contains", label: "🔍 contains text" },
  { value: "notContains", label: "🚫 does not contain" },
  { value: "startsWith", label: "⇤ starts with" },
  { value: "endsWith", label: "⇥ ends with" },
  { value: "isNull", label: "∅ is null" },
  { value: "isNotNull", label: "✓ is not null" },
];

export function RuleBuilder({
  value,
  onChange,
  fields = [],
  className,
  theme = "dark",
}: RuleBuilderProps) {
  const rootAST = "root" in value ? value.root : value;
  const [tree, setTree] = useState<BuilderNode>(() => fromAST(rootAST));

  useEffect(() => {
    setTree(fromAST(rootAST));
  }, [JSON.stringify(rootAST)]);

  const fieldTypeMap = fields.reduce<Record<string, string>>((acc, f) => {
    acc[f.path] = f.type ?? "string";
    return acc;
  }, {});

  function updateTree(newTree: BuilderNode) {
    setTree(newTree);
    const updatedAST = toAST(newTree, fieldTypeMap);
    onChange(updatedAST);
  }

  const themeTokens: QararTheme =
    typeof theme === "object" ? theme : getThemeTokens(theme === "dark");

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "16px",
        borderRadius: "12px",
        border: `1px solid ${themeTokens.border}`,
        backgroundColor: themeTokens.surface2,
        color: themeTokens.text,
        boxShadow: themeTokens.shadow,
      }}
      className={className}
    >
      <GroupView
        group={tree.kind === "group" ? tree : defaultGroup("and")}
        fields={fields}
        isRoot
        theme={themeTokens}
        onChange={updateTree}
      />
    </div>
  );
}

function GroupView({
  group,
  fields,
  isRoot = false,
  theme,
  onChange,
  onRemove,
}: {
  group: BuilderGroup;
  fields: FieldDefinition[];
  isRoot?: boolean;
  theme: QararTheme;
  onChange: (updated: BuilderGroup) => void;
  onRemove?: () => void;
}) {
  function setLogic(logic: "and" | "or" | "not") {
    const children =
      logic === "not"
        ? [group.children[0] ?? defaultComparison(fields[0]?.path ?? "field")]
        : group.children;
    onChange({ ...group, logic, children });
  }

  function updateChild(index: number, updated: BuilderNode) {
    onChange({
      ...group,
      children: group.children.map((c, i) => (i === index ? updated : c)),
    });
  }

  function removeChild(index: number) {
    onChange({
      ...group,
      children: group.children.filter((_, i) => i !== index),
    });
  }

  return (
    <div
      style={{
        borderLeft: isRoot ? "none" : `3px solid ${theme.primary}`,
        paddingLeft: isRoot ? "0px" : "14px",
        marginTop: "10px",
        marginBottom: "10px",
        backgroundColor: isRoot ? "transparent" : theme.cardBg,
        borderRadius: isRoot ? "0" : "8px",
        padding: isRoot ? "0" : "12px",
        border: isRoot ? "none" : `1px solid ${theme.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Logical Gate:
        </span>
        {(["and", "or", "not"] as const).map((l) => {
          const active = group.logic === l;
          const bgActive = l === "and" ? theme.primary : l === "or" ? theme.accent : theme.fail;
          return (
            <button
              key={l}
              type="button"
              onClick={() => setLogic(l)}
              style={{
                padding: "4px 12px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: active ? bgActive : theme.borderSubtle,
                backgroundColor: active ? bgActive : theme.surface3,
                color: active ? "#ffffff" : theme.textMuted,
                fontWeight: 800,
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: active ? `0 0 10px ${bgActive}66` : "none",
              }}
            >
              {l.toUpperCase()}
            </button>
          );
        })}

        {!isRoot && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 600,
              color: theme.fail,
              border: `1px solid ${theme.failBorder}`,
              borderRadius: "6px",
              backgroundColor: theme.failBg,
              cursor: "pointer",
            }}
          >
            Remove Group
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {group.children.map((child, i) =>
          child.kind === "group" ? (
            <GroupView
              key={child.id}
              group={child}
              fields={fields}
              theme={theme}
              onChange={(u) => updateChild(i, u)}
              onRemove={() => removeChild(i)}
            />
          ) : (
            <ComparisonView
              key={child.id}
              node={child}
              fields={fields}
              theme={theme}
              onChange={(u) => updateChild(i, u)}
              onRemove={() => removeChild(i)}
            />
          )
        )}
      </div>

      {group.logic !== "not" && (
        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...group,
                children: [
                  ...group.children,
                  defaultComparison(fields[0]?.path ?? "field"),
                ],
              })
            }
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 700,
              border: `1px dashed ${theme.primary}`,
              borderRadius: "6px",
              backgroundColor: theme.primarySubtle,
              color: theme.primary,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            + Add Condition Rule
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...group,
                children: [...group.children, defaultGroup("and")],
              })
            }
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 700,
              border: `1px dashed ${theme.accent}`,
              borderRadius: "6px",
              backgroundColor: theme.accentSubtle,
              color: theme.accent,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            + Add Sub-Group
          </button>
        </div>
      )}
    </div>
  );
}

function ComparisonView({
  node,
  fields,
  theme,
  onChange,
  onRemove,
}: {
  node: BuilderComparison;
  fields: FieldDefinition[];
  theme: QararTheme;
  onChange: (updated: BuilderComparison) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: node.operator === "between" ? "1.2fr 1fr 1fr 1fr auto" : "1.2fr 1fr 1.2fr auto",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        borderRadius: "8px",
        border: `1px solid ${theme.border}`,
        backgroundColor: theme.inputBg,
      }}
    >
      {/* Field Selector / Input */}
      {fields.length > 0 ? (
        <select
          value={node.field}
          onChange={(e) => onChange({ ...node, field: e.target.value })}
          style={{
            height: "36px",
            padding: "0 10px",
            borderRadius: "6px",
            border: `1px solid ${theme.inputBorder}`,
            backgroundColor: theme.inputBg,
            color: theme.inputText,
            fontSize: "0.85rem",
            fontWeight: 600,
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {fields.map((f) => (
            <option key={f.path} value={f.path}>
              {f.label ?? f.path} ({f.path})
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={node.field}
          placeholder="Field Path (e.g. customer.age)"
          onChange={(e) => onChange({ ...node, field: e.target.value })}
          style={{
            height: "36px",
            padding: "0 10px",
            borderRadius: "6px",
            border: `1px solid ${theme.inputBorder}`,
            backgroundColor: theme.inputBg,
            color: theme.inputText,
            fontSize: "0.85rem",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Operator Selector */}
      <select
        value={node.operator}
        onChange={(e) => onChange({ ...node, operator: e.target.value as AllOp })}
        style={{
          height: "36px",
          padding: "0 10px",
          borderRadius: "6px",
          border: `1px solid ${theme.inputBorder}`,
          backgroundColor: theme.inputBg,
          color: theme.primary,
          fontSize: "0.85rem",
          fontWeight: 700,
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {/* Value Input */}
      {node.operator !== "isNull" && node.operator !== "isNotNull" && (
        <input
          type="text"
          value={node.value}
          placeholder="Value (e.g. 100 or 'vip')"
          onChange={(e) => onChange({ ...node, value: e.target.value })}
          style={{
            height: "36px",
            padding: "0 10px",
            borderRadius: "6px",
            border: `1px solid ${theme.inputBorder}`,
            backgroundColor: theme.inputBg,
            color: theme.inputDataColor,
            fontSize: "0.85rem",
            fontFamily: "monospace",
            fontWeight: 600,
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Max Value Input for Between Operator */}
      {node.operator === "between" && (
        <input
          type="text"
          value={node.value2 ?? ""}
          placeholder="Max Value"
          onChange={(e) => onChange({ ...node, value2: e.target.value })}
          style={{
            height: "36px",
            padding: "0 10px",
            borderRadius: "6px",
            border: `1px solid ${theme.inputBorder}`,
            backgroundColor: theme.inputBg,
            color: theme.inputDataColor,
            fontSize: "0.85rem",
            fontFamily: "monospace",
            fontWeight: 600,
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        title="Remove condition"
        style={{
          height: "36px",
          width: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          color: theme.textMuted,
          border: "none",
          backgroundColor: "transparent",
          cursor: "pointer",
          borderRadius: "6px",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = theme.fail;
          e.currentTarget.style.backgroundColor = theme.failBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = theme.textMuted;
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        ✕
      </button>
    </div>
  );
}

export { fromAST, toAST, defaultComparison, defaultGroup } from "./builderModel.js";
export type { BuilderNode, BuilderGroup, BuilderComparison } from "./builderModel.js";
