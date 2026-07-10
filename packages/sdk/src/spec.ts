import { z } from "zod";

export const FieldNodeSchema = z.object({
  type: z.literal("field"),
  path: z.string().min(1),
});

export const StringValueSchema = z.object({
  type: z.literal("string"),
  value: z.string(),
});

export const NumberValueSchema = z.object({
  type: z.literal("number"),
  value: z.number(),
});

export const BooleanValueSchema = z.object({
  type: z.literal("boolean"),
  value: z.boolean(),
});

export const NullValueSchema = z.object({
  type: z.literal("null"),
});

export const ScalarValueSchema = z.discriminatedUnion("type", [
  StringValueSchema,
  NumberValueSchema,
  BooleanValueSchema,
  NullValueSchema,
]);

export const ArrayValueSchema = z.object({
  type: z.literal("array"),
  values: z.array(ScalarValueSchema).min(1),
});

export const ValueNodeSchema = z.discriminatedUnion("type", [
  FieldNodeSchema,
  StringValueSchema,
  NumberValueSchema,
  BooleanValueSchema,
  NullValueSchema,
  ArrayValueSchema,
]);

export const ComparisonOperator = z.enum([
  "eq",
  "neq",
  "isNull",
  "isNotNull",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "notIn",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "matches",
  "notMatches",
]);

export const ComparisonNodeSchema = z.object({
  type: ComparisonOperator,
  left: ValueNodeSchema,
  right: ValueNodeSchema,
});

export const BetweenNodeSchema = z.object({
  type: z.literal("between"),
  left: ValueNodeSchema,
  min: ValueNodeSchema,
  max: ValueNodeSchema,
});

export type RuleNode =
  | z.infer<typeof ComparisonNodeSchema>
  | z.infer<typeof BetweenNodeSchema>
  | { type: "and"; conditions: RuleNode[] }
  | { type: "or"; conditions: RuleNode[] }
  | { type: "not"; condition: RuleNode };

const RuleNodeSchemaBase: z.ZodType<RuleNode> = z.lazy(() =>
  z.union([
    ComparisonNodeSchema,
    BetweenNodeSchema,
    z.object({
      type: z.literal("and"),
      conditions: z.array(RuleNodeSchemaBase).min(1),
    }),
    z.object({
      type: z.literal("or"),
      conditions: z.array(RuleNodeSchemaBase).min(1),
    }),
    z.object({
      type: z.literal("not"),
      condition: RuleNodeSchemaBase,
    }),
  ])
);

export const RuleNodeSchema = RuleNodeSchemaBase;

export const RuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().default("1"),
  root: RuleNodeSchema,
});

export type Rule = z.infer<typeof RuleSchema>;
export type FieldNode = z.infer<typeof FieldNodeSchema>;
export type ValueNode = z.infer<typeof ValueNodeSchema>;
export type ScalarValue = z.infer<typeof ScalarValueSchema>;
export type ArrayValue = z.infer<typeof ArrayValueSchema>;
export type ComparisonNode = z.infer<typeof ComparisonNodeSchema>;
export type BetweenNode = z.infer<typeof BetweenNodeSchema>;
export type ComparisonOp = z.infer<typeof ComparisonOperator>;

export function validateRule(input: unknown): Rule {
  return RuleSchema.parse(input);
}

export function safeValidateRule(input: unknown) {
  return RuleSchema.safeParse(input);
}
