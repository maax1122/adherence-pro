/**
 * E2E Test Configuration for Detox
 */

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/e2e/jest.setup.js'],
  testMatch: ['<rootDir>/e2e/**/*.e2e.{ts,tsx}'],
  testTimeout: 120000,
  maxWorkers: 1,
  verbose: true,
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment',
};
