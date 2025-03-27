# Google Calendar MCP Tests

This directory contains tests for the Google Calendar MCP server to ensure functionality and prevent regressions.

## Test Structure

- `simple.test.ts`: Basic tests to verify the testing infrastructure
- `schema.test.ts`: Validates Zod schemas used for input validation
- `essentials.test.ts`: Tests for essential functionality
- `token-manager.simplified.test.ts`: Basic tests for the TokenManager
- `auth-server.simplified.test.ts`: Basic tests for the AuthServer
- `server.simplified.test.ts`: Basic tests for the MCP server
- `integration/`: Contains integration tests

## Running Tests

Run all tests:
```bash
npm test
```

Run specific tests:
```bash
npm test -- src/tests/simple.test.ts
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Pre-Commit Checks

A pre-commit check script is included to verify code quality before committing:
```bash
npm run precommit
```

This script runs:
1. TypeScript type checking
2. Basic tests (simple.test.ts and schema.test.ts)

## Test Configuration

- Jest is used as the testing framework
- Tests are run with ESM support using `--experimental-vm-modules`
- TypeScript configuration excludes tests from the main build
- A separate tsconfig.test.json file is available for testing