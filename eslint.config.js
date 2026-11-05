// Flat config (ESLint 9): Expo's preset brings typescript-eslint, React and React Hooks rules
// and resolves the React Native platform extensions.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", "coverage/*", "android/*", "ios/*", ".expo/*", "src/api/schema.d.ts"] },
  {
    files: ["**/*.test.{ts,tsx}", "jest.setup.ts", "src/test/**"],
    languageOptions: { globals: { jest: "readonly" } },
  },
]);
