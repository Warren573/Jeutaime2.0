-- Une offrande personnelle est unique seulement pendant sa durée de validité.
-- L'ancienne contrainte interdisait à vie une nouvelle offrande identique,
-- même après expiration. L'unicité active est vérifiée sous verrou du
-- destinataire dans la transaction d'envoi.
DROP INDEX IF EXISTS "OfferingSent_unique_desk_per_recipient";
