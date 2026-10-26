-- Independent discovery ranking. Not tied to coins, XP or Plus subscriptions.
ALTER TABLE "Profile"
  ADD COLUMN "discoveryActivityScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discoveryBreakPenalty" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Profile_discoveryActivityScore_idx" ON "Profile"("discoveryActivityScore");

-- Count substantive messages; at most one rewarded message per author and
-- conversation every 5 minutes. Prevents short-message and flooding boosts.
CREATE OR REPLACE FUNCTION jeutaime_discovery_engagement() RETURNS trigger AS $$
DECLARE
  actor_id TEXT;
  conversation_id TEXT;
  last_message_at TIMESTAMP(3);
BEGIN
  IF TG_TABLE_NAME = 'Letter' THEN
    IF NEW."isGhostRelance" THEN RETURN NEW; END IF;
    actor_id := NEW."fromUserId";
    conversation_id := NEW."matchId";
    SELECT MAX("sentAt") INTO last_message_at FROM "Letter"
      WHERE "matchId" = conversation_id AND "fromUserId" = actor_id AND "id" <> NEW."id";
  ELSIF TG_TABLE_NAME = 'SalonMessage' THEN
    IF NEW."kind" <> 'message' OR NEW."isHidden" THEN RETURN NEW; END IF;
    actor_id := NEW."userId";
    conversation_id := COALESCE(NEW."sessionId", NEW."salonId");
    SELECT MAX("createdAt") INTO last_message_at FROM "SalonMessage"
      WHERE COALESCE("sessionId", "salonId") = conversation_id
      AND "userId" = actor_id AND "id" <> NEW."id" AND "kind" = 'message';
  ELSIF TG_TABLE_NAME = 'AnonymousMessage' THEN
    actor_id := NEW."senderId";
    conversation_id := NEW."bottleId";
    SELECT MAX("createdAt") INTO last_message_at FROM "AnonymousMessage"
      WHERE "bottleId" = conversation_id AND "senderId" = actor_id AND "id" <> NEW."id";
  ELSE
    RETURN NEW;
  END IF;

  IF length(btrim(NEW."content")) < 15 THEN RETURN NEW; END IF;
  IF last_message_at IS NOT NULL AND last_message_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN
    RETURN NEW;
  END IF;

  UPDATE "Profile" SET "discoveryActivityScore" = "discoveryActivityScore" + 1
    WHERE "userId" = actor_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER jeutaime_rank_letter AFTER INSERT ON "Letter"
  FOR EACH ROW EXECUTE FUNCTION jeutaime_discovery_engagement();
CREATE TRIGGER jeutaime_rank_salon AFTER INSERT ON "SalonMessage"
  FOR EACH ROW EXECUTE FUNCTION jeutaime_discovery_engagement();
CREATE TRIGGER jeutaime_rank_bottle AFTER INSERT ON "AnonymousMessage"
  FOR EACH ROW EXECUTE FUNCTION jeutaime_discovery_engagement();
