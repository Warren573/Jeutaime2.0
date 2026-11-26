import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Refuse de démarrer si la base visée n'est pas une base locale de test (voir tests/setup/dbGuard.ts).
    setupFiles: ["tests/setup/db-guard.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "test-results.json",
    },
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/policies/**"],
    },
  },
  resolve: {
    alias: {
      "@config": resolve(__dirname, "src/config"),
      "@core": resolve(__dirname, "src/core"),
      "@modules": resolve(__dirname, "src/modules"),
      "@policies": resolve(__dirname, "src/policies"),
    },
  },
});
