import { defineConfig } from "vitest/config";

/**
 * Unit tests for this app's pure logic — the data-loading and formatting
 * helpers in lib/. There is no React Native renderer here: anything that
 * touches a native module or renders a component is out of scope, and
 * `lib/supabase.ts` in particular cannot be imported under Node at all (it
 * reads EXPO_PUBLIC_* at module scope and registers an AppState listener).
 *
 * A test therefore mocks `lib/api` rather than reaching through it, which is
 * also what keeps these tests from needing a network or a database.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
