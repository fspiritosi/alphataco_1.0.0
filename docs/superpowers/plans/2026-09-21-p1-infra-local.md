# P1 — Infraestructura local y base Postgres plana — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que alphataco levante completo en Docker sobre Postgres plano (sin Supabase): compose con postgres/minio/app/cron/caddy, schema Prisma sin los schemas `auth`/`storage`, lógica SQL vigente extraída a `prisma/sql/` con inventario, baseline de migraciones nuevo `0_init`, seed de empresa y pgTAP funcionando.

**Architecture:** La app sigue usando Supabase Auth/Storage en runtime durante P1–P3 (contra el proyecto cloud), pero la **base de datos** ya puede ser el Postgres del compose: por eso el baseline debe crear todo lo que el código necesita (tablas `public`, funciones, triggers, vistas) sin depender de `auth.*`/`storage.*`. Las 4 tablas con FK a `auth.users` pierden la FK (conservan la columna uuid); P4 la reapunta a la tabla `user` de Better Auth. Las 21 tablas de negocio sin `company_id` lo incorporan ahora (BD vacía, sin backfill).

**Tech Stack:** Docker Compose, `postgres:16` (+ `pgtap`), `minio/minio`, `caddy:2`, Next.js 16 `output: 'standalone'`, Prisma 7 (`migrate diff`, `migrate deploy`), Node 24 (ejecuta `.ts` con type stripping nativo), Vitest, pgTAP/`pg_prove`.

**Spec:** `docs/superpowers/specs/2026-09-21-salida-de-supabase-design.md` (secciones 2, 6, 7, 8-P1, 9).

## Global Constraints

- Reglas del repo: commits sólo línea de asunto sin Co-Authored-By; sin `prettier`/`eslint`; sin `any`; `git add` con rutas explícitas; `npm run check-types` y `npm test` verdes al cerrar cada task.
- `npm run build` sigue ejecutando `prisma migrate deploy`: NO ejecutarlo contra ninguna BD que no sea la del compose local.
- Ninguna migración se aplica a BD de Supabase (dev/prod de GH). Todo P1 se prueba contra `docker compose` local.
- Nombres: variables de entorno del compose en `.env.docker.example`; nada de secretos reales en el repo.
- No tocar código de `src/features` salvo lo estrictamente necesario para que `check-types` pase tras quitar los modelos `auth`/`storage` (Task 3); la migración a Prisma es P2.

---

### Task 1: Compose, Dockerfile, Caddy y cron

**Files:**
- Create: `docker-compose.yml`, `Dockerfile`, `.dockerignore`, `docker/caddy/Caddyfile`, `docker/cron/Dockerfile`, `docker/cron/crontab`, `docker/postgres/Dockerfile`, `.env.docker.example`, `scripts/dev-up.sh`
- Modify: `next.config.js` (agregar `output: 'standalone'`), `.gitignore` (agregar `.env.docker`), `docs/desarrollo/entornos.md` (sección "Levantar con Docker")

**Interfaces:**
- Produces: servicios `postgres` (5432), `minio` (9000 API / 9001 consola), `app` (3000), `cron`, `caddy` (80/443); red `alphataco`; volúmenes `pgdata`, `minio-data`, `caddy-data`. Variables: ver `.env.docker.example` abajo. `DATABASE_URL` interna: `postgresql://alphataco:${POSTGRES_PASSWORD}@postgres:5432/alphataco`.

- [ ] **Step 1: `docker/postgres/Dockerfile` (Postgres 16 + pgTAP)**

```dockerfile
FROM postgres:16
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-16-pgtap \
 && rm -rf /var/lib/apt/lists/*
```

- [ ] **Step 2: `docker-compose.yml`**

