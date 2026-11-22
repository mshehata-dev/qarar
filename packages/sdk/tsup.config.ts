import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/spec.ts",
    "src/engine.ts",
    "src/explainability.ts",
    "src/builder.ts",
    "src/sql.ts",
    "src/mongo.ts",
    "src/schema.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: [
    "@qarar/spec",
    "@qarar/engine-js",
    "@qarar/explainability",
    "@qarar/compiler-sql",
    "@qarar/compiler-mongo",
  ],
});
