// TEST-CORE ONLY: expose the existing Express backend as a Vercel function.
// This file lives only on the test-core branch.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-core-access-secret-only-not-production-2026";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-core-refresh-secret-only-not-production-2026";
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || "https://jeutaime2-0-git-test-core-warren573s-projects.vercel.app";

const app = require("../../backend/dist/app").default;
module.exports = app;