```yaml
name: alphataco
services:
  postgres:
    build: ./docker/postgres
    environment:
      POSTGRES_DB: alphataco
      POSTGRES_USER: alphataco
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      TZ: America/Argentina/Buenos_Aires
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U alphataco -d alphataco"]
      interval: 5s
      timeout: 3s
      retries: 20
    networks: [alphataco]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
    volumes:
      - minio-data:/data
    ports:
      - "127.0.0.1:${MINIO_PORT:-9000}:9000"
      - "127.0.0.1:${MINIO_CONSOLE_PORT:-9001}:9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 3s
      retries: 20
    networks: [alphataco]

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 ${S3_ACCESS_KEY} ${S3_SECRET_KEY} &&
      for b in document-files daily-reports contract-documents employee-documents clothing-signatures logo; do mc mb -p local/$$b; mc anonymous set none local/$$b; done"
    networks: [alphataco]

  app:
    build:
      context: .
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        NEXT_PUBLIC_PROJECT_URL: ${NEXT_PUBLIC_PROJECT_URL}
        NEXT_PUBLIC_BASE_URL: ${NEXT_PUBLIC_BASE_URL}
        NEXT_PUBLIC_POSTHOG_KEY: ${NEXT_PUBLIC_POSTHOG_KEY}
        NEXT_PUBLIC_POSTHOG_HOST: ${NEXT_PUBLIC_POSTHOG_HOST}
    env_file: .env.docker
    environment:
      DATABASE_URL: postgresql://alphataco:${POSTGRES_PASSWORD}@postgres:5432/alphataco
      DIRECT_URL: postgresql://alphataco:${POSTGRES_PASSWORD}@postgres:5432/alphataco
      S3_ENDPOINT: http://minio:9000
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "127.0.0.1:${APP_PORT:-3000}:3000"
    networks: [alphataco]

  cron:
    build: ./docker/cron
    environment:
      JOBS_TOKEN: ${JOBS_TOKEN}
      APP_URL: http://app:3000
      TZ: America/Argentina/Buenos_Aires
    depends_on: [app]
    networks: [alphataco]

  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    environment:
      APP_DOMAIN: ${APP_DOMAIN:-localhost}
    volumes:
      - ./docker/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
    depends_on: [app]
    networks: [alphataco]

volumes:
  pgdata:
  minio-data:
  caddy-data:

networks:
  alphataco:
```

- [ ] **Step 3: `Dockerfile` (multi-stage, standalone) y `.dockerignore`**

```dockerfile
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --ignore-scripts

FROM node:24-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_PROJECT_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_PROJECT_URL=$NEXT_PUBLIC_PROJECT_URL \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY docker/app-entrypoint.sh ./app-entrypoint.sh
USER nextjs
EXPOSE 3000
ENTRYPOINT ["./app-entrypoint.sh"]
```

`docker/app-entrypoint.sh` (ejecutable): aplica migraciones y arranca.
```sh
#!/bin/sh
set -e
./node_modules/.bin/prisma migrate deploy
exec node server.js
```
Nota: el `build` script de `package.json` (`prisma migrate deploy && next build`) NO se usa en la imagen; el deploy de migraciones pasa al entrypoint. Si `.next/standalone` no incluye algún módulo que Prisma 7 necesita en runtime (`@prisma/adapter-pg`, `pg`), agregarlos a `next.config.js` con `outputFileTracingIncludes` o copiarlos explícitamente; verificar arrancando el contenedor.

`.dockerignore`:
```
node_modules
.next
.git
.superpowers
cypress
docs
supabase
*.md
.env*
!.env.docker.example
```

- [ ] **Step 4: Caddy y cron**

