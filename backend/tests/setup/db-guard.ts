import dotenv from "dotenv";
import { assertTestDatabaseIsolated } from "./dbGuard";

// Même chargement que src/config/env.ts (dotenv ne remplace pas les variables déjà définies) : on contrôle donc
// exactement les valeurs que verra le client Prisma, y compris celles venant d'un fichier backend/.env.
dotenv.config();
assertTestDatabaseIsolated(process.env);
