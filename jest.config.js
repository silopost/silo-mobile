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
  "react-native-paper",
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
  setupFiles: ["./jest.polyfills.js"],
  setupFilesAfterEnv: ["./jest.setup.ts"],
  transformIgnorePatterns: [`node_modules/(?!(${transformed.join("|")})|.*\\.mjs$)`],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
