/**
 * E2E Test Setup for Detox
 */

const { detoxExpect } = require('detox');

beforeAll(async () => {
  await device.launchApp();
});

beforeEach(async () => {
  await device.reloadReactNative();
});

// Extend Jest matchers with Detox matchers
global.expect = detoxExpect;
