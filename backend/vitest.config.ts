import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
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