`docker/caddy/Caddyfile`:
```
{$APP_DOMAIN} {
	reverse_proxy app:3000
	encode gzip
}
```
`docker/cron/Dockerfile`:
```dockerfile
FROM alpine:3.20
RUN apk add --no-cache curl tzdata
COPY crontab /etc/crontabs/root
CMD ["crond", "-f", "-l", "2"]
```
`docker/cron/crontab` (los jobs existen recién en P5; hasta entonces devuelven 404 y no pasa nada):
```
# min hora dia mes dow  comando (TZ del contenedor: America/Argentina/Buenos_Aires)
0 8 * * 1   curl -fsS -H "Authorization: Bearer $JOBS_TOKEN" $APP_URL/api/jobs/documents-expiry
0 7 * * *   curl -fsS -H "Authorization: Bearer $JOBS_TOKEN" $APP_URL/api/jobs/daily-report-deviations
30 0 * * *  curl -fsS -H "Authorization: Bearer $JOBS_TOKEN" $APP_URL/api/jobs/daily-indicators
```

- [ ] **Step 5: `.env.docker.example`, `next.config.js`, `.gitignore`, `scripts/dev-up.sh`**

`.env.docker.example`:
```
# Postgres / MinIO (compose)
POSTGRES_PASSWORD=cambiar
POSTGRES_PORT=5432
S3_ACCESS_KEY=alphataco
S3_SECRET_KEY=cambiar-cambiar
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
# App
APP_PORT=3000
APP_DOMAIN=localhost
JOBS_TOKEN=cambiar
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_PROJECT_URL=http://localhost:3000
NEXT_PUBLIC_SHOW_LOGS=false
# Supabase (sólo hasta P4: auth y storage siguen en Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
# SMTP (P5)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
SMTP_FROM=
# TaskApp
TASKAPP_BASE_URL=
TASKAPP_PROJECT_API_KEY=
```
`next.config.js`: agregar `output: 'standalone',` como primera propiedad de `nextConfig`.
`.gitignore`: agregar línea `.env.docker`.
`scripts/dev-up.sh`:
```sh
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.docker ] || { cp .env.docker.example .env.docker; echo "Creado .env.docker: completá las contraseñas"; exit 1; }
docker compose --env-file .env.docker up -d postgres minio minio-init
docker compose --env-file .env.docker ps
```

- [ ] **Step 6: Verificar**

Run: `cp .env.docker.example .env.docker && sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=devpass/; s/^S3_SECRET_KEY=.*/S3_SECRET_KEY=devpassdevpass/; s/^JOBS_TOKEN=.*/JOBS_TOKEN=devtoken/' .env.docker && docker compose --env-file .env.docker config > /dev/null && bash scripts/dev-up.sh`
Expected: `postgres` y `minio` `healthy`; `minio-init` termina con exit 0 y `docker compose --env-file .env.docker run --rm minio-init mc ls local/` (o `docker run --rm --network alphataco_alphataco minio/mc ...`) lista los 6 buckets.
Run: `docker compose --env-file .env.docker build cron caddy` → OK.
Run: `docker compose --env-file .env.docker build app` (puede tardar varios minutos; timeout 20 min). Expected: imagen construida. Si falla por variables `NEXT_PUBLIC_*` vacías en build, documentar cuáles son obligatorias en `.env.docker.example`. No arrancar `app` todavía (la BD está vacía hasta Task 4).

- [ ] **Step 7: Commit**

```sh
git add docker-compose.yml Dockerfile .dockerignore docker .env.docker.example scripts/dev-up.sh next.config.js .gitignore docs/desarrollo/entornos.md
git commit -m "feat(infra): docker compose con postgres, minio, app standalone, cron y caddy"
```

---

### Task 2: Extracción de la lógica SQL vigente a `prisma/sql/` con inventario

**Files:**
- Create: `scripts/sql/split-statements.ts`, `scripts/sql/split-statements.test.ts`, `scripts/sql/extract-sql-objects.ts`, `prisma/sql/README.md`, `prisma/sql/INVENTARIO.md`, `prisma/sql/{permissions,documents,diagrams,daily-report,kpis,maintenance,misc}.sql`, `prisma/sql/objects.json`
- Modify: `vitest.config.ts` (`include` suma `scripts/**/*.test.ts`)

