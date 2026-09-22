ALTER TABLE "UserSettings"
ADD COLUMN "vibrationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "vacationMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "vacationStartedAt" TIMESTAMP(3);
