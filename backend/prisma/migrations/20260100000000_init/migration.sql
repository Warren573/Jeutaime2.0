-- Init migration: Create all base tables and enums
-- This must run before all other migrations

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');
CREATE TYPE "Gender" AS ENUM ('HOMME', 'FEMME', 'AUTRE');
CREATE TYPE "LookingFor" AS ENUM ('AMITIE', 'RELATION', 'FLIRT', 'DISCUSSION', 'SERIEUX');
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACTIVE', 'BROKEN', 'BLOCKED', 'GHOSTED');
CREATE TYPE "LetterStatus" AS ENUM ('SENT', 'READ');
CREATE TYPE "CoinTxnType" AS ENUM ('DAILY_BONUS', 'GAME_WIN', 'GAME_ENTRY', 'LETTER_SENT', 'OFFERING_SENT', 'POWER_USED', 'PET_ADOPTION', 'PET_CARE', 'PREMIUM_PURCHASE', 'STORY_PARTICIPATION', 'STORY_COMPLETION', 'REFUND', 'ADMIN_ADJUST', 'PURCHASE_COINS');
CREATE TYPE "OfferingCategory" AS ENUM ('BOISSON', 'NOURRITURE', 'SYMBOLIQUE', 'HUMOUR');
CREATE TYPE "MagieType" AS ENUM ('TRANSFORMATION', 'VISUAL_EFFECT', 'WEATHER');
CREATE TYPE "SalonKind" AS ENUM ('PISCINE', 'CAFE_DE_PARIS', 'ILE_PIRATES', 'THEATRE', 'BAR_COCKTAILS', 'METAL');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');
CREATE TYPE "ReportReason" AS ENUM ('HARASSMENT', 'SPAM', 'FAKE', 'INAPPROPRIATE_CONTENT', 'MINOR', 'OTHER');
CREATE TYPE "PremiumTier" AS ENUM ('FREE', 'PREMIUM');
CREATE TYPE "NotificationType" AS ENUM ('LETTER_RECEIVED', 'MATCH_CREATED', 'OFFERING_RECEIVED', 'MAGIE_RECEIVED', 'MAGIE_BROKEN', 'PREMIUM_SUBSCRIBED', 'PREMIUM_CANCELLED');

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "premiumTier" "PremiumTier" NOT NULL DEFAULT 'FREE',
    "premiumUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable Profile
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pseudo" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "interestedIn" "Gender"[],
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "bio" TEXT,
    "physicalDesc" TEXT,
    "job" TEXT,
    "interests" TEXT[],
    "lookingFor" "LookingFor"[],
    "hasChildren" BOOLEAN,
    "wantsChildren" BOOLEAN,
    "avatarConfig" JSONB,
    "height" INTEGER,
    "vibe" TEXT,
    "quote" TEXT,
    "identityTags" TEXT[],
    "qualities" TEXT[],
    "defaults" TEXT[],
    "idealDay" TEXT[],
    "skills" JSONB,
    "points" INTEGER NOT NULL DEFAULT 0,
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable Salon
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL,
    "kind" "SalonKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "magicAction" TEXT,
    "gradient" JSONB,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable SalonMessage
CREATE TABLE "SalonMessage" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable RefreshToken
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable UserSettings
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "notifEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifPush" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "showInDiscovery" BOOLEAN NOT NULL DEFAULT true,
    "locationShared" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable Photo
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "blurredPath" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable Match
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "initiatorId" TEXT NOT NULL,
    "letterCountA" INTEGER NOT NULL DEFAULT 0,
    "letterCountB" INTEGER NOT NULL DEFAULT 0,
    "lastLetterBy" TEXT,
    "lastLetterAt" TIMESTAMP(3),
    "questionsValidated" BOOLEAN NOT NULL DEFAULT false,
    "ghostRelanceUsedBy" TEXT,
    "ghostDetectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable Letter
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "LetterStatus" NOT NULL DEFAULT 'SENT',
    "isGhostRelance" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable Wallet
CREATE TABLE "Wallet" (
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lastDailyBonus" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable CoinTransaction
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "CoinTxnType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable OfferingCatalog
CREATE TABLE "OfferingCatalog" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "category" "OfferingCategory" NOT NULL,
    "durationMs" INTEGER,
    "stackPriority" INTEGER NOT NULL DEFAULT 0,
    "salonOnly" "SalonKind",
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OfferingCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable OfferingSent
CREATE TABLE "OfferingSent" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "salonId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferingSent_pkey" PRIMARY KEY ("id")
);

