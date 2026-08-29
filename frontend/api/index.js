// TEST-CORE ONLY: explicit Vercel Function entrypoint for the Express backend.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-core-access-secret-only-not-production-2026";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-core-refresh-secret-only-not-production-2026";
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || "https://jeutaime2-0-git-test-core-warren573s-projects.vercel.app";

const app = require("../../backend/dist/app").default;

module.exports = (req, res) => {
  const path = typeof req.query?.path === "string" ? req.query.path : "";
  const originalUrl = req.url || "/api";
  const queryIndex = originalUrl.indexOf("?");
  const search = queryIndex >= 0 ? originalUrl.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(search);
  params.delete("path");
  const rest = params.toString();
  req.url = `/api${path ? `/${path}` : ""}${rest ? `?${rest}` : ""}`;
  return app(req, res);
};