**Interfaces:**
- Produces: `splitSqlStatements(sql: string): string[]` (puro; respeta comillas simples, comentarios `--` y `/* */`, y dollar-quoting `$$`, `$function$`, `$cron$`, etc.). `extractSqlObjects(files: { path: string; sql: string }[]): SqlObject[]` con `SqlObject = { kind: 'function' | 'trigger' | 'view'; name: string; table?: string; statement: string; source: string }` donde cada nombre aparece una sola vez con su **última** definición y desaparece si hubo un `DROP` posterior sin recreación.

- [ ] **Step 1: Test del splitter (RED)**

`scripts/sql/split-statements.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { splitSqlStatements } from './split-statements';

describe('splitSqlStatements', () => {
  it('separa por punto y coma a nivel superior', () => {
    expect(splitSqlStatements('select 1; select 2;')).toEqual(['select 1', 'select 2']);
  });
  it('no corta dentro de dollar-quotes con o sin etiqueta', () => {
    const sql = "create function f() returns void language plpgsql as $function$ begin perform 1; end; $function$; create function g() returns int language sql as $$ select 1; $$;";
    const out = splitSqlStatements(sql);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('perform 1; end;');
  });
  it('no corta dentro de strings ni comentarios', () => {
    const sql = "insert into t values ('a;b'); -- comentario; con punto y coma\nselect /* x; y */ 3;";
    expect(splitSqlStatements(sql)).toEqual(["insert into t values ('a;b')", 'select /* x; y */ 3']);
  });
  it('ignora sentencias vacías', () => {
    expect(splitSqlStatements(';;\n  ;')).toEqual([]);
  });
});
```
Run: `npx vitest run scripts/sql/split-statements.test.ts` → FAIL (módulo inexistente). Guardar salida.

- [ ] **Step 2: Implementar `split-statements.ts` (GREEN)**

Escáner de un solo paso con estados: `normal`, `singleQuote` (escape `''`), `lineComment`, `blockComment`, `dollar` (etiqueta capturada con regex `/\$[A-Za-z_]*\$/` en la posición actual; se cierra con la misma etiqueta). Emitir al encontrar `;` en `normal`. `trim()` y descartar vacíos. Run: test → PASS 4/4.

- [ ] **Step 3: `extract-sql-objects.ts`**

Comportamiento:
1. Lee, en orden cronológico, `supabase/migrations/*.sql` (orden por nombre) y luego `prisma/migrations/*/migration.sql` con timestamp ≥ `20260313` (el `0_baseline` de Prisma es una re-serialización de lo anterior; **no** se lee). Registrar el orden en el reporte.
2. Para cada sentencia: `CREATE [OR REPLACE] FUNCTION [public.]"?name"?(...)` → upsert `function:name`; `DROP FUNCTION [IF EXISTS] [public.]name(...)` → delete; `CREATE [OR REPLACE] [CONSTRAINT] TRIGGER name ... ON [public.]table` → upsert `trigger:name` (guardar `table`); `DROP TRIGGER [IF EXISTS] name ON table` → delete; `CREATE [OR REPLACE] VIEW [public.]name` → upsert `view:name`; `DROP VIEW ...` → delete. Comparación de nombres sin comillas ni prefijo `public.`, case-insensitive. Todo lo demás se ignora (tablas, policies, grants, extensiones, `cron.schedule`, `ALTER`).
3. Descartar objetos cuyo cuerpo mencione `checklist_answer_repairs`, `repair_solicitudes`, `repairlogs` o `hired_modules` (tablas eliminadas en Fases 1–2) — listar en el reporte como "descartado por tabla eliminada".
4. Salida: `prisma/sql/objects.json` (array de `SqlObject`, ordenado: funciones por nombre, luego vistas, luego triggers) y archivos por dominio según prefijo/palabras del nombre: `permissions.sql` (`*permission*`, `*role*`, `*module*`, `*tab*`), `documents.sql` (`*documento*`, `*document*`, `*alerta*`, `*status*`), `diagrams.sql` (`*diagram*`, `*novelty*`, `*absence*`, `hr_*`), `daily-report.sql` (`*daily*`, `*preparte*`, `*deviation*`), `kpis.sql` (`*kpi*`, `*indicator*`, `*services_summary*`), `maintenance.sql` (`*maintenance*`, `*work_order*`, `*repair*`, `*tire*`, `*checklist*`), resto `misc.sql`. Cada archivo: cabecera con `-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4`, funciones primero, luego vistas, luego triggers.
5. `INVENTARIO.md`: tabla por objeto — nombre, tipo, dominio, tabla (triggers), llamadores detectados: (a) en `src/` por `grep -rn "nombre(" src --exclude-dir=generated` y `rpc('nombre'`; (b) triggers que ejecutan la función (`EXECUTE FUNCTION nombre()`); (c) otras funciones que la llaman (`nombre(` dentro de otros cuerpos); (d) "cron (legacy)" si aparece en un `cron.schedule` de las migraciones. Columna final `Referencias Supabase` = sí/no si el cuerpo contiene `auth.uid()`, `auth.jwt()`, `auth.role()`, `storage.`, `extensions.`, `net.http_post`, `cron.`, `pgsodium`, `supabase_functions`. Objetos con **0 llamadores** van a una sección "Sin llamador — no se portan" y se **excluyen** de los `.sql` (quedan sólo en `objects.json` con `orphan: true`).
6. Ejecutar con `node scripts/sql/extract-sql-objects.ts` (Node 24 ejecuta TS con type stripping). Imprimir resumen: N funciones, N triggers, N vistas, N huérfanos, N con referencias Supabase.

