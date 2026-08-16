import type { RuleNode, ComparisonOp } from "@qarar/spec";

export type AllOp =
  | ComparisonOp
  | "between"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "matches"
  | "notMatches"
  | "isNull"
  | "isNotNull";

export interface BuilderComparison {
  kind: "comparison";
  id: string;
  field: string;
  operator: AllOp;
  value: string;
  value2?: string;
}

export interface BuilderGroup {
  kind: "group";
  id: string;
  logic: "and" | "or" | "not";
  children: BuilderNode[];
}

export type BuilderNode = BuilderComparison | BuilderGroup;

let _counter = 0;
function uid(): string {
  return `n${++_counter}`;
}

export function defaultComparison(field = "field"): BuilderComparison {
  return { kind: "comparison", id: uid(), field, operator: "eq", value: "" };
}

export function defaultGroup(logic: "and" | "or" | "not" = "and"): BuilderGroup {
  return {
    kind: "group",
    id: uid(),
    logic,
    children: [defaultComparison()],
  };
}

export function fromAST(node: RuleNode): BuilderNode {
  if (node.type === "and" || node.type === "or") {
    return {
      kind: "group",
      id: uid(),
      logic: node.type,
      children: node.conditions.map(fromAST),
    };
  }

  if (node.type === "not") {
    return {
      kind: "group",
      id: uid(),
      logic: "not",
      children: [fromAST(node.condition)],
    };
  }

  if (node.type === "between") {
    const field = node.left.type === "field" ? node.left.path : "";
    const min = node.min.type === "number" ? String(node.min.value) : "";
    const max = node.max.type === "number" ? String(node.max.value) : "";
    return { kind: "comparison", id: uid(), field, operator: "between", value: min, value2: max };
  }

  const field = node.left.type === "field" ? node.left.path : "";
  const raw = node.right;

  let value = "";
  if (raw.type === "string" || raw.type === "number" || raw.type === "boolean") {
    value = String(raw.value);
  } else if (raw.type === "array") {
    value = raw.values.map((v) => ("value" in v ? String(v.value) : "")).join(", ");
  }

  return {
    kind: "comparison",
    id: uid(),
    field,
    operator: node.type as ComparisonOp,
    value,
  };
}

function coerceScalar(value: string, fieldType: string) {
  if (fieldType === "number") return { type: "number" as const, value: Number(value) };
  if (fieldType === "boolean") return { type: "boolean" as const, value: value === "true" };
  return { type: "string" as const, value };
}

export function toAST(
  node: BuilderNode,
  fieldTypeMap: Record<string, string> = {}
): RuleNode {
  if (node.kind === "group") {
    if (node.logic === "not") {
      const child = node.children[0];
      return {
        type: "not",
        condition: child
          ? toAST(child, fieldTypeMap)
          : { type: "eq", left: { type: "field", path: "" }, right: { type: "null" } },
      };
    }
    return {
      type: node.logic,
      conditions: node.children.map((c) => toAST(c, fieldTypeMap)),
    } as RuleNode;
  }

  const fieldType = fieldTypeMap[node.field] ?? "string";
  const leftNode = { type: "field" as const, path: node.field };

  if (node.operator === "between") {
    return {
      type: "between",
      left: leftNode,
      min: { type: "number", value: Number(node.value || 0) },
      max: { type: "number", value: Number(node.value2 || 0) },
    };
  }

  if (node.operator === "in" || node.operator === "notIn") {
    const rawItems = node.value.split(",").map((s) => s.trim()).filter(Boolean);
    const values = rawItems.map((item) => coerceScalar(item, fieldType));
    return {
      type: node.operator,
      left: leftNode,
      right: { type: "array", values },
    };
  }

  if (node.operator === "isNull" || node.operator === "isNotNull") {
    return {
      type: node.operator,
      left: leftNode,
      right: { type: "null" },
    };
  }

  return {
    type: node.operator as ComparisonOp,
    left: leftNode,
    right: coerceScalar(node.value, fieldType),
  } as RuleNode;
}
