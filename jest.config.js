const preset = require("jest-expo/android/jest-preset");

// The JS transform of the preset (babel with Expo's preset), reused for the .mjs files of msw and
// its dependencies, which the preset's `\.[jt]sx?$` pattern does not match.
const jsTransform = Object.entries(preset.transform).find(([pattern]) => pattern.includes("jt"))[1];

// Package name prefixes in node_modules that ship untranspiled code: React Native libraries, and
// msw with its ES-module-only dependencies.
const transformed = [
  "(jest-)?react-native",
  "@react-native(-community)?",
  "expo(nent)?",
  "@expo(nent)?/.*",
  "react-navigation",
  "@react-navigation/.*",
  "standard-navigation",
  "react-native-drawer-layout",
  "react-native-paper",
  "@shopify/flash-list",
  "react-native-vector-icons",
  "msw",
  "@msw/.*",
  "@mswjs/.*",
  "@open-draft/.*",
  "cookie",
  "until-async",
];

/** @type {import('jest').Config} */
module.exports = {
  // Android is the target platform of silo-mobile, so components render with Platform.OS android.
  preset: "jest-expo/android",
  testEnvironment: "./jest.environment.js",
  transform: { "\\.mjs$": jsTransform },
  // react-native-reanimated's mock does not load under jest-expo (see src/test/reanimated-mock.js);
  // jest.setup.ts and expo-router's testing-library both mock the library with this path.
  moduleNameMapper: {
    "^react-native-reanimated/mock$": "<rootDir>/src/test/reanimated-mock.js",
  },
  setupFiles: ["./jest.polyfills.js"],
  setupFilesAfterEnv: ["./jest.setup.ts"],
  transformIgnorePatterns: [`node_modules/(?!(${transformed.join("|")})|.*\\.mjs$)`],
  // expo-router's renderRouter turns fake timers on; msw (and Node's fetch under it) answer through
  // real timers, so fake timers only freeze the clock here.
  fakeTimers: {
    doNotFake: [
      "nextTick",
      "queueMicrotask",
      "setImmediate",
      "clearImmediate",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "hrtime",
      "performance",
    ],
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
