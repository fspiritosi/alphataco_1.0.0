#!/usr/bin/env bash
# npm run test:purchases — integracion de Compras (proveedores y solicitudes de compra) contra
# el Postgres del compose: CHECK de la base, el `FOR UPDATE` de las transiciones (dos
# aprobaciones simultaneas), la numeracion con advisory lock y el perimetro de empresa.
#
# Usa la base de trabajo `alphataco`, igual que el resto de los *.integration.test.ts. La suite
# crea y borra sus propias empresas de prueba.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.docker ]; then
  echo "Falta .env.docker (copiar de .env.docker.example y completar valores)." >&2
  exit 1
fi

set -a
source .env.docker
set +a

COMPOSE=(docker compose --env-file .env.docker)

echo "==> Levantando postgres..."
"${COMPOSE[@]}" up -d --wait postgres

export DATABASE_URL="postgresql://alphataco:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}/alphataco"
export DIRECT_URL="${DATABASE_URL}"

echo "==> Aplicando migraciones pendientes..."
npx prisma migrate deploy

echo "==> Corriendo los tests de integracion de Compras..."
npx vitest run \
  src/features/Purchases/actions/suppliers.integration.test.ts \
  src/features/Purchases/actions/requests.integration.test.ts \
  src/features/Purchases/actions/orders.integration.test.ts \
  src/features/Purchases/actions/quotes.integration.test.ts \
  src/features/Purchases/actions/receipts.integration.test.ts \
  src/features/Purchases/actions/invoices.integration.test.ts \
  src/features/Purchases/actions/payments.integration.test.ts
