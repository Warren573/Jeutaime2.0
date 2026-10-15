import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Guard against accidental reintroduction of production test routes.
// In addition to this static regression test, validate deployed endpoints.
describe("production test-route isolation", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app.ts"), "utf8");
  it("enables test routes only outside production", () => {
    expect(source).toMatch(/const allowTestRoutes\s*=\s*env\.NODE_ENV\s*!==\s*["']production["']/);
    expect(source).toMatch(/if\s*\(allowTestRoutes\)\s*\{\s*app\.use\(\x60\$\{api\}\/test\x60,\s*testRoutes\)/);
  });
  it("does not allow environment overrides for test routes", () => {
    const block = source.split("const allowTestRoutes =")[1]?.split("if (allowTestRoutes)")[0] ?? "";
    expect(block).not.toMatch(/ALLOW_TEST_ENDPOINTS|RENDER_SERVICE_NAME/);
  });
});
