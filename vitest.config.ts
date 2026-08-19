import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // `*.rn.test.*` needs a React Native renderer and runs under Jest
    // (see jest.config.js); Vitest keeps the fast pure and source tests.
    exclude: ["**/node_modules/**", "src/**/*.rn.test.ts", "src/**/*.rn.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
