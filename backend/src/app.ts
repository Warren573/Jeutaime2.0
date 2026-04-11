import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env, corsOrigins } from "./config/env";
import { requestLogger } from "./core/middleware/requestLogger";
import { generalRateLimit } from "./core/middleware/rateLimit";
import { errorHandler } from "./core/middleware/errorHandler";

// Modules
import healthRoutes from "./modules/health/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import profilesRoutes from "./modules/profiles/profiles.routes";
import usersRoutes from "./modules/users/users.routes";
import matchesRoutes from "./modules/matches/matches.routes";
import lettersRoutes from "./modules/letters/letters.routes";
import photosRoutes from "./modules/photos/photos.routes";
import walletRoutes from "./modules/wallet/wallet.routes";
import premiumRoutes from "./modules/premium/premium.routes";
import salonsRoutes from "./modules/salons/salons.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import adminSalonsRoutes from "./modules/admin/salons/adminSalons.routes";
import adminUploadRoutes, {
  publicFilesRouter,
} from "./modules/admin/upload/adminUpload.routes";
import adminReportsRoutes from "./modules/admin/reports/adminReports.routes";
import adminUsersRoutes from "./modules/admin/users/adminUsers.routes";
import adminAuditRoutes from "./modules/admin/audit/adminAudit.routes";

const app = express();

// ------------------------------------------------------------------
// Sécurité
// ------------------------------------------------------------------
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ------------------------------------------------------------------
// Logging + parsing
// ------------------------------------------------------------------
app.use(requestLogger);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------------
// Rate limiting général
// ------------------------------------------------------------------
app.use(generalRateLimit);

// ------------------------------------------------------------------
// Confiance proxy (nécessaire pour express-rate-limit derrière Nginx)
// ------------------------------------------------------------------
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------
const api = env.API_PREFIX;

app.use(`${api}/health`, healthRoutes);
app.use(`${api}/auth`, authRoutes);
app.use(`${api}/profiles`, profilesRoutes);
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/matches`, matchesRoutes);
app.use(`${api}/letters`, lettersRoutes);
app.use(`${api}/photos`, photosRoutes);
app.use(`${api}/wallet`, walletRoutes);
app.use(`${api}/premium`, premiumRoutes);
app.use(`${api}/salons`, salonsRoutes);
app.use(`${api}/reports`, reportsRoutes);

// Admin (ADMIN/MOD role required — enforced inside each router)
app.use(`${api}/admin/salons`, adminSalonsRoutes);
app.use(`${api}/admin/upload`, adminUploadRoutes);
app.use(`${api}/admin/reports`, adminReportsRoutes);
app.use(`${api}/admin/users`, adminUsersRoutes);
app.use(`${api}/admin/audit-log`, adminAuditRoutes);

// Public stream de fichiers admin (URLs opaques, no auth)
app.use(`${api}/files`, publicFilesRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route introuvable" } });
});

// ------------------------------------------------------------------
// Gestionnaire d'erreurs global
// ------------------------------------------------------------------
app.use(errorHandler);

export default app;