- [ ] **Step 4: Verificar**

Run: `node scripts/sql/extract-sql-objects.ts` → resumen coherente con el inventario previo (≈114 funciones únicas, 51 triggers, 3 vistas antes de descartar). Spot-check: `grep -c "CREATE OR REPLACE FUNCTION" prisma/sql/*.sql`; `grep -n "auth.uid" prisma/sql/*.sql` (esperado: sólo en funciones de permisos, se corrigen en Task 4); las 25 funciones que llama el código (`check_multiple_permissions check_novelty_conflicts controlar_alertas_documentos_single_employee controlar_alertas_documentos_single_vehicle generate_kpi_code get_daily_report_deviations get_dailyreportrow_history get_kpi_range get_max_order_number get_services_summary_by_type get_services_summary_by_type_with_dates get_user_accessible_modules get_user_permissions hr_get_absenteeism_summary hr_get_absenteeism_trend hr_get_current_absent_employees hr_get_daily_absence_timeseries hr_get_department_absence_reasons hr_get_department_absence_summary next_pre_file_number process_massive_novelty_creation select_distinct_values update_employee_diagram_status user_has_permission`) están presentes con llamador "src". `npm test` verde; `npm run check-types` verde.

- [ ] **Step 5: Commit**

```sh
git add scripts/sql prisma/sql vitest.config.ts
git commit -m "feat(db): extraer funciones, triggers y vistas vigentes a prisma/sql con inventario"
```

---

### Task 3: `schema.prisma` para Postgres plano y multi-empresa

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: los archivos de `src/` que dejen de compilar (sólo includes/relaciones a modelos eliminados)

**Interfaces:**
- Produces: schema sin `auth`/`storage`; columnas uuid conservadas donde había FK a `auth.users`; `company_id String @db.Uuid` NOT NULL + relación a `company` + `@@index([company_id])` en las 21 tablas listadas abajo.

- [ ] **Step 1: Quitar los schemas de Supabase**

