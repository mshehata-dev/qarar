import React, { useState, useEffect } from "react";
import type { RuleNode } from "@qarar/spec";
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
}

const OPERATORS: { value: AllOp; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "in", label: "in list" },
  { value: "notIn", label: "not in list" },
  { value: "between", label: "between" },
  { value: "contains", label: "contains" },
  { value: "notContains", label: "does not contain" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
  { value: "isNull", label: "is null" },
  { value: "isNotNull", label: "is not null" },
];

export function RuleBuilder({
  value,
  onChange,
  fields = [],
  className,
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

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
        color: "#0f172a",
      }}
      className={className}
    >
      <GroupView
        group={tree.kind === "group" ? tree : defaultGroup("and")}
        fields={fields}
        isRoot
        onChange={updateTree}
      />
    </div>
  );
}

function GroupView({
  group,
  fields,
  isRoot = false,
  onChange,
  onRemove,
}: {
  group: BuilderGroup;
  fields: FieldDefinition[];
  isRoot?: boolean;
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
        borderLeft: isRoot ? "none" : "2px solid #3b82f6",
        paddingLeft: isRoot ? "0px" : "12px",
        marginTop: "8px",
        marginBottom: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        {(["and", "or", "not"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLogic(l)}
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid",
              borderColor: group.logic === l ? "#3b82f6" : "#cbd5e1",
              backgroundColor: group.logic === l ? "#3b82f6" : "transparent",
              color: group.logic === l ? "#ffffff" : "#475569",
              fontWeight: "bold",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
        {!isRoot && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              marginLeft: "auto",
              padding: "2px 6px",
              fontSize: "11px",
              color: "#ef4444",
              border: "1px solid #fca5a5",
              borderRadius: "4px",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            Remove Group
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {group.children.map((child, i) =>
          child.kind === "group" ? (
            <GroupView
              key={child.id}
              group={child}
              fields={fields}
              onChange={(u) => updateChild(i, u)}
              onRemove={() => removeChild(i)}
            />
          ) : (
            <ComparisonView
              key={child.id}
              node={child}
              fields={fields}
              onChange={(u) => updateChild(i, u)}
              onRemove={() => removeChild(i)}
            />
          )
        )}
      </div>

      {group.logic !== "not" && (
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
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
              padding: "4px 8px",
              fontSize: "12px",
              border: "1px dashed #cbd5e1",
              borderRadius: "4px",
              backgroundColor: "transparent",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            + Condition
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
              padding: "4px 8px",
              fontSize: "12px",
              border: "1px dashed #cbd5e1",
              borderRadius: "4px",
              backgroundColor: "transparent",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            + Group
          </button>
        </div>
      )}
    </div>
  );
}

function ComparisonView({
  node,
  fields,
  onChange,
  onRemove,
}: {
  node: BuilderComparison;
  fields: FieldDefinition[];
  onChange: (updated: BuilderComparison) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        padding: "4px",
        borderRadius: "4px",
        backgroundColor: "#f8fafc",
      }}
    >
      {fields.length > 0 ? (
        <select
          value={node.field}
          onChange={(e) => onChange({ ...node, field: e.target.value })}
          style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
        >
          {fields.map((f) => (
            <option key={f.path} value={f.path}>
              {f.label ?? f.path}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={node.field}
          placeholder="field.path"
          onChange={(e) => onChange({ ...node, field: e.target.value })}
          style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
        />
      )}

      <select
        value={node.operator}
        onChange={(e) => onChange({ ...node, operator: e.target.value as AllOp })}
        style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {node.operator !== "isNull" && node.operator !== "isNotNull" && (
        <input
          type="text"
          value={node.value}
          placeholder="value"
          onChange={(e) => onChange({ ...node, value: e.target.value })}
          style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
        />
      )}

      {node.operator === "between" && (
        <>
          <span>and</span>
          <input
            type="text"
            value={node.value2 ?? ""}
            placeholder="max value"
            onChange={(e) => onChange({ ...node, value2: e.target.value })}
            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
          />
        </>
      )}

      <button
        type="button"
        onClick={onRemove}
        style={{
          marginLeft: "auto",
          padding: "2px 6px",
          fontSize: "11px",
          color: "#94a3b8",
          border: "none",
          backgroundColor: "transparent",
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </div>
  );
}

export { fromAST, toAST, defaultComparison, defaultGroup } from "./builderModel.js";
export type { BuilderNode, BuilderGroup, BuilderComparison } from "./builderModel.js";
