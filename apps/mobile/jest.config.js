/**
 * jest-expo is the only preset that handles React Native's shipped source: it is
 * Flow-typed, so esbuild (and therefore Vitest, which this suite used to run on)
 * cannot parse it, and @testing-library/react-native is CJS — its
 * `require("react-native")` bypasses a bundler's transform pipeline and reaches
 * Node raw. Rendering a component needs Babel in the module loader itself, which
 * is what Jest's transform is.
 *
 * `lib/**` tests are pure logic and could have stayed on Vitest, but two runners
 * in one package means two mock APIs and two configs for no gain.
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/lib/**/*.test.ts", "**/components/**/*.test.tsx", "**/app/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop))",
  ],
  moduleNameMapper: {
    "^@levelup/engine$": "<rootDir>/../../packages/engine/src/index.ts",
  },
  clearMocks: true,
};
