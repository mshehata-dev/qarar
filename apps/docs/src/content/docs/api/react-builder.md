---
title: React RuleBuilder UI (@qarar/react-builder)
description: Embed visual rule authoring components directly in React web applications and internal admin tools.
---

`@qarar/react-builder` provides an embeddable, visual rule authoring UI component (`<RuleBuilder />`) for React apps.

## Usage

```tsx
import { RuleBuilder } from "@qarar/react-builder";
import type { RuleNode } from "@qarar/spec";

function MyAdminPanel() {
  const [ruleNode, setRuleNode] = useState<RuleNode>(initialAST);

  return (
    <RuleBuilder
      fields={[
        { path: "customer.age", label: "Customer Age", type: "number" },
        { path: "customer.plan", label: "Subscription Plan", type: "enum" },
      ]}
      value={ruleNode}
      onChange={(updatedNode) => setRuleNode(updatedNode)}
    />
  );
}
```

## Props

- `value`: `Rule` object or `RuleNode` root.
- `onChange`: Callback function `(node: RuleNode) => void`.
- `fields`: Array of field definitions (`{ path, label, type, options }`).