En `datasource db`: `schemas = ["public"]` (o quitar `multiSchema` y todos los `@@schema("public")` — elegir quitar `multiSchema` y los 178 `@@schema("public")` con `sed -i '/@@schema("public")/d'` + quitar `previewFeatures = ["multiSchema"]` si existe; documentar). Borrar los 29 modelos con `@@schema("auth")` y los 11 con `@@schema("storage")` y sus enums exclusivos (`aal_level`, `code_challenge_method`, `factor_status`, `factor_type`, `oauth_*`, `one_time_token_type`).
Relaciones `public` → `users` a eliminar (conservando la columna): `dailyreportrows_history`, `kpi_revisions`, `maintenance_orders.operations_validated_by`, `profile.id` y `profile.credential_id` (`users_profile_credential_idTousers`, `users_profile_idTousers`), `share_company_users`, `user_equipment_type_visibility`, `user_permissions`, `user_roles`. Verificar con `grep -n "users" prisma/schema.prisma` que no quede ninguna referencia al modelo.

- [ ] **Step 2: `company_id` en las 21 tablas**

Agregar a cada modelo: `company_id String @db.Uuid`, `company company @relation(fields: [company_id], references: [id], onDelete: Cascade)` y `@@index([company_id])`; y la relación inversa `xxx xxx[]` en `model company`. Tablas: `aptitudes_tecnicas`, `checklist_answers`, `checklist_deviations`, `checklist_template_types`, `company_positions`, `cost_center`, `documents_company`, `documents_pre_employees`, `hierarchy`, `maintenance_activity_log`, `maintenance_order_items`, `maintenance_orders`, `maintenance_request_items`, `maintenance_requests`, `model_vehicles`, `type_hitch_types`, `types_of_contract`, `work_diagram`, `work_diagram_active_novelties`, `work_order_item_repairs`, `workshop_sectors`. **No** a `profile` (un usuario pertenece a varias empresas vía `share_company_users`). Si un modelo ya tiene un campo `company` con otro nombre de relación, respetar el existente.

- [ ] **Step 3: Regenerar y arreglar tipos**

Run: `npx prisma validate && npx prisma generate && npm run check-types`
Expected: errores sólo en `include`/`select` de relaciones eliminadas (`users`, `users_profile_*`) y en `create` de las 21 tablas que ahora exigen `company_id`. Corregir: quitar los includes a `users`; en los `create`, `company_id: await getActiveCompanyId()` (o el `companyId` que la action ya tenga). Anotar en el reporte cada archivo tocado. NO migrar nada más de Supabase a Prisma en esta task.

- [ ] **Step 4: Commit**

```sh
git add prisma/schema.prisma src
git commit -m "feat(db): schema prisma sin schemas de supabase y company_id en todas las tablas de negocio"
```

---

### Task 4: Revisión de `prisma/sql` y baseline `0_init`

**Files:**
- Modify: `prisma/sql/*.sql` (edición manual de las funciones con referencias Supabase)
- Create: `scripts/sql/build-baseline.ts`, `prisma/migrations/0_init/migration.sql`, `docs/legacy-migrations/README.md`
- Move: `prisma/migrations/*` (todas las anteriores) → `docs/legacy-migrations/prisma/`; `supabase/migrations/` → `docs/legacy-migrations/supabase/`
- Modify: `package.json` (scripts `db:baseline`, `db:reset`), `.claude/rules/migrations.md` (nuevo flujo: baseline + migraciones manuales sobre Postgres plano)

- [ ] **Step 1: Editar a mano las funciones con `Referencias Supabase`**

Para cada una (del `INVENTARIO.md`): `auth.uid()` → parámetro `p_user_id uuid` nuevo al final de la firma (las 4-5 funciones de permisos: `get_user_permissions`, `check_multiple_permissions`, `user_has_permission`, `get_user_accessible_modules` y las que el inventario marque); `auth.jwt()`/`auth.role()` → eliminar la rama (documentar); `extensions.` → quitar el prefijo (`uuid_generate_v4` → `gen_random_uuid()`); `net.http_post`/`cron.`/`pgsodium`/`storage.` → la función no se porta (mover a "Sin llamador" si su único propósito era eso, p. ej. `enviar_documentos_a_46_dias`). Funciones que asumen mono-empresa (comentarios "solo GH tiene datos", `WHERE company_id IS NULL OR ...`): agregar el filtro por `company_id` de la fila/parámetro. Registrar cada cambio en `INVENTARIO.md` columna "Cambios al portar". Las funciones de permisos ahora reciben el user id: anotar en el inventario que los llamadores en `src/` (P2) deben pasar `p_user_id`.

