/**
 * Behavioural tests for React Native components.
 *
 * The existing Vitest suite runs pure functions and source-level guards in a
 * plain Node environment, which cannot render anything. That gap is why MOB-01
 * and MOB-03 survived a green suite: the guards proved a `catch` existed and
 * that `showToast` was called, but nothing could observe that the toast had no
 * component to render it, or that an HTML 200 was being treated as success.
 *
 * Vitest is kept for the fast pure tests. Jest runs only the files that need a
 * renderer, so nothing already written had to be rewritten to add this.
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/*.rn.test.tsx", "**/*.rn.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // React Native keeps its own timers and the Animated driver alive after a
  // test finishes; without this the runner sits waiting on handles it does not
  // own. Tests themselves are still bounded by testTimeout.
  forceExit: true,
  testTimeout: 15000,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
