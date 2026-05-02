#!/bin/bash
# deploy.sh — Script de démarrage Render
#
# Problème connu : db push a synchronisé le schéma mais _prisma_migrations
# contient la migration initiale en état "failed" et les suivantes sont absentes.
# migrate deploy échoue alors avec P3009.
#
# Solution : marquer toutes les migrations comme applied avant migrate deploy.
# L'ordre est : --rolled-back (annule l'état failed si présent) puis --applied.
# Les migrations déjà en état "applied" ignorent silencieusement ces commandes.

set -e

echo "=== [deploy] Résolution état migrations Prisma ==="

MIGRATIONS=(
  "20260410000000_phase5_salon_cms"
  "20260411000000_phase10_notifications"
  "20260422000000_add_profile_v1_fields"
  "20260426000000_add_reactions"
  "20260427000000_add_question_attempts"
  "20260427000100_add_blur_medium_path"
  "20260429000000_add_card_game"
  "20260430000000_add_push_tokens"
)

for m in "${MIGRATIONS[@]}"; do
  echo "  → resolve $m"
  npx prisma migrate resolve --rolled-back "$m" 2>/dev/null || true
  npx prisma migrate resolve --applied   "$m" 2>/dev/null || true
done

echo "=== [deploy] prisma migrate deploy ==="
npx prisma migrate deploy

echo "=== [deploy] Démarrage serveur ==="
exec node dist/server.js
