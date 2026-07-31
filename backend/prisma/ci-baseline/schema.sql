-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('HOMME', 'FEMME', 'AUTRE');

-- CreateEnum
CREATE TYPE "LookingFor" AS ENUM ('AMITIE', 'RELATION', 'FLIRT', 'DISCUSSION', 'SERIEUX');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACTIVE', 'BROKEN', 'BLOCKED', 'GHOSTED');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('SENT', 'READ');

-- CreateEnum
CREATE TYPE "CoinTxnType" AS ENUM ('DAILY_BONUS', 'GAME_WIN', 'GAME_ENTRY', 'LETTER_SENT', 'OFFERING_SENT', 'POWER_USED', 'PET_ADOPTION', 'PET_CARE', 'PREMIUM_PURCHASE', 'STORY_PARTICIPATION', 'STORY_COMPLETION', 'REFUND', 'ADMIN_ADJUST', 'PURCHASE_COINS', 'REFUGE_PARTIAL_REWARD', 'REFUGE_PERFECT_REWARD', 'REFUGE_PARTICIPATION_REWARD', 'REFUGE_INACTIVITY_PENALTY', 'WEEKLY_PROFILE_VOTE');

-- CreateEnum
CREATE TYPE "CardGameStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferingCategory" AS ENUM ('BOISSON', 'NOURRITURE', 'SYMBOLIQUE', 'HUMOUR');

-- CreateEnum
CREATE TYPE "MagieType" AS ENUM ('TRANSFORMATION', 'VISUAL_EFFECT', 'WEATHER');

-- CreateEnum
CREATE TYPE "ConsumptionMode" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "SalonKind" AS ENUM ('PISCINE', 'CAFE_DE_PARIS', 'ILE_PIRATES', 'THEATRE', 'BAR_COCKTAILS', 'METAL', 'PSY');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('HARASSMENT', 'SPAM', 'FAKE', 'INAPPROPRIATE_CONTENT', 'MINOR', 'OTHER');

-- CreateEnum
CREATE TYPE "PremiumTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LETTER_RECEIVED', 'MATCH_CREATED', 'OFFERING_RECEIVED', 'MAGIE_RECEIVED', 'MAGIE_BROKEN', 'PREMIUM_SUBSCRIBED', 'PREMIUM_CANCELLED');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('SMILE', 'GRIMACE');