- [ ] **Step 2: `scripts/sql/build-baseline.ts`**

Genera `prisma/migrations/0_init/migration.sql` = `-- extensiones` (`CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS moddatetime;` — `moddatetime` sólo si algún trigger la usa, según inventario) + salida de `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` + contenido de `prisma/sql/*.sql` en este orden: `misc.sql`, `permissions.sql`, `documents.sql`, `diagrams.sql`, `daily-report.sql`, `kpis.sql`, `maintenance.sql` (funciones antes que triggers dentro de cada archivo ya está garantizado por Task 2). Script en `package.json`: `"db:baseline": "node scripts/sql/build-baseline.ts"`.

- [ ] **Step 3: Archivar migraciones viejas y aplicar el baseline en el compose**

```sh
mkdir -p docs/legacy-migrations && git mv prisma/migrations docs/legacy-migrations/prisma && git mv supabase/migrations docs/legacy-migrations/supabase
mkdir -p prisma/migrations && npm run db:baseline
docker compose --env-file .env.docker up -d postgres
DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:5432/alphataco npx prisma migrate deploy
```
Expected: `0_init` aplicada sin errores. Si falla en alguna función (dependencias de orden, tipos de Supabase como `auth.uid`), corregir el `.sql` correspondiente y repetir con `npm run db:reset` (`"db:reset": "docker compose --env-file .env.docker down -v postgres && docker compose --env-file .env.docker up -d postgres"`; esperar healthy). Iterar hasta que aplique limpio. Verificar: `psql ... -c "\df public.*" | wc -l` ≈ funciones portadas; `\dv` = vistas; `SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal` = triggers portados.
`docs/legacy-migrations/README.md`: explica que son historia de gh_gestion/Supabase y no se ejecutan.

- [ ] **Step 4: Actualizar `.claude/rules/migrations.md`**

Nuevo flujo: BD vacía → `0_init`; cambios posteriores = carpeta manual `YYYYMMDDHHMMSS_nombre/migration.sql` (DDL por `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script --shadow-database-url <postgres del compose>` o escrito a mano) + `prisma migrate deploy` contra el compose. Cambios en funciones/triggers: editar `prisma/sql/*.sql` **y** escribir la misma `CREATE OR REPLACE` en la migración del cambio (el baseline no se regenera después del primer deploy real).

- [ ] **Step 5: Commit**

```sh
git add prisma/sql prisma/migrations scripts/sql/build-baseline.ts docs/legacy-migrations package.json .claude/rules/migrations.md
git commit -m "feat(db): baseline 0_init para postgres plano con la lógica SQL portada"
```

---

### Task 5: Seed de empresa

**Files:**
- Create: `scripts/seed-company.ts`, `scripts/seed-company.test.ts` (test de la parte pura)
- Modify: `package.json` (`"db:seed": "node scripts/seed-company.ts"`)

**Interfaces:**
- Produces: `buildPermissionRows(map: PermissionsMap): { modules: ModuleRow[]; tabs: TabRow[]; actions: ActionRow[]; rolePermissions: RolePermissionRow[] }` (puro, en `scripts/seed/permission-rows.ts`) a partir de `src/features/Permissions/permissions-map.ts`; CLI `node scripts/seed-company.ts --name "Empresa" [--id uuid]` idempotente (upsert por `id`/`slug`).

