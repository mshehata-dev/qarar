import type { ComparisonOp } from "@qarar/spec";

export type AllOp = ComparisonOp | "between";

export interface FieldDef {
  path: string;
  label: string;
  type: "string" | "number" | "boolean";
  operators: AllOp[];
  enumValues?: string[];
}

export interface SchemaConfig {
  fields: FieldDef[];
}

export const DEFAULT_OPERATORS_BY_TYPE: Record<FieldDef["type"], AllOp[]> = {
  number: ["gt", "gte", "lt", "lte", "eq", "neq", "between", "in", "notIn", "isNull", "isNotNull"],
  string: [
    "eq",
    "neq",
    "contains",
    "notContains",
    "startsWith",
    "endsWith",
    "matches",
    "notMatches",
    "in",
    "notIn",
    "isNull",
    "isNotNull",
  ],
  boolean: ["eq", "neq", "isNull", "isNotNull"],
};

function pathToLabel(path: string): string {
  const last = path.split(".").filter(Boolean).pop() ?? path;
  return last
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function inferType(values: unknown[]): FieldDef["type"] {
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return "string";
  if (present.every((v) => typeof v === "boolean")) return "boolean";
  if (present.every((v) => typeof v === "number")) return "number";
  return "string";
}

function flattenObject(input: unknown, prefix = "", out = new Map<string, unknown[]>()) {
  if (input === null || input === undefined) {
    if (prefix) out.set(prefix, [...(out.get(prefix) ?? []), input]);
    return out;
  }

  if (Array.isArray(input)) {
    if (prefix) out.set(prefix, [...(out.get(prefix) ?? []), ...input]);
    return out;
  }

  if (typeof input === "object") {
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        flattenObject(val, path, out);
      } else {
        out.set(path, [...(out.get(path) ?? []), val]);
      }
    }
  }

  return out;
}

export function inferFieldsFromData(input: unknown): FieldDef[] {
  const flattened = flattenObject(input);
  const fields: FieldDef[] = [];

  for (const [path, values] of flattened.entries()) {
    const type = inferType(values);
    const distinct = Array.from(
      new Set(
        values
          .filter((v): v is string | number | boolean => v !== null && v !== undefined)
          .map(String)
      )
    );
    fields.push({
      path,
      label: pathToLabel(path),
      type,
      operators: DEFAULT_OPERATORS_BY_TYPE[type],
      enumValues: distinct.length > 0 && distinct.length <= 12 ? distinct : undefined,
    });
  }

  return fields.sort((a, b) => a.path.localeCompare(b.path));
}

export function mergeSchema(base: SchemaConfig, inferredFields: FieldDef[]): SchemaConfig {
  const byPath = new Map<string, FieldDef>();
  for (const field of base.fields) byPath.set(field.path, field);
  for (const field of inferredFields) {
    const existing = byPath.get(field.path);
    if (!existing) {
      byPath.set(field.path, field);
      continue;
    }
    byPath.set(field.path, {
      ...existing,
      type: field.type,
      operators: DEFAULT_OPERATORS_BY_TYPE[field.type],
      enumValues: field.enumValues ?? existing.enumValues,
    });
  }
  return { fields: Array.from(byPath.values()) };
}

export const DEFAULT_SCHEMA: SchemaConfig = {
  fields: [
    {
      path: "customer.age",
      label: "Age",
      type: "number",
      operators: DEFAULT_OPERATORS_BY_TYPE.number,
    },
    {
      path: "customer.plan",
      label: "Plan",
      type: "string",
      operators: DEFAULT_OPERATORS_BY_TYPE.string,
      enumValues: ["free", "basic", "premium", "enterprise"],
    },
    {
      path: "customer.country",
      label: "Country",
      type: "string",
      operators: DEFAULT_OPERATORS_BY_TYPE.string,
      enumValues: ["EG", "US", "GB", "DE", "FR", "AE"],
    },
    {
      path: "customer.email",
      label: "Email",
      type: "string",
      operators: DEFAULT_OPERATORS_BY_TYPE.string,
    },
    {
      path: "customer.verified",
      label: "Verified",
      type: "boolean",
      operators: DEFAULT_OPERATORS_BY_TYPE.boolean,
    },
    {
      path: "order.total",
      label: "Order Total",
      type: "number",
      operators: DEFAULT_OPERATORS_BY_TYPE.number,
    },
    {
      path: "order.currency",
      label: "Currency",
      type: "string",
      operators: DEFAULT_OPERATORS_BY_TYPE.string,
      enumValues: ["USD", "EUR", "GBP", "EGP"],
    },
  ],
};

export const OPERATOR_LABELS: Record<AllOp, string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "in",
  notIn: "not in",
  contains: "contains",
  notContains: "not contains",
  startsWith: "starts with",
  endsWith: "ends with",
  matches: "matches regex",
  notMatches: "does not match regex",
  isNull: "is null",
  isNotNull: "is not null",
  between: "between",
};
