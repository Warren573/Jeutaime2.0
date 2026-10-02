-- Temporary administration account for staging/testing.
-- This account is deliberately excluded from discovery and social use.
-- Password is stored only as a bcrypt hash; rotate it when a real domain/mailbox is available.

INSERT INTO "User" (
  "id", "email", "passwordHash", "role", "isVerified", "isBanned",
  "premiumTier", "createdAt", "updatedAt"
)
VALUES (
  'admin-jeutaime-temp',
  'admin@jeutaime.test',
  '$2b$12$2bgdvmF7SpEejA8wxQZaIOkfkVU/jbSNWkoQ1sycSHmkofs5P/Eoq',
  'ADMIN',
  true,
  false,
  'FREE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE
SET
  "role" = 'ADMIN',
  "passwordHash" = EXCLUDED."passwordHash",
  "isVerified" = true,
  "isBanned" = false,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Profile" (
  "id", "userId", "pseudo", "birthDate", "gender", "interestedIn",
  "city", "interests", "lookingFor", "identityTags", "qualities",
  "defaults", "idealDay", "createdAt", "updatedAt"
)
SELECT
  'profile-admin-jeutaime-temp',
  u."id",
  'Administration',
  TIMESTAMP '1990-01-01 00:00:00',
  'AUTRE',
  ARRAY[]::"Gender"[],
  'Administration',
  ARRAY[]::TEXT[],
  ARRAY[]::"LookingFor"[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'admin@jeutaime.test'
  AND NOT EXISTS (
    SELECT 1 FROM "Profile" p WHERE p."userId" = u."id"
  );

INSERT INTO "UserSettings" (
  "userId", "notifEmail", "notifPush", "soundEnabled", "vibrationEnabled",
  "vacationMode", "language", "showInDiscovery", "locationShared",
  "showPhotoByDefault"
)
SELECT
  u."id", false, false, false, false, false, 'fr', false, false, false
FROM "User" u
WHERE u."email" = 'admin@jeutaime.test'
ON CONFLICT ("userId") DO UPDATE
SET
  "showInDiscovery" = false,
  "notifEmail" = false,
  "notifPush" = false,
  "soundEnabled" = false,
  "vibrationEnabled" = false,
  "locationShared" = false,
  "showPhotoByDefault" = false;

INSERT INTO "Wallet" ("userId", "coins", "updatedAt")
SELECT u."id", 0, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'admin@jeutaime.test'
ON CONFLICT ("userId") DO NOTHING;
