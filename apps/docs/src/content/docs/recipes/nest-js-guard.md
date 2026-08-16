---
title: NestJS Rule Guard Recipe
description: Enforce dynamic business rules using NestJS Guards and Custom Decorators.
---

Integrate `@qarar/sdk` into NestJS applications to protect controller endpoints dynamically.

## Custom Decorator (`@EnforceRule`)

```ts
// rule.decorator.ts
import { SetMetadata } from '@nestjs/common';
import type { Rule } from '@qarar/sdk';

export const RULE_KEY = 'qarar_rule';
export const EnforceRule = (rule: Rule) => SetMetadata(RULE_KEY, rule);
```

## NestJS Guard (`QararRuleGuard`)

```ts
// rule.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { checkRule, Rule } from '@qarar/sdk';
import { RULE_KEY } from './rule.decorator';

@Injectable()
export class QararRuleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targetRule = this.reflector.get<Rule>(RULE_KEY, context.getHandler());
    if (!targetRule) return true;

    const request = context.switchToHttp().getRequest();
    const payload = {
      user: request.user,
      body: request.body,
    };

    const check = checkRule(targetRule, payload);
    if (!check.result) {
      throw new ForbiddenException({
        message: 'Access denied by business rule policy',
        reasons: check.reasons,
      });
    }

    return true;
  }
}
```

## Usage in Controller

```ts
// feature.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { rule } from '@qarar/sdk';
import { QararRuleGuard } from './rule.guard';
import { EnforceRule } from './rule.decorator';

const premiumFeatureRule = rule("Premium Analytics Gate")
  .where("user.plan").eq("premium")
  .build();

@Controller('analytics')
@UseGuards(QararRuleGuard)
export class AnalyticsController {
  @Post('export')
  @EnforceRule(premiumFeatureRule)
  exportData() {
    return { status: 'Export initiated' };
  }
}
```
