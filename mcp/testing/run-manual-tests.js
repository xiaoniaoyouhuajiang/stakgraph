#!/usr/bin/env node

/**
 * Manual test runner for console logs functionality
 * Run with: node --loader ts-node/esm testing/run-manual-tests.js
 */

import { runManualTests } from '../src/tools/stagehand/__tests__/console-logs.test.ts';

console.log('Starting console logs manual tests...\n');

try {
  await runManualTests();
  console.log('\n🎉 All tests completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n💥 Tests failed:', error);
  process.exit(1);
}