- [ ] **Step 1: Test (RED)** — `buildPermissionRows` con un mapa mínimo (1 módulo, 1 tab con 1 subtab, `allowedActions: ['view','create']`) produce las filas esperadas: módulo, 2 tabs (subtab con `parent_tab_id`), acciones únicas, y `rolePermissions` = producto tab × acción para los 3 roles `admin`, `administrador`, `full-access-provisional`. Run → FAIL.
- [ ] **Step 2: Implementar** `scripts/seed/permission-rows.ts` y `scripts/seed-company.ts`: crea/actualiza `company` (nombre, id), `modules`, `tabs`, `actions` (`view/create/update/delete/approve` — verificar en `permissions-map.ts` el set real), los 3 roles de sistema (`is_system: true`, `slug` fijo) y `role_permissions`. Sin usuarios (P4). Run → PASS.
- [ ] **Step 3: Ejecutar contra el compose** `DATABASE_URL=... npm run db:seed -- --name "Demo"` dos veces → segunda corrida sin duplicados (`select count(*) from tabs`, `roles`, `role_permissions` iguales).
- [ ] **Step 4: Commit** `feat(db): seed idempotente de empresa, módulos, tabs, acciones y roles`.

---

### Task 6: pgTAP y `npm run test:db`

**Files:**
- Create: `prisma/tests/00_schema.sql`, `prisma/tests/01_permissions.sql`, `scripts/test-db.sh`
- Modify: `package.json` (`"test:db": "bash scripts/test-db.sh"`), `.github/workflows/ci.yml` (job `db-tests` con `services: postgres` **no** sirve porque necesita pgTAP → usar `docker compose` en el runner: `docker compose --env-file .env.docker.example build postgres && bash scripts/test-db.sh`)

- [ ] **Step 1: `scripts/test-db.sh`**: `docker compose --env-file .env.docker up -d postgres` → esperar healthy → `prisma migrate deploy` contra un DB `alphataco_test` (crear con `psql` si no existe; `DATABASE_URL` apuntando a él) → `db:seed --name Test --id 00000000-0000-0000-0000-000000000001` → `docker compose exec -T postgres pg_prove -U alphataco -d alphataco_test /tests/*.sql` (montar `./prisma/tests:/tests:ro` en el servicio `postgres` del compose).
- [ ] **Step 2: `00_schema.sql`**: `SELECT plan(N)`; `has_function('public','user_has_permission')`, `has_function('public','controlar_alertas_documentos_single_employee')`, `has_view('public','equipments_with_pending_deviations')`, `has_column('maintenance_orders','company_id')`, `hasnt_schema('auth')`. `01_permissions.sql`: con el seed, `role_permissions` del rol `admin` cubre todas las tabs (`SELECT count(*)` = tabs × acciones permitidas) y `user_has_permission(...)` con un usuario inexistente devuelve `false` (firma nueva con `p_user_id`).
- [ ] **Step 3: Run** `npm run test:db` → todos verdes. Commit `test(db): pgTAP con smoke de schema y permisos`.

---

### Task 7: Documentación y cierre de P1

- [ ] `docs/desarrollo/entornos.md`: sección "Docker" (levantar, resetear, seed, tests db, dónde ver MinIO), y nota de que Auth/Storage siguen en Supabase hasta P4/P3.
- [ ] `README.md`: reemplazar "Actualizar Supabase DB"/"Subir cambios a la DB" por un puntero a `.claude/rules/migrations.md` y `entornos.md`.
- [ ] Verificación final: `bash scripts/dev-up.sh` en limpio (`down -v`), `prisma migrate deploy`, `db:seed`, `test:db` verde; `npm test`, `check-types` verdes; `docker compose build app` OK.
- [ ] Commit `docs(infra): entornos docker y flujo de migraciones nuevo`.

**Criterio de terminado P1:** compose levanta postgres/minio (+ app construible); `0_init` aplica en Postgres plano; inventario SQL con llamadores; seed idempotente; `test:db` ≥ 2 archivos pgTAP verdes; CI corre `test:db`.