-- CreateTable MagieCatalog
CREATE TABLE "MagieCatalog" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "type" "MagieType" NOT NULL,
    "breakConditionId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MagieCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable MagieCast
CREATE TABLE "MagieCast" (
    "id" TEXT NOT NULL,
    "magieId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "salonId" TEXT,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "brokenAt" TIMESTAMP(3),
    "brokenBy" TEXT,

    CONSTRAINT "MagieCast_pkey" PRIMARY KEY ("id")
);

-- CreateTable PetCatalog
CREATE TABLE "PetCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PetCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable Pet
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hunger" INTEGER NOT NULL DEFAULT 100,
    "happiness" INTEGER NOT NULL DEFAULT 100,
    "energy" INTEGER NOT NULL DEFAULT 100,
    "cleanliness" INTEGER NOT NULL DEFAULT 100,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isIncarnated" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adoptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable Report
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable Block
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProfileQuestion
CREATE TABLE "ProfileQuestion" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT,
    "answer" TEXT NOT NULL,
    "wrongAnswers" TEXT[] NOT NULL DEFAULT '{}',

    CONSTRAINT "ProfileQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndices
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_isBanned_idx" ON "User"("isBanned");

CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "Profile_pseudo_key" ON "Profile"("pseudo");
CREATE INDEX "Profile_city_idx" ON "Profile"("city");
CREATE INDEX "Profile_gender_idx" ON "Profile"("gender");
CREATE INDEX "Profile_points_idx" ON "Profile"("points");

CREATE UNIQUE INDEX "Salon_kind_key" ON "Salon"("kind");

CREATE INDEX "SalonMessage_salonId_createdAt_idx" ON "SalonMessage"("salonId", "createdAt");

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

CREATE UNIQUE INDEX "Photo_userId_idx" ON "Photo"("userId");

CREATE UNIQUE INDEX "Match_userAId_userBId_key" ON "Match"("userAId", "userBId");
CREATE INDEX "Match_status_idx" ON "Match"("status");
CREATE INDEX "Match_userAId_idx" ON "Match"("userAId");
CREATE INDEX "Match_userBId_idx" ON "Match"("userBId");

CREATE INDEX "Letter_matchId_sentAt_idx" ON "Letter"("matchId", "sentAt");
CREATE INDEX "Letter_toUserId_status_idx" ON "Letter"("toUserId", "status");

CREATE INDEX "CoinTransaction_walletId_createdAt_idx" ON "CoinTransaction"("walletId", "createdAt");

CREATE INDEX "OfferingSent_toUserId_idx" ON "OfferingSent"("toUserId");
CREATE INDEX "OfferingSent_salonId_idx" ON "OfferingSent"("salonId");

CREATE INDEX "MagieCast_toUserId_expiresAt_idx" ON "MagieCast"("toUserId", "expiresAt");

CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");

CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE INDEX "Report_targetId_idx" ON "Report"("targetId");

CREATE UNIQUE INDEX "Block_fromId_toId_key" ON "Block"("fromId", "toId");

CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

CREATE UNIQUE INDEX "ProfileQuestion_profileId_questionId_key" ON "ProfileQuestion"("profileId", "questionId");

-- AddForeignKeys
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "SalonMessage" ADD CONSTRAINT "SalonMessage_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE;
ALTER TABLE "SalonMessage" ADD CONSTRAINT "SalonMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id");
ALTER TABLE "Match" ADD CONSTRAINT "Match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id");
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE;
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id");
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id");
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("userId") ON DELETE CASCADE;
ALTER TABLE "OfferingSent" ADD CONSTRAINT "OfferingSent_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "OfferingCatalog"("id");
ALTER TABLE "OfferingSent" ADD CONSTRAINT "OfferingSent_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id");
ALTER TABLE "OfferingSent" ADD CONSTRAINT "OfferingSent_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id");
ALTER TABLE "OfferingSent" ADD CONSTRAINT "OfferingSent_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id");
ALTER TABLE "MagieCast" ADD CONSTRAINT "MagieCast_magieId_fkey" FOREIGN KEY ("magieId") REFERENCES "MagieCatalog"("id");
ALTER TABLE "MagieCast" ADD CONSTRAINT "MagieCast_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id");
ALTER TABLE "MagieCast" ADD CONSTRAINT "MagieCast_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id");
ALTER TABLE "MagieCast" ADD CONSTRAINT "MagieCast_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id");
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "PetCatalog"("id");
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id");
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id");
ALTER TABLE "Block" ADD CONSTRAINT "Block_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Block" ADD CONSTRAINT "Block_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "ProfileQuestion" ADD CONSTRAINT "ProfileQuestion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE;