-- CreateEnum
CREATE TYPE "BottleStatus" AS ENUM ('FLOATING', 'ACCEPTED', 'REVEALED', 'BROKEN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BottleReceiptStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'TAKEN');

-- CreateEnum
CREATE TYPE "BottleRevealStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "SalonSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SalonSessionParticipantStatus" AS ENUM ('ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "RefugeAnimalType" AS ENUM ('HAMSTER', 'LAPIN', 'CHAT', 'CHIEN', 'RENARD', 'PINGOUIN', 'IGUANE', 'PANDA', 'LICORNE', 'DRAGON');

-- CreateEnum
CREATE TYPE "RefugeAnimalCategory" AS ENUM ('SIMPLE', 'RARE', 'EXOTIQUE');

-- CreateEnum
CREATE TYPE "RefugeAnimalSexe" AS ENUM ('MALE', 'FEMELLE', 'NEUTRE');

-- CreateEnum
CREATE TYPE "RefugeAcceptedSexe" AS ENUM ('HOMME', 'FEMME', 'HOMME_FEMME');

-- CreateEnum
CREATE TYPE "RefugeAction" AS ENUM ('NOURRIR', 'JOUER', 'CARESSER', 'LAVER');

-- CreateEnum
CREATE TYPE "RefugeSessionStatus" AS ENUM ('CREATION', 'WAITING_FOR_ADOPTANT', 'ACTIVE', 'AWAITING_REVEAL_CONSENT', 'REVEALED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "RefugeRevealDecision" AS ENUM ('ACCEPT', 'REFUSE');

-- CreateEnum
CREATE TYPE "RefugeDayStatus" AS ENUM ('FAILED', 'PARTIAL', 'PERFECT', 'INCOMPLETE_ADOPTE_MISSING', 'INCOMPLETE_ADOPTANT_MISSING', 'NOT_PLAYED');

-- CreateEnum
CREATE TYPE "RefugePreexistingLinkType" AS ENUM ('MATCH', 'LETTER', 'SALON', 'PRIVATE_MESSAGE');

-- CreateEnum
CREATE TYPE "RefugeBackground" AS ENUM ('FORET', 'PLAGE', 'NEIGE', 'AUTOMNE', 'MONTAGNE', 'NUIT_ETOILEE');

-- CreateTable
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

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "ProfileQuestion" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT,
    "answer" TEXT NOT NULL,
    "wrongAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ProfileQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "notifEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifPush" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "showInDiscovery" BOOLEAN NOT NULL DEFAULT true,
    "locationShared" BOOLEAN NOT NULL DEFAULT false,
    "showPhotoByDefault" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "blurredPath" TEXT NOT NULL,
    "blurMediumPath" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "Wallet" (
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lastDailyBonus" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
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

-- CreateTable
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
    "consumptionMode" "ConsumptionMode" NOT NULL DEFAULT 'SHARED',

    CONSTRAINT "OfferingCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferingSent" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "salonId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumptionCount" INTEGER NOT NULL DEFAULT 0,
    "lastConsumedAt" TIMESTAMP(3),
    "lastConsumedBy" TEXT,

    CONSTRAINT "OfferingSent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "SalonSession" (
    "id" TEXT NOT NULL,
    "salonKind" "SalonKind" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "SalonSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,

    CONSTRAINT "SalonSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonSessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SalonSessionParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "SalonSessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonEncounter" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "metAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL,
    "kind" "SalonKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "magicAction" TEXT,
    "gradient" JSONB,
    "backgroundImage" TEXT,
    "backgroundType" TEXT NOT NULL DEFAULT 'gradient',
    "backgroundConfig" JSONB,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "textColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonMessage" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageInABottle" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "senderCity" TEXT NOT NULL,
    "targetGender" TEXT NOT NULL,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "status" "BottleStatus" NOT NULL DEFAULT 'FLOATING',
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastReadBySenderId" TIMESTAMP(3),
    "lastReadByAcceptorId" TIMESTAMP(3),
    "revealedAt" TIMESTAMP(3),
    "matchId" TEXT,

    CONSTRAINT "MessageInABottle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BottleReceipt" (
    "id" TEXT NOT NULL,
    "bottleId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "BottleReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionAt" TIMESTAMP(3),

    CONSTRAINT "BottleReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousMessage" (
    "id" TEXT NOT NULL,
    "bottleId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BottleRevealRequest" (
    "id" TEXT NOT NULL,
    "bottleId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "status" "BottleRevealStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "BottleRevealRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BottleSuspension" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BottleSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PetCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchQuestionAttempt" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "submittedAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchQuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardGameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CardGameStatus" NOT NULL DEFAULT 'ACTIVE',
    "deck" JSONB NOT NULL,
    "revealed" INTEGER NOT NULL DEFAULT 0,
    "gainsCurrent" INTEGER NOT NULL DEFAULT 0,
    "entryAmount" INTEGER NOT NULL DEFAULT 20,
    "claimedAmount" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardGameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefugeSession" (
    "id" TEXT NOT NULL,
    "adopteId" TEXT NOT NULL,
    "adoptantId" TEXT,
    "animalType" "RefugeAnimalType" NOT NULL,
    "animalCategory" "RefugeAnimalCategory" NOT NULL,
    "animalSexe" "RefugeAnimalSexe" NOT NULL,
    "animalAgeMonths" INTEGER NOT NULL,
    "acceptedSexe" "RefugeAcceptedSexe" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "RefugeSessionStatus" NOT NULL DEFAULT 'CREATION',
    "lastAdopteActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAdoptantActivityAt" TIMESTAMP(3),
    "inactivityAlertSentAt" TIMESTAMP(3),
    "finalAlertSentAt" TIMESTAMP(3),
    "preexistingLinkType" "RefugePreexistingLinkType",
    "background" "RefugeBackground" NOT NULL DEFAULT 'FORET',
    "adopteRevealDecision" "RefugeRevealDecision",
    "adoptantRevealDecision" "RefugeRevealDecision",
    "revealedAt" TIMESTAMP(3),

    CONSTRAINT "RefugeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefugeDailyChoice" (
    "id" TEXT NOT NULL,
    "refugeSessionId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "action1" "RefugeAction" NOT NULL,
    "action2" "RefugeAction" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefugeDailyChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefugeGuess" (
    "id" TEXT NOT NULL,
    "refugeSessionId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "guessedAction1" "RefugeAction" NOT NULL,
    "guessedAction2" "RefugeAction" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefugeGuess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefugeDayResult" (
    "id" TEXT NOT NULL,
    "refugeSessionId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "status" "RefugeDayStatus" NOT NULL,
    "matchCount" INTEGER,
    "adopteCoinsDelta" INTEGER NOT NULL,
    "adoptantCoinsDelta" INTEGER NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefugeDayResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyProfileDuel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateAId" TEXT NOT NULL,
    "candidateBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "chosenId" TEXT,
    "weekKey" TEXT,
    "dayKey" TEXT,

    CONSTRAINT "WeeklyProfileDuel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isBanned_idx" ON "User"("isBanned");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_pseudo_key" ON "Profile"("pseudo");

-- CreateIndex
CREATE INDEX "Profile_city_idx" ON "Profile"("city");

-- CreateIndex
CREATE INDEX "Profile_gender_idx" ON "Profile"("gender");

-- CreateIndex
CREATE INDEX "Profile_points_idx" ON "Profile"("points");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileQuestion_profileId_questionId_key" ON "ProfileQuestion"("profileId", "questionId");

-- CreateIndex
CREATE INDEX "Photo_userId_idx" ON "Photo"("userId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_userAId_idx" ON "Match"("userAId");

-- CreateIndex
CREATE INDEX "Match_userBId_idx" ON "Match"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_userAId_userBId_key" ON "Match"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "Letter_matchId_sentAt_idx" ON "Letter"("matchId", "sentAt");

-- CreateIndex
CREATE INDEX "Letter_toUserId_status_idx" ON "Letter"("toUserId", "status");

-- CreateIndex
CREATE INDEX "CoinTransaction_walletId_createdAt_idx" ON "CoinTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "OfferingSent_toUserId_idx" ON "OfferingSent"("toUserId");

-- CreateIndex
CREATE INDEX "OfferingSent_salonId_idx" ON "OfferingSent"("salonId");

-- CreateIndex
CREATE INDEX "MagieCast_toUserId_expiresAt_idx" ON "MagieCast"("toUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "SalonSession_salonKind_status_expiresAt_idx" ON "SalonSession"("salonKind", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "SalonSessionParticipant_userId_status_idx" ON "SalonSessionParticipant"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SalonSessionParticipant_sessionId_userId_key" ON "SalonSessionParticipant"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "SalonEncounter_sessionId_idx" ON "SalonEncounter"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonEncounter_sessionId_user1Id_user2Id_key" ON "SalonEncounter"("sessionId", "user1Id", "user2Id");

-- CreateIndex
CREATE UNIQUE INDEX "Salon_kind_key" ON "Salon"("kind");

-- CreateIndex
CREATE INDEX "Salon_isActive_order_idx" ON "Salon"("isActive", "order");

-- CreateIndex
CREATE INDEX "SalonMessage_salonId_createdAt_idx" ON "SalonMessage"("salonId", "createdAt");

-- CreateIndex
CREATE INDEX "SalonMessage_sessionId_createdAt_idx" ON "SalonMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageInABottle_status_expiresAt_idx" ON "MessageInABottle"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "MessageInABottle_senderId_status_idx" ON "MessageInABottle"("senderId", "status");

-- CreateIndex
CREATE INDEX "BottleReceipt_recipientId_status_idx" ON "BottleReceipt"("recipientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BottleReceipt_bottleId_recipientId_key" ON "BottleReceipt"("bottleId", "recipientId");

-- CreateIndex
CREATE INDEX "AnonymousMessage_bottleId_createdAt_idx" ON "AnonymousMessage"("bottleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousMessage_senderId_idempotencyKey_key" ON "AnonymousMessage"("senderId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "BottleRevealRequest_bottleId_status_idx" ON "BottleRevealRequest"("bottleId", "status");

-- CreateIndex
CREATE INDEX "BottleRevealRequest_respondentId_status_idx" ON "BottleRevealRequest"("respondentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BottleRevealRequest_bottleId_requestedById_key" ON "BottleRevealRequest"("bottleId", "requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "BottleSuspension_userId_key" ON "BottleSuspension"("userId");

-- CreateIndex
CREATE INDEX "BottleSuspension_userId_endsAt_idx" ON "BottleSuspension"("userId", "endsAt");

-- CreateIndex
CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_targetId_idx" ON "Report"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_fromId_toId_key" ON "Block"("fromId", "toId");

-- CreateIndex
CREATE INDEX "Reaction_toId_idx" ON "Reaction"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_fromId_toId_key" ON "Reaction"("fromId", "toId");

-- CreateIndex
CREATE INDEX "MatchQuestionAttempt_matchId_idx" ON "MatchQuestionAttempt"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchQuestionAttempt_matchId_responderId_questionId_key" ON "MatchQuestionAttempt"("matchId", "responderId", "questionId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "CardGameSession_userId_status_idx" ON "CardGameSession"("userId", "status");

-- CreateIndex
CREATE INDEX "CardGameSession_status_expiresAt_idx" ON "CardGameSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "RefugeSession_status_endsAt_idx" ON "RefugeSession"("status", "endsAt");

-- CreateIndex
CREATE INDEX "RefugeSession_adopteId_idx" ON "RefugeSession"("adopteId");

-- CreateIndex
CREATE INDEX "RefugeSession_adoptantId_idx" ON "RefugeSession"("adoptantId");

-- CreateIndex
CREATE INDEX "RefugeSession_status_createdAt_idx" ON "RefugeSession"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefugeSession_adopteId_adoptantId_key" ON "RefugeSession"("adopteId", "adoptantId");

-- CreateIndex
CREATE INDEX "RefugeDailyChoice_refugeSessionId_dayNumber_idx" ON "RefugeDailyChoice"("refugeSessionId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RefugeDailyChoice_refugeSessionId_dayNumber_key" ON "RefugeDailyChoice"("refugeSessionId", "dayNumber");

-- CreateIndex
CREATE INDEX "RefugeGuess_refugeSessionId_dayNumber_idx" ON "RefugeGuess"("refugeSessionId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RefugeGuess_refugeSessionId_dayNumber_key" ON "RefugeGuess"("refugeSessionId", "dayNumber");

-- CreateIndex
CREATE INDEX "RefugeDayResult_refugeSessionId_idx" ON "RefugeDayResult"("refugeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RefugeDayResult_refugeSessionId_dayNumber_key" ON "RefugeDayResult"("refugeSessionId", "dayNumber");

-- CreateIndex
CREATE INDEX "WeeklyProfileDuel_userId_usedAt_idx" ON "WeeklyProfileDuel"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "WeeklyProfileDuel_userId_dayKey_idx" ON "WeeklyProfileDuel"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "WeeklyProfileDuel_weekKey_chosenId_idx" ON "WeeklyProfileDuel"("weekKey", "chosenId");

-- CreateIndex
CREATE INDEX "WeeklyProfileDuel_candidateAId_idx" ON "WeeklyProfileDuel"("candidateAId");

-- CreateIndex
CREATE INDEX "WeeklyProfileDuel_candidateBId_idx" ON "WeeklyProfileDuel"("candidateBId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileQuestion" ADD CONSTRAINT "ProfileQuestion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingSent" ADD CONSTRAINT "OfferingSent_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "OfferingCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingSent" ADD CONSTRAINT "OfferingSent_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingSent" ADD CONSTRAINT "OfferingSent_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingSent" ADD CONSTRAINT "OfferingSent_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagieCast" ADD CONSTRAINT "MagieCast_magieId_fkey" FOREIGN KEY ("magieId") REFERENCES "MagieCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagieCast" ADD CONSTRAINT "MagieCast_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagieCast" ADD CONSTRAINT "MagieCast_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagieCast" ADD CONSTRAINT "MagieCast_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonSession" ADD CONSTRAINT "SalonSession_salonKind_fkey" FOREIGN KEY ("salonKind") REFERENCES "Salon"("kind") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonSessionParticipant" ADD CONSTRAINT "SalonSessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SalonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonSessionParticipant" ADD CONSTRAINT "SalonSessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonEncounter" ADD CONSTRAINT "SalonEncounter_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SalonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonEncounter" ADD CONSTRAINT "SalonEncounter_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonEncounter" ADD CONSTRAINT "SalonEncounter_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonMessage" ADD CONSTRAINT "SalonMessage_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonMessage" ADD CONSTRAINT "SalonMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SalonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonMessage" ADD CONSTRAINT "SalonMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInABottle" ADD CONSTRAINT "MessageInABottle_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInABottle" ADD CONSTRAINT "MessageInABottle_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInABottle" ADD CONSTRAINT "MessageInABottle_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleReceipt" ADD CONSTRAINT "BottleReceipt_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "MessageInABottle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleReceipt" ADD CONSTRAINT "BottleReceipt_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousMessage" ADD CONSTRAINT "AnonymousMessage_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "MessageInABottle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousMessage" ADD CONSTRAINT "AnonymousMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleRevealRequest" ADD CONSTRAINT "BottleRevealRequest_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "MessageInABottle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleRevealRequest" ADD CONSTRAINT "BottleRevealRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleRevealRequest" ADD CONSTRAINT "BottleRevealRequest_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleSuspension" ADD CONSTRAINT "BottleSuspension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "PetCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionAttempt" ADD CONSTRAINT "MatchQuestionAttempt_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionAttempt" ADD CONSTRAINT "MatchQuestionAttempt_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardGameSession" ADD CONSTRAINT "CardGameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeSession" ADD CONSTRAINT "RefugeSession_adopteId_fkey" FOREIGN KEY ("adopteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeSession" ADD CONSTRAINT "RefugeSession_adoptantId_fkey" FOREIGN KEY ("adoptantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeDailyChoice" ADD CONSTRAINT "RefugeDailyChoice_refugeSessionId_fkey" FOREIGN KEY ("refugeSessionId") REFERENCES "RefugeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeGuess" ADD CONSTRAINT "RefugeGuess_refugeSessionId_fkey" FOREIGN KEY ("refugeSessionId") REFERENCES "RefugeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeDayResult" ADD CONSTRAINT "RefugeDayResult_refugeSessionId_fkey" FOREIGN KEY ("refugeSessionId") REFERENCES "RefugeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyProfileDuel" ADD CONSTRAINT "WeeklyProfileDuel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

