import { useState, useEffect, useRef } from "react";
import type { RuleNode, DecisionTable, DecisionBranch } from "@qarar/spec";
import { getThemeTokens, cssVarTokens, type QararTheme } from "@qarar/theme";
import {
  fromAST,
  toAST,
  defaultComparison,
  defaultGroup,
  type BuilderNode,
  type BuilderGroup,
  type BuilderComparison,
  type AllOp,
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

export interface OperatorGroup {
  label: string;
  options: { value: AllOp; label: string }[];
}

export const OPERATOR_GROUPS: OperatorGroup[] = [
  {
    label: "Numbers & Equality",
    options: [
      { value: "eq", label: "= equals" },
      { value: "neq", label: "≠ not equals" },
      { value: "gt", label: "> greater than" },
      { value: "gte", label: "≥ at least (greater or equal)" },
      { value: "lt", label: "< less than" },
      { value: "lte", label: "≤ at most (less or equal)" },
      { value: "between", label: "is between" },
    ],
  },
  {
    label: "Text & Patterns",
    options: [
      { value: "contains", label: "contains text" },
      { value: "notContains", label: "does not contain text" },
      { value: "startsWith", label: "starts with" },
      { value: "endsWith", label: "ends with" },
    ],
  },
  {
    label: "Single Value in List",
    options: [
      { value: "in", label: "is any of (in list)" },
      { value: "notIn", label: "is none of (not in list)" },
    ],
  },
  {
    label: "Array & Collections",
    options: [
      { value: "arrayContains", label: "has item" },
      { value: "notArrayContains", label: "does not have item" },
      { value: "arrayContainsAny", label: "has any of (some)" },
      { value: "arrayContainsAll", label: "has all of (every)" },
      { value: "arrayContainsNone", label: "has none of (none)" },
      { value: "arrayIsEmpty", label: "is empty" },
      { value: "arrayIsNotEmpty", label: "is not empty" },
      { value: "arrayLength", label: "count equals" },
      { value: "arrayLengthGte", label: "count at least (≥)" },
      { value: "arrayLengthLte", label: "count at most (≤)" },
    ],
  },
  {
    label: "Date & Time",
    options: [
      { value: "before", label: "is before (date or {{field}})" },
      { value: "after", label: "is after (date or {{field}})" },
      { value: "olderThan", label: "older than (e.g. 30 days)" },
      { value: "withinLast", label: "within last (e.g. 7 days)" },
    ],
  },
  {
    label: "Existence",
    options: [
      { value: "isNull", label: "is empty / not set" },
      { value: "isNotNull", label: "is set / exists" },
    ],
  },
];

const OPERATORS: { value: AllOp; label: string }[] = OPERATOR_GROUPS.flatMap((g) => g.options);

export function RuleBuilder({
  value,
  onChange,
  fields = [],
  className,
  theme = cssVarTokens,
}: RuleBuilderProps) {
  const rootAST =
    value && typeof value === "object" && "root" in value
      ? (value as { root: RuleNode }).root
      : (value as RuleNode);

  function wrapTree(node: BuilderNode): BuilderNode {
    return node.kind === "group"
      ? node
      : { kind: "group", id: "root", logic: "and", children: [node] };
  }

  const [tree, setTree] = useState<BuilderNode>(() => wrapTree(fromAST(rootAST)));
  const isInternal = useRef(false);

  useEffect(() => {
    if (isInternal.current) {
      isInternal.current = false;
      return;
    }
    setTree(wrapTree(fromAST(rootAST)));
  }, [rootAST]);

  const fieldTypeMap = fields.reduce<Record<string, string>>((acc, f) => {
    acc[f.path] = f.type ?? "string";
    return acc;
  }, {});

  function updateTree(newTree: BuilderNode) {
    isInternal.current = true;
    setTree(newTree);
    const updatedAST = toAST(newTree, fieldTypeMap);
    onChange(updatedAST);
  }

  const themeTokens: QararTheme =
    typeof theme === "object" ? theme : (theme === "dark" || theme === "light" ? getThemeTokens(theme === "dark") : cssVarTokens);

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        padding: "12px",
        borderRadius: "8px",
        border: `1px solid ${themeTokens.border}`,
        backgroundColor: themeTokens.surface,
        color: themeTokens.text,
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
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Match:
        </span>
        <div style={{ display: "inline-flex", borderRadius: "6px", border: `1px solid ${theme.border}`, overflow: "hidden" }}>
          {(["and", "or", "not"] as const).map((l) => {
            const active = group.logic === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLogic(l)}
                style={{
                  padding: "4px 12px",
                  border: "none",
                  backgroundColor: active ? (l === "not" ? theme.fail : theme.primary) : "transparent",
                  color: active ? "#ffffff" : theme.textMuted,
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease, color 0.15s ease",
                }}
              >
                {l.toUpperCase()}
              </button>
            );
          })}
        </div>

        {!isRoot && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              marginLeft: "auto",
              padding: "4px 8px",
              fontSize: "11px",
              fontWeight: 500,
              color: theme.fail,
              border: `1px solid ${theme.failBorder}`,
              borderRadius: "6px",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            Delete group
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
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...group,
                children: [
                  ...group.children,
                  defaultComparison(""),
                ],
              })
            }
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              border: `1px solid ${theme.border}`,
              borderRadius: "6px",
              backgroundColor: theme.surface3,
              color: theme.text,
              cursor: "pointer",
              transition: "border-color 0.15s ease",
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
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              border: `1px solid ${theme.border}`,
              borderRadius: "6px",
              backgroundColor: "transparent",
              color: theme.textMuted,
              cursor: "pointer",
              transition: "border-color 0.15s ease",
            }}
          >
            + Sub-group
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chip / Tag Input Component for Array & Set Operations
// ---------------------------------------------------------------------------

