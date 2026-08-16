import { z } from "zod";
import { rule, RuleBuilder } from "./builder.js";
import { checkRule, CheckRuleResult } from "./engine.js";
import { ExplainOptions } from "./explainability.js";

export interface QararSchemaInstance<T extends z.ZodTypeAny> {
  schema: T;
  rule(nameOrId?: string): RuleBuilder;
  validateData(data: unknown): z.SafeParseReturnType<unknown, z.infer<T>>;
  check(
    ruleInput: unknown,
    data: unknown,
    options?: ExplainOptions
  ): CheckRuleResult & { dataError?: z.ZodError };
}

export function createQarar<T extends z.ZodTypeAny>(
  dataSchema: T
): QararSchemaInstance<T> {
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
    ): CheckRuleResult & { dataError?: z.ZodError } {
      const dataParse = dataSchema.safeParse(data);
      if (!dataParse.success) {
        return {
          ok: false,
          result: false,
          reasons: dataParse.error.issues.map(
            (issue) => `Data error at ${issue.path.join(".")}: ${issue.message}`
          ),
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
