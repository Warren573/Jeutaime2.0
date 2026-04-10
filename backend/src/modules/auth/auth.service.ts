import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { hashPassword, comparePassword, hashToken } from "../../core/utils/hash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../core/utils/jwt";
import { ConflictError, UnauthorizedError, NotFoundError } from "../../core/errors";
import { REFRESH_TOKEN_TTL_S } from "../../config/constants";
import { RegisterDto, LoginDto } from "./auth.schemas";
import { Gender } from "@prisma/client";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
function buildTokenPair(userId: string, role: string, isPremium: boolean) {
  const tokenId = crypto.randomUUID();
  const access = signAccessToken({ userId, role: role as never, isPremium });
  const refresh = signRefreshToken({ userId, tokenId });
  return { access, refresh, tokenId };
}

async function persistRefreshToken(userId: string, tokenId: string, rawToken: string) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_S * 1000);
  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });
}

// -----------------------------------------------------------------------
// Register
// -----------------------------------------------------------------------
export async function register(dto: RegisterDto) {
  // Unicité email
  const existingEmail = await prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
  if (existingEmail) throw new ConflictError("Cet email est déjà utilisé");

  // Unicité pseudo
  const existingPseudo = await prisma.profile.findUnique({ where: { pseudo: dto.pseudo }, select: { id: true } });
  if (existingPseudo) throw new ConflictError("Ce pseudo est déjà pris");

  const passwordHash = await hashPassword(dto.password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { email: dto.email, passwordHash },
    });

    await tx.profile.create({
      data: {
        userId: newUser.id,
        pseudo: dto.pseudo,
        birthDate: new Date(dto.birthDate),
        gender: dto.gender as Gender,
        city: dto.city,
        interestedIn: [],
        lookingFor: [],
        interests: [],
      },
    });

    await tx.wallet.create({
      data: { userId: newUser.id, coins: 100 }, // bonus bienvenue
    });

    await tx.userSettings.create({
      data: { userId: newUser.id },
    });

    return newUser;
  });

  const { access, refresh, tokenId } = buildTokenPair(user.id, user.role, false);
  await persistRefreshToken(user.id, tokenId, refresh);

  return { accessToken: access, refreshToken: refresh };
}

// -----------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------
export async function login(dto: LoginDto) {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
    select: {
      id: true, passwordHash: true, role: true, isBanned: true,
      premiumTier: true, premiumUntil: true, banReason: true,
    },
  });

  if (!user) throw new UnauthorizedError("Email ou mot de passe incorrect");
  if (user.isBanned) throw new UnauthorizedError(`Compte suspendu${user.banReason ? " : " + user.banReason : ""}`);

  const valid = await comparePassword(dto.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Email ou mot de passe incorrect");

  const isPremium =
    user.premiumTier === "PREMIUM" &&
    (user.premiumUntil === null || user.premiumUntil > new Date());

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const { access, refresh, tokenId } = buildTokenPair(user.id, user.role, isPremium);
  await persistRefreshToken(user.id, tokenId, refresh);

  return { accessToken: access, refreshToken: refresh };
}

// -----------------------------------------------------------------------
// Refresh
// -----------------------------------------------------------------------
export async function refresh(rawToken: string) {
  const payload = verifyRefreshToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { id: payload.tokenId },
    include: {
      user: {
        select: { id: true, role: true, isBanned: true, premiumTier: true, premiumUntil: true },
      },
    },
  });

  if (!stored || stored.revokedAt || stored.tokenHash !== hashToken(rawToken)) {
    throw new UnauthorizedError("Refresh token invalide");
  }
  if (stored.expiresAt < new Date()) throw new UnauthorizedError("Refresh token expiré");
  if (stored.user.isBanned) throw new UnauthorizedError("Compte suspendu");

  // Rotation : révoquer l'ancien, émettre un nouveau
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const isPremium =
    stored.user.premiumTier === "PREMIUM" &&
    (stored.user.premiumUntil === null || stored.user.premiumUntil > new Date());

  const { access, refresh: newRefresh, tokenId } = buildTokenPair(stored.user.id, stored.user.role, isPremium);
  await persistRefreshToken(stored.user.id, tokenId, newRefresh);

  return { accessToken: access, refreshToken: newRefresh };
}

// -----------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------
export async function logout(userId: string, rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { userId, tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// -----------------------------------------------------------------------
// Me (profil courant complet)
// -----------------------------------------------------------------------
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      premiumTier: true,
      premiumUntil: true,
      lastLoginAt: true,
      createdAt: true,
      profile: {
        include: { questions: true },
      },
      wallet: { select: { coins: true, lastDailyBonus: true } },
      settings: true,
    },
  });

  if (!user) throw new NotFoundError("Utilisateur");
  return user;
}