export interface ChipInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  theme: QararTheme;
}

export function ChipInput({ value, onChange, placeholder = "Type & press Enter...", theme }: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const rawVal = (value || "").trim();
  const isDynamicField = rawVal.startsWith("{{") && rawVal.endsWith("}}");
  const items = isDynamicField
    ? [rawVal]
    : rawVal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const addItem = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
      onChange(trimmed);
      setDraft("");
      return;
    }

    const newTokens = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    const existing = isDynamicField ? [] : items;
    const combined = [...existing, ...newTokens];
    onChange(combined.join(", "));
    setDraft("");
  };

  const removeItem = (index: number) => {
    if (isDynamicField) {
      onChange("");
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    onChange(updated.join(", "));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addItem(draft);
    } else if (e.key === "Backspace" && draft === "" && items.length > 0) {
      e.preventDefault();
      removeItem(items.length - 1);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "4px",
        minHeight: "30px",
        padding: "2px 6px",
        borderRadius: "4px",
        border: `1px solid ${theme.inputBorder}`,
        backgroundColor: theme.inputBg,
        cursor: "text",
        flex: "2 1 160px",
      }}
    >
      {items.map((item, idx) => {
        const isField = item.startsWith("{{") && item.endsWith("}}");
        return (
          <span
            key={`${item}-${idx}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "1px 6px",
              borderRadius: "3px",
              fontSize: "0.75rem",
              fontWeight: isField ? 600 : 500,
              fontFamily: isField ? "ui-monospace, monospace" : "inherit",
              backgroundColor: isField ? theme.accentSubtle : theme.primarySubtle,
              color: isField ? theme.accent : theme.primary,
              border: `1px solid ${isField ? theme.accent : theme.border}`,
            }}
          >
            {item}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeItem(idx);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "14px",
                height: "14px",
                padding: 0,
                border: "none",
                borderRadius: "50%",
                backgroundColor: "transparent",
                color: isField ? theme.accent : theme.textMuted,
                cursor: "pointer",
                fontSize: "10px",
                lineHeight: 1,
              }}
              title="Remove"
            >
              ✕
            </button>
          </span>
        );
      })}

      <input
        ref={inputRef}
        type="text"
        value={draft}
        placeholder={items.length === 0 ? placeholder : "+ add"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) addItem(draft);
        }}
        style={{
          flex: "1 1 60px",
          minWidth: "50px",
          height: "24px",
          border: "none",
          backgroundColor: "transparent",
          color: theme.inputText,
          fontSize: "0.8rem",
          outline: "none",
          padding: "0 2px",
        }}
      />
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
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "8px 10px",
        borderRadius: "6px",
        border: `1px solid ${theme.border}`,
        backgroundColor: theme.inputBg,
      }}
    >
      {/* Top Row: Field Path Input + Delete */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="text"
          value={node.field}
          placeholder="Field path (e.g. customer.age)"
          onChange={(e) => onChange({ ...node, field: e.target.value })}
          style={{
            flex: 1,
            height: "32px",
            padding: "0 10px",
            borderRadius: "4px",
            border: `1px solid ${theme.inputBorder}`,
            backgroundColor: theme.inputBg,
            color: theme.inputText,
            fontSize: "0.82rem",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontWeight: 500,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <button
          type="button"
          onClick={onRemove}
          title="Remove condition"
          style={{
            height: "28px",
            width: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: theme.textMuted,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            borderRadius: "4px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Bottom Row: Operator + Value (+ Value2) */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <select
          value={node.operator}
          onChange={(e) => onChange({ ...node, operator: e.target.value as AllOp })}
          style={{
            flex: "1 1 140px",
            height: "30px",
            padding: "0 8px",
            borderRadius: "4px",
            border: `1px solid ${theme.inputBorder}`,
            backgroundColor: theme.inputBg,
            color: theme.primary,
            fontSize: "0.8rem",
            fontWeight: 600,
            outline: "none",
          }}
        >
          {OPERATOR_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {node.operator !== "isNull" &&
          node.operator !== "isNotNull" &&
          node.operator !== "arrayIsEmpty" &&
          node.operator !== "arrayIsNotEmpty" &&
          (node.operator === "in" ||
          node.operator === "notIn" ||
          node.operator === "arrayContainsAny" ||
          node.operator === "arrayContainsAll" ||
          node.operator === "arrayContainsNone" ? (
            <ChipInput
              value={node.value}
              onChange={(val) => onChange({ ...node, value: val })}
              placeholder={
                node.operator === "in" || node.operator === "notIn"
                  ? "Type option & press Enter..."
                  : "Type item & press Enter..."
              }
              theme={theme}
            />
          ) : (
            <input
              type="text"
              value={node.value}
              placeholder={
                node.operator === "before" || node.operator === "after"
                  ? "YYYY-MM-DD or {{ field }}"
                  : node.operator === "olderThan" || node.operator === "withinLast"
                  ? 'e.g. "30 days" or {{ field }}'
                  : "Value or {{ field }}"
              }
              onChange={(e) => onChange({ ...node, value: e.target.value })}
              style={{
                flex: "1 1 120px",
                height: "30px",
                padding: "0 8px",
                borderRadius: "4px",
                border: `1px solid ${
                  node.value && node.value.trim().startsWith("{{") ? theme.accent : theme.inputBorder
                }`,
                backgroundColor: theme.inputBg,
                color: node.value && node.value.trim().startsWith("{{") ? theme.accent : theme.inputDataColor,
                fontWeight: node.value && node.value.trim().startsWith("{{") ? 600 : 400,
                fontSize: "0.8rem",
                fontFamily: "ui-monospace, monospace",
                outline: "none",
              }}
            />
          ))}

        {node.operator === "between" && (
          <input
            type="text"
            value={node.value2 ?? ""}
            placeholder="Max"
            onChange={(e) => onChange({ ...node, value2: e.target.value })}
            style={{
              flex: "1 1 80px",
              height: "30px",
              padding: "0 8px",
              borderRadius: "4px",
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.inputBg,
              color: theme.inputDataColor,
              fontSize: "0.8rem",
              fontFamily: "ui-monospace, monospace",
              outline: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision Table / Switch Matrix Builder Component
// ---------------------------------------------------------------------------

export interface DecisionTableBuilderProps<T = unknown> {
  value: DecisionTable<T>;
  onChange: (table: DecisionTable<T>) => void;
  fields?: FieldDefinition[];
  matchedBranchId?: string | null;
  className?: string;
  theme?: "dark" | "light" | QararTheme;
}

export function DecisionTableBuilder<T = unknown>({
  value,
  onChange,
  fields = [],
  matchedBranchId = null,
  className,
  theme = cssVarTokens,
}: DecisionTableBuilderProps<T>) {
  const themeTokens: QararTheme =
    typeof theme === "object"
      ? theme
      : theme === "dark" || theme === "light"
      ? getThemeTokens(theme === "dark")
      : cssVarTokens;

  const [outputTexts, setOutputTexts] = useState<Record<string, string>>({});
  const [defaultOutputText, setDefaultOutputText] = useState<string>(() =>
    JSON.stringify(value.defaultOutput ?? {}, null, 2)
  );
  const isInternal = useRef(false);

  useEffect(() => {
    if (isInternal.current) {
      isInternal.current = false;
      return;
    }
    setDefaultOutputText(JSON.stringify(value.defaultOutput ?? {}, null, 2));
    const newTexts: Record<string, string> = {};
    (value.branches || []).forEach((b) => {
      newTexts[b.id] = JSON.stringify(b.output ?? {}, null, 2);
    });
    setOutputTexts(newTexts);
  }, [value]);

  const branches = value.branches || [];

  const handleBranchNameChange = (index: number, name: string) => {
    isInternal.current = true;
    const next = [...branches];
    next[index] = { ...next[index], name };
    onChange({ ...value, branches: next });
  };

  const handleBranchConditionChange = (index: number, condition: RuleNode) => {
    isInternal.current = true;
    const next = [...branches];
    next[index] = { ...next[index], condition };
    onChange({ ...value, branches: next });
  };

  const handleBranchOutputChange = (index: number, branchId: string, text: string) => {
    setOutputTexts((prev) => ({ ...prev, [branchId]: text }));
    try {
      const parsed = JSON.parse(text);
      isInternal.current = true;
      const next = [...branches];
      next[index] = { ...next[index], output: parsed };
      onChange({ ...value, branches: next });
    } catch {
      // Allow user to finish typing invalid JSON without error
    }
  };

  const handleDefaultOutputChange = (text: string) => {
    setDefaultOutputText(text);
    try {
      const parsed = JSON.parse(text);
      isInternal.current = true;
      onChange({ ...value, defaultOutput: parsed });
    } catch {
      // Allow user to finish typing invalid JSON without error
    }
  };

  const handleAddBranch = () => {
    isInternal.current = true;
    const newId = `case_${Date.now().toString(36)}`;
    const newBranch: DecisionBranch<T> = {
      id: newId,
      name: `Case ${branches.length + 1}`,
      condition: {
        type: "eq",
        left: { type: "field", path: "" },
        right: { type: "string", value: "" },
      },
      output: {} as T,
    };
    onChange({
      ...value,
      branches: [...branches, newBranch],
    });
  };

  const handleRemoveBranch = (index: number) => {
    if (branches.length <= 1) return;
    isInternal.current = true;
    const next = branches.filter((_, i) => i !== index);
    onChange({ ...value, branches: next });
  };

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
      className={className}
    >
      {/* Matrix Controls Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          paddingBottom: "10px",
          borderBottom: `1px solid ${themeTokens.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 200px" }}>
          <input
            type="text"
            value={value.name ?? ""}
            onChange={(e) => {
              isInternal.current = true;
              onChange({ ...value, name: e.target.value });
            }}
            placeholder="Matrix Name"
            style={{
              padding: "4px 8px",
              fontSize: "0.84rem",
              fontWeight: 600,
              borderRadius: "4px",
              border: `1px solid ${themeTokens.inputBorder}`,
              backgroundColor: themeTokens.inputBg,
              color: themeTokens.text,
              outline: "none",
              width: "100%",
              maxWidth: "260px",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: themeTokens.textMuted }}>Mode:</span>
            <select
              value={value.mode ?? "first"}
              onChange={(e) => {
                isInternal.current = true;
                onChange({ ...value, mode: e.target.value as "first" | "all" });
              }}
              style={{
                height: "28px",
                padding: "0 8px",
                fontSize: "0.76rem",
                borderRadius: "4px",
                border: `1px solid ${themeTokens.inputBorder}`,
                backgroundColor: themeTokens.inputBg,
                color: themeTokens.inputText,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="first">First match wins</option>
              <option value="all">Evaluate all cases</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleAddBranch}
            style={{
              height: "28px",
              padding: "0 10px",
              fontSize: "0.76rem",
              fontWeight: 600,
              borderRadius: "4px",
              border: `1px solid ${themeTokens.border}`,
              backgroundColor: themeTokens.surface3,
              color: themeTokens.text,
              cursor: "pointer",
            }}
          >
            + Add Case
          </button>
        </div>
      </div>

      {/* Cases List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {branches.map((b, idx) => {
          const isMatched = matchedBranchId === b.id;
          return (
            <div
              key={b.id}
              style={{
                borderRadius: "6px",
                border: `1px solid ${isMatched ? themeTokens.passBorder : themeTokens.border}`,
                backgroundColor: isMatched ? themeTokens.passBg : themeTokens.surface,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "border-color 0.15s ease",
              }}
            >
              {/* Branch Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 180px" }}>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: themeTokens.surface3,
                      color: themeTokens.textMuted,
                    }}
                  >
                    CASE {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={b.name ?? b.id}
                    onChange={(e) => handleBranchNameChange(idx, e.target.value)}
                    placeholder="Case name"
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: themeTokens.text,
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      outline: "none",
                      flex: "1 1 auto",
                      padding: "2px 4px",
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isMatched ? (
                    <span
                      style={{
                        backgroundColor: themeTokens.pass,
                        color: "#ffffff",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                      }}
                    >
                      MATCHED
                    </span>
                  ) : (
                    <span style={{ color: themeTokens.textMuted, fontSize: "0.72rem" }}>
                      Skipped
                    </span>
                  )}

                  {branches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBranch(idx)}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        color: themeTokens.textMuted,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                      title="Remove case"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* WHEN (Condition) */}
              <div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    color: themeTokens.textMuted,
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  WHEN
                </div>
                <RuleBuilder
                  value={b.condition}
                  onChange={(c) => handleBranchConditionChange(idx, c)}
                  fields={fields}
                  theme={themeTokens}
                />
              </div>

              {/* THEN RETURN (Output JSON) */}
              <div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    color: themeTokens.textMuted,
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  THEN RETURN
                </div>
                <textarea
                  rows={2}
                  value={outputTexts[b.id] ?? JSON.stringify(b.output, null, 2)}
                  onChange={(e) => handleBranchOutputChange(idx, b.id, e.target.value)}
                  placeholder='{ "discount": 20 }'
                  style={{
                    width: "100%",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "0.78rem",
                    padding: "6px 8px",
                    borderRadius: "4px",
                    border: `1px solid ${themeTokens.border}`,
                    backgroundColor: themeTokens.codeBg,
                    color: themeTokens.codeText,
                    boxSizing: "border-box",
                    outline: "none",
                    lineHeight: "1.4",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Default Output Fallback */}
      <div
        style={{
          borderRadius: "6px",
          border: `1px dashed ${themeTokens.border}`,
          backgroundColor: themeTokens.surface,
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div
          style={{
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.5px",
            color: themeTokens.textMuted,
            textTransform: "uppercase",
          }}
        >
          ELSE (Default Return Value)
        </div>
        <textarea
          rows={2}
          value={defaultOutputText}
          onChange={(e) => handleDefaultOutputChange(e.target.value)}
          placeholder='{ "discount": 0 }'
          style={{
            width: "100%",
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.78rem",
            padding: "6px 8px",
            borderRadius: "4px",
            border: `1px solid ${themeTokens.border}`,
            backgroundColor: themeTokens.codeBg,
            color: themeTokens.codeText,
            boxSizing: "border-box",
            outline: "none",
            lineHeight: "1.4",
          }}
        />
      </div>

      {/* Bottom Add Case Button */}
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <button
          type="button"
          onClick={handleAddBranch}
          style={{
            padding: "5px 12px",
            fontSize: "0.76rem",
            fontWeight: 600,
            borderRadius: "4px",
            border: `1px solid ${themeTokens.border}`,
            backgroundColor: themeTokens.surface3,
            color: themeTokens.text,
            cursor: "pointer",
          }}
        >
          + Add Another Case
        </button>
      </div>
    </div>
  );
}

export { fromAST, toAST, defaultComparison, defaultGroup } from "./builderModel.js";
export type { BuilderNode, BuilderGroup, BuilderComparison } from "./builderModel.js";
