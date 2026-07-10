# Published SDK Test App

This app validates that the published `@qarar/sdk` package works outside the monorepo.

## Run

```bash
cd examples/published-test-app
npm install
npm start
```

Expected output:

- `Result: PASS` for the default sample data
- process exits with code `1` if the rule evaluation fails (fail-fast behavior)
