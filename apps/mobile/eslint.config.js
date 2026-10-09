// @ts-check
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = [
  ...expoConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  eslintConfigPrettier,
  {
    ignores: ["node_modules/**", ".expo/**", "android/**", "ios/**"],
  },
];
