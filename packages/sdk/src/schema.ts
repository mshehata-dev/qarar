import { rule, type RuleBuilder } from "./builder.js";
import { checkRule, type CheckRuleResult } from "./engine.js";
import type { ExplainOptions } from "./explainability.js";

export type SchemaIssue = { path?: (string | number)[]; message: string };

export type SchemaParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues?: SchemaIssue[]; message?: string } };

export interface SchemaLike<T = unknown> {
  safeParse(data: unknown): SchemaParseResult<T>;
}

export type InferSchemaData<S> = S extends { safeParse(data: unknown): SchemaParseResult<infer D> }
  ? D
  : unknown;

export interface QararSchemaInstance<S extends SchemaLike<any>> {
  schema: S;
  rule(nameOrId?: string): RuleBuilder;
  validateData(data: unknown): SchemaParseResult<InferSchemaData<S>>;
  check(
    ruleInput: unknown,
    data: unknown,
    options?: ExplainOptions
  ): CheckRuleResult & { dataError?: unknown };
}

export function createQarar<S extends SchemaLike<any>>(
  dataSchema: S
): QararSchemaInstance<S> {
  return {
    schema: dataSchema,
    rule(nameOrId?: string): RuleBuilder {
      return rule(nameOrId);
    },
    validateData(data: unknown) {
      return dataSchema.safeParse(data);
    },
    check(
      ruleInput: unknown,
      data: unknown,
      options?: ExplainOptions
    ): CheckRuleResult & { dataError?: unknown } {
      const dataParse = dataSchema.safeParse(data);
      if (!dataParse.success) {
        const issues = dataParse.error?.issues;
        const reasons =
          Array.isArray(issues) && issues.length > 0
            ? issues.map((issue) => {
                const p = Array.isArray(issue.path) ? issue.path.join(".") : "";
                return p ? `Data error at ${p}: ${issue.message}` : `Data error: ${issue.message}`;
              })
            : [dataParse.error?.message || "Data validation error"];

        return {
          ok: false,
          result: false,
          reasons,
          trace: { type: "logical", operator: "and", passed: false, children: [] },
          dataError: dataParse.error,
        };
      }

      return checkRule(
        ruleInput,
        dataParse.data as Record<string, unknown>,
        options
      );
    },
  };
}
