import { prisma } from "../../config/prisma";

export async function recordLoginEvent(params: {
  email: string;
  userId?: string | null;
  success: boolean;
  reason?: string | null;
}) {
  const email = params.email.trim().toLowerCase();
  if (!email) return;
  await prisma.loginEvent.create({
    data: {
      email,
      userId: params.userId ?? null,
      success: params.success,
      reason: params.reason ?? null,
    },
  }).catch(() => undefined);
}

export async function recordSystemIncident(params: {
  level?: string;
  source?: string;
  method?: string | null;
  path?: string | null;
  code?: string | null;
  message: string;
  userId?: string | null;
  statusCode?: number | null;
}) {
  await prisma.systemIncident.create({
    data: {
      level: params.level ?? "ERROR",
      source: params.source ?? "backend",
      method: params.method ?? null,
      path: params.path ?? null,
      code: params.code ?? null,
      message: params.message.slice(0, 2000),
      userId: params.userId ?? null,
      statusCode: params.statusCode ?? null,
    },
  }).catch(() => undefined);
}
