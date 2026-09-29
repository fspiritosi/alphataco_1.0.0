#!/bin/sh
# Arranque del contenedor de produccion: migra, siembra si se pide y levanta Next.
set -e

PRISMA="node ./node_modules/prisma/build/index.js"

echo "[entrypoint] prisma migrate deploy..."
$PRISMA migrate deploy

# Solo para instancias nuevas (ver docs/deploy/runbook.md). El seed es idempotente
# (todo upsert, id de empresa derivado del nombre), asi que dejarlo prendido no
# duplica nada; pero con otro SEED_COMPANY_NAME crearia OTRA empresa, por eso se
# apaga despues del primer deploy.
if [ "$RUN_SEED" = "true" ]; then
  SEED_COMPANY_NAME="${SEED_COMPANY_NAME:-AlphaTaco}"
  echo "[entrypoint] RUN_SEED=true -> seed de empresa \"$SEED_COMPANY_NAME\" + catalogo de permisos..."
  node scripts/seed-company.ts --name "$SEED_COMPANY_NAME"
fi

echo "[entrypoint] arrancando Next standalone en ${HOSTNAME:-0.0.0.0}:${PORT:-3000}..."
exec node server.js
