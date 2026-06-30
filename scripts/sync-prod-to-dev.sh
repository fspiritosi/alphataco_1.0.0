#!/usr/bin/env bash
#
# sync-prod-to-dev.sh  —  Clona los DATOS de PRODUCCIÓN hacia la base de DEV (Supabase / Postgres).
#
# NO requiere instalar nada: usa pg_dump/psql dentro de un contenedor Docker (postgres:15).
# Muestra PROGRESO tabla por tabla ([i/N] nombre — filas ✓).
#
#   - Lee PROD (solo lectura, NO la modifica).
#   - REEMPLAZA por completo los datos del schema `public` de DEV con los de PROD.
#   - Trae auth.users/identities de PROD con UPSERT (no borra tus logins de dev).
#   - NO copia los archivos físicos del Storage (previews darán 404 en dev).
#
# Conexiones: se leen del .env (DEV = línea activa DIRECT_URL; PROD = línea comentada vvrckjjyrwqzpbaatemz).
# Uso (con Docker Desktop corriendo):  bash scripts/sync-prod-to-dev.sh

set -euo pipefail
PG_IMAGE="postgres:15"

# ── Conexiones ───────────────────────────────────────────────────────────────
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env"
[[ -f "$ENV_FILE" ]] || { echo "ERROR: no encuentro $ENV_FILE" >&2; exit 1; }
DEV_DIRECT_URL="${DEV_DIRECT_URL:-$(grep -E '^DIRECT_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)}"
PROD_DIRECT_URL="${PROD_DIRECT_URL:-$(grep -E '^# *DIRECT_URL=.*vvrckjjyrwqzpbaatemz' "$ENV_FILE" | head -1 | sed -E 's/^# *DIRECT_URL=[[:space:]]*//')}"
DEV_DIRECT_URL="$(echo "$DEV_DIRECT_URL"  | tr -d '\r' | xargs)"
PROD_DIRECT_URL="$(echo "$PROD_DIRECT_URL" | tr -d '\r' | xargs)"
[[ -n "$DEV_DIRECT_URL"  ]] || { echo "ERROR: no pude leer DIRECT_URL (dev) del .env" >&2; exit 1; }
[[ -n "$PROD_DIRECT_URL" ]] || { echo "ERROR: no encontré la URL de prod (vvrckjjyrwqzpbaatemz) en el .env" >&2; exit 1; }

# ── Guardas ──────────────────────────────────────────────────────────────────
docker info >/dev/null 2>&1 || { echo "ERROR: Docker no está corriendo (iniciá Docker Desktop)." >&2; exit 1; }
[[ "${PROD_DIRECT_URL#*@}" != "${DEV_DIRECT_URL#*@}" ]] || { echo "ERROR: PROD y DEV son la misma BD." >&2; exit 1; }
if [[ "$DEV_DIRECT_URL" != *"pdrylqbztmpgawsfdsbr"* ]]; then
  echo "ADVERTENCIA: el destino (dev) no contiene el ref esperado (pdrylqbztmpgawsfdsbr)." >&2
  read -r -p "  ¿Continuar igual? (escribir 'si'): " ok; [[ "$ok" == "si" ]] || exit 1
fi
echo "==> Origen (PROD, solo lectura):  ...${PROD_DIRECT_URL#*@}"
echo "==> Destino (DEV, se REEMPLAZA):  ...${DEV_DIRECT_URL#*@}"
read -r -p "    Confirmar el clon (escribir 'CLONAR'): " confirm
[[ "$confirm" == "CLONAR" ]] || { echo "Cancelado."; exit 1; }

# Helpers: pg_dump / psql vía contenedor efímero.
# Se filtran los `setval(...)` de secuencias: algunas existen en prod pero no en dev (drift de
# esquema, ej. citys_id_seq) y abortarían la carga de esa tabla. Las secuencias no se reajustan
# (no afecta el clon de datos para testing).
dump() { docker run --rm "$PG_IMAGE" pg_dump "$@" | grep -v 'pg_catalog.setval'; }
psqlc() { docker run --rm -i "$PG_IMAGE" psql "$1" -v ON_ERROR_STOP=1 "${@:2}"; }

# ── 1) auth.users/identities (sin borrar tus logins de dev) ───────────────────
# Se carga con session_replication_role=replica (FK desactivadas durante la carga): así las
# identities cuyo usuario de prod choque por email con uno de dev (y por eso se saltee con
# ON CONFLICT DO NOTHING) no rompen la FK. Conservás tus usuarios de dev; se suman los de prod.
echo "==> auth.users/identities → DEV (upsert, conserva tus logins de dev)…"
{
  echo "SET session_replication_role = replica;"
  dump "$PROD_DIRECT_URL" --data-only --no-owner --no-privileges \
       --table=auth.users --table=auth.identities --inserts --on-conflict-do-nothing
  echo "SET session_replication_role = origin;"
} | psqlc "$DEV_DIRECT_URL" --single-transaction -q >/dev/null

# ── 2) public: lista de tablas (con conteo aprox) ────────────────────────────
echo "==> Leyendo lista de tablas de 'public' en PROD…"
mapfile -t ROWS < <(psqlc "$PROD_DIRECT_URL" -tAF'|' -c \
  "SELECT c.relname, COALESCE(s.n_live_tup,0)
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
    WHERE n.nspname='public' AND c.relkind='r'
    ORDER BY c.relname")
N=${#ROWS[@]}
echo "    $N tablas a clonar."

# ── 3) Vaciar 'public' en DEV (triggers/FK off) ──────────────────────────────
echo "==> Vaciando 'public' en DEV…"
psqlc "$DEV_DIRECT_URL" --single-transaction -q >/dev/null <<'SQL'
SET session_replication_role = replica;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename); END LOOP;
END $$;
SQL

# ── 4) Copiar tabla por tabla, con progreso ──────────────────────────────────
i=0; fail=0
for row in "${ROWS[@]}"; do
  i=$((i+1))
  t="${row%%|*}"; approx="${row##*|}"
  pct=$(( i * 100 / N ))
  printf "  [%3d%%] %2d/%d  %-42s (~%s filas) … " "$pct" "$i" "$N" "$t" "$approx"
  if { echo "SET session_replication_role = replica;"; \
       dump "$PROD_DIRECT_URL" --data-only --no-owner --no-privileges --table="public.\"$t\""; } \
     | psqlc "$DEV_DIRECT_URL" --single-transaction -q >/dev/null 2>&1; then
    echo "✓"
  else
    echo "✗ (revisar)"; fail=$((fail+1))
  fi
done

echo ""
if [[ "$fail" -eq 0 ]]; then
  echo "==> ✅ Listo. DEV replica los datos de PROD (public + auth.users). $N/$N tablas."
else
  echo "==> ⚠️ Terminó con $fail tabla(s) con error. Revisá las marcadas con ✗."
fi
echo "    Nota: los archivos del Storage NO se copiaron (previews darán 404 en dev)."
