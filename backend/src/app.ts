import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env, corsOriginCallback } from "./config/env";
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
import salonSessionsRoutes from "./modules/salon-sessions/salonSessions.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import magiesRoutes from "./modules/magies/magies.routes";
import offeringsRoutes from "./modules/offerings/offerings.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import supportRoutes from "./modules/support/support.routes";
import adminSalonsRoutes from "./modules/admin/salons/adminSalons.routes";
import adminUploadRoutes, {
  publicFilesRouter,
} from "./modules/admin/upload/adminUpload.routes";
import adminReportsRoutes from "./modules/admin/reports/adminReports.routes";
import adminUsersRoutes from "./modules/admin/users/adminUsers.routes";
import adminAuditRoutes from "./modules/admin/audit/adminAudit.routes";
import adminSupportRoutes from "./modules/admin/support/adminSupport.routes";
import reactionsRoutes from "./modules/reactions/reactions.routes";
import cardGameRoutes from "./modules/card-game/card-game.routes";
import bottlesRoutes from "./modules/bottles/bottles.routes";
import refugeRoutes from "./modules/refuge/refuge.routes";
import souvenirsRoutes from "./modules/souvenirs/souvenirs.routes";
import statsRoutes from "./modules/stats/stats.routes";
import weeklyProfileRoutes from "./modules/weekly-profile/weekly-profile.routes";
import testRoutes from "./modules/test/test.routes";
import debugRoutes from "./modules/debug/debug.routes";

const app = express();

// ------------------------------------------------------------------
// Sécurité
// ------------------------------------------------------------------
app.use(helmet());

const corsOptions = {
  origin: corsOriginCallback,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Respond to every OPTIONS preflight before any other middleware touches it
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

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
app.use(`${api}/salon-sessions`, salonSessionsRoutes);
app.use(`${api}/reports`, reportsRoutes);
app.use(`${api}/magies`, magiesRoutes);
app.use(`${api}/offerings`, offeringsRoutes);
app.use(`${api}/notifications`, notificationsRoutes);
app.use(`${api}/support`, supportRoutes);
app.use(`${api}/discover`, reactionsRoutes);
app.use(`${api}/card-game`, cardGameRoutes);
app.use(`${api}/bottles`, bottlesRoutes);
app.use(`${api}/refuge`, refugeRoutes);
app.use(`${api}/souvenirs`, souvenirsRoutes);
app.use(`${api}/stats`, statsRoutes);
app.use(`${api}/weekly-profile`, weeklyProfileRoutes);

// Outils de développement : jamais exposés en production.
if (env.NODE_ENV !== "production") {
  app.use(`${api}/test`, testRoutes);
  app.use(`${api}/debug`, debugRoutes);
}

// Admin (ADMIN/MOD role required — enforced inside each router)
app.use(`${api}/admin/salons`, adminSalonsRoutes);
app.use(`${api}/admin/upload`, adminUploadRoutes);
app.use(`${api}/admin/reports`, adminReportsRoutes);
app.use(`${api}/admin/users`, adminUsersRoutes);
app.use(`${api}/admin/audit-log`, adminAuditRoutes);
app.use(`${api}/admin/support`, adminSupportRoutes);

// Public stream de fichiers admin (URLs opaques, no auth)
app.use(`${api}/files`, publicFilesRouter);

if (env.NODE_ENV !== "production") {
  console.log(`[DEBUG-APP] API_PREFIX: ${api}`);
  console.log(`[DEBUG-APP] Salon-sessions routes registered at: ${api}/salon-sessions`);
}

// 404
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route introuvable" } });
});

// ------------------------------------------------------------------
// Gestionnaire d'erreurs global
// ------------------------------------------------------------------
app.use(errorHandler);

export default app;
