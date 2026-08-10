-- Une même offrande de Bureau ne peut être possédée qu'une seule fois par destinataire.
CREATE UNIQUE INDEX IF NOT EXISTS "OfferingSent_unique_desk_per_recipient"
ON "OfferingSent" ("toUserId", "offeringId")
WHERE "offeringId" LIKE 'desk_%';

-- Proposition mise en avant pendant 36 heures pour chaque Bureau.
CREATE TABLE IF NOT EXISTS "PersonalOfferingSpotlight" (
  "toUserId" TEXT PRIMARY KEY,
  "offeringId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "PersonalOfferingSpotlight_expiresAt_idx"
ON "PersonalOfferingSpotlight" ("expiresAt");
