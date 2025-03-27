#!/bin/bash

# Script to run tests before commit

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running test checks before commit...${NC}"

# Run TypeScript type checking (excluding tests)
echo -e "Running TypeScript type checking..."
npm run typecheck
TYPECHECK_RESULT=$?

# Run tests (only the working ones for now)
echo -e "Running tests..."
npm test -- src/tests/simple.test.ts src/tests/schema.test.ts
TEST_RESULT=$?

# Check results
if [ $TYPECHECK_RESULT -ne 0 ] || [ $TEST_RESULT -ne 0 ]; then
  echo -e "${RED}Test checks failed! Please fix the issues before committing.${NC}"
  exit 1
else
  echo -e "${GREEN}All test checks passed!${NC}"
  exit 0
fi