#!/bin/bash
# deploy.sh — Script de démarrage Render
#
# Utilise prisma db push pour synchroniser le schéma avec la DB.
# Idempotent : si le schéma est déjà à jour, aucune modification n'est faite.
# Ajoute les colonnes/tables manquantes sans toucher aux données existantes.
#
# Pourquoi db push plutôt que migrate deploy :
# Les migrations ont été marquées "applied" via migrate resolve sans que
# leur SQL ait été exécuté sur la DB. db push compare le schéma réel et
# synchronise proprement.

set -e

echo "=== [deploy] Synchronisation schéma (prisma db push) ==="
npx prisma db push

echo "=== [deploy] Démarrage serveur ==="
exec node dist/server.js
