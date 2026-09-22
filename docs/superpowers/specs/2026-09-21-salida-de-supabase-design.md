# Salida de Supabase — Diseño

**Fecha:** 2026-09-21
**Estado:** aprobado por secciones el 20–21/09/2026 (hosting, datos, auth, email, lógica SQL, arquitectura, storage/jobs, tenancy, orden de ejecución).
**Contexto previo:** `docs/superpowers/plans/2026-09-18-plan-maestro-deuda-tecnica.md` (Fases 0–3 ejecutadas). Este diseño **reemplaza** las Fases 4–7 del plan maestro.

## 1. Decisiones de base

| Decisión | Valor |
|---|---|
| Hosting | VPS propio con Docker: Postgres, MinIO, app Next, cron, reverse proxy |
| Datos iniciales | Base vacía. No se migran datos ni usuarios ni archivos de Grupo Horizonte |
| Multi-empresa | Real. Toda tabla de negocio lleva `company_id NOT NULL` |
| Auth | Better Auth sobre Postgres (Prisma). Email+password con invitación y cambio obligatorio, reset por email, sesión anónima para QR, Google OAuth (configurado, deshabilitado en UI), logins de operario e indumentaria sobre la misma auth |
| Email | SMTP configurable con nodemailer. Se elimina `resend` |
| Lógica SQL | Se conserva en Postgres (funciones, triggers, vistas), portada a archivos versionados y probada con pgTAP. Las RLS policies no se recrean |
| Archivos | MinIO (S3) con buckets privados y presigned URLs |
| Jobs | Route handlers `/api/jobs/*` protegidos por token, disparados por un contenedor cron |
| Analytics | PostHog se mantiene |

## 2. Arquitectura objetivo

```
VPS
├─ caddy (TLS automático, reverse proxy → app:3000)
├─ app (Next.js 16 standalone)
│    ├─ Better Auth      tablas user/session/account/verification en Postgres
│    ├─ Prisma           único acceso a datos (con guardia multi-tenant)
│    ├─ FileStorage      adaptador S3 → minio
│    ├─ Mailer           nodemailer → SMTP externo
│    └─ /api/jobs/*      ← cron
├─ postgres 16 (extensiones: pgcrypto, uuid-ossp, pg_trgm si hay índices; sin pg_cron/pg_net/pgsodium/pgjwt)
├─ minio (6 buckets privados)
└─ cron (alpine + curl, TZ America/Argentina/Buenos_Aires)
volúmenes: pgdata, minio-data · backups: pg_dump diario + mc mirror
```

Secrets sólo en el `.env` del compose. Nunca en migraciones.

## 3. Autenticación e identidad

- Better Auth con `prismaAdapter`, plugins `admin`, `anonymous`, `nextCookies` (último). Handler en `src/app/api/auth/[...all]/route.ts`.
- Capa `src/lib/auth/`: `auth.ts` (config), `auth-client.ts`, `session.ts` (`getSessionUser()` cacheado por request; reemplaza `auth.getUser()`/`getSession()`), `admin.ts` (crear/banear usuarios). Nadie importa Better Auth fuera de esa carpeta.
- `profile.credential_id` → FK a `user.id`. Se conservan `profile`, `share_company_users`, `user_roles`, `roles`, `role_permissions`, `modules/tabs/actions`.
- **Empresa activa**: campo adicional de sesión `session.active_company_id`, validado con `canAccessCompany` al cambiar. `getActiveCompanyId()` lee la sesión. La cookie `actualComp` se elimina.
- **Permisos**: sistema propio. Las funciones SQL de permisos reciben `p_user_id` explícito (dejan de usar `auth.uid()`).
- **Invitación**: `auth.api.createUser` + contraseña temporal por email + `user.needs_password_change` (campo adicional) que el layout del dashboard fuerza en el primer login. **Baneo**: `auth.api.banUser`.
- **Reset**: único flujo (Better Auth). Se elimina `password_reset_tokens` y el flujo paralelo.
- **QR anónimo**: `signIn.anonymous()`; los flujos `/maintenance/*` derivan la empresa del equipo, nunca de la sesión. Sin vinculación posterior.
- **Middleware**: sin sesión → `/login`; anónimo en `/dashboard` → `/maintenance`; sin `active_company_id` → selector o `/dashboard/company/new`.
- Errores: sesión inválida → redirect; baneado → mensaje del plugin; sin empresa → selector. Sin empresa por defecto.

## 4. Archivos

- Interfaz `src/lib/storage/index.ts` (`FileStorage`: `upload`, `getSignedUrl`, `getSignedUploadUrl`, `delete`, `exists`; tipo `Bucket` con los 6 buckets). Adaptador único `s3.ts` (`@aws-sdk/client-s3` + presigner; `S3_FORCE_PATH_STYLE=true`). Sirve contra el endpoint S3 de Supabase Storage durante la transición.
- Buckets privados siempre. Descargas y `<img>` por presigned URL (15 min). `next.config.js` `images.remotePatterns` → host de MinIO.
- La BD guarda **keys** (`bucket/path`), no URLs absolutas. Convención: `${companyId}/${entidad}/${uuid}.${ext}`.
- Subida desde el cliente: server action emite `getSignedUploadUrl` → `PUT` directo → server action registra la fila.
- Carga multirecurso: una key, N filas; compensación con `storage.delete` si falla la transacción.

## 5. Jobs y email

- `src/lib/mail/`: `sendMail({ to, subject, html, text? })` con nodemailer (`SMTP_HOST/PORT/USER/PASS/SECURE/FROM`). Plantillas en `templates/` como funciones TS (portadas de las edge functions y de `Auth/utils/emailTemplates.ts`).
- Jobs en `src/app/api/jobs/<job>/route.ts` con `Authorization: Bearer $JOBS_TOKEN` (comparación en tiempo constante) y tabla `jobs_runs` (job, started_at, finished_at, status, error, metadata). Cada job es una función pura `run<Job>Job(deps)` testeable.
- Jobs: `documents-expiry` (lunes 08:00 AR), `daily-report-deviations` (diario), `daily-indicators` (diario; llama a las funciones `get_*_indicator` por empresa).
- Destinatarios por empresa en tabla `notification_settings` (`company_id`, `kind`, `recipients text[]`), no por env.
- Cron: contenedor con crontab de 3 líneas → `curl` a la app.

## 6. Datos y lógica SQL

- Prisma en todo el código: 0 `.from()`, 0 `.rpc()`, 0 `supabaseBrowser()`. Componentes cliente consumen server actions vía React Query.
- RPC → `src/shared/lib/sql.ts::callFunction<T>(name, args)` con `Prisma.sql` y validación Zod del resultado (un schema por función, 15 funciones).
- Realtime → invalidación de React Query + `refetchInterval` (30–60 s) donde importa.
- Lógica SQL vigente extraída a `prisma/sql/{documents,permissions,diagrams,daily-report,kpis,maintenance,misc}.sql` con `prisma/sql/INVENTARIO.md` (cada objeto con su llamador). Se quitan referencias a `auth.*`, `storage.*`, `extensions.*`, `net.*`, `cron.*`, `pgsodium`. Lo que no tiene llamador no se porta.
- Baseline nuevo `prisma/migrations/0_init/` = DDL de `schema.prisma` (`prisma migrate diff --from-empty`) + `prisma/sql/*.sql`, ensamblado por `scripts/build-baseline.ts`. Migraciones anteriores y `supabase/migrations` → `docs/legacy-migrations/` (no se ejecutan).
- pgTAP en `supabase`-less: `npm run test:db` levanta Postgres del compose, aplica baseline, corre `pg_prove`. Mínimo: permisos, reconciliación documental, desvíos de parte diario, status de recurso, novedades masivas.

## 7. Multi-empresa

- `company_id NOT NULL` + índice en las 22 tablas que no lo tienen (listadas en el plan maestro), en el baseline nuevo. Tablas globales (provincias, ciudades, países y las que el inventario confirme) quedan sin columna y documentadas.
- Escrituras: `company_id` explícito en todo `create`. Lecturas: `withCompany`.
- Guardia: extensión de Prisma en `src/shared/lib/prisma.ts` que, para modelos con `company_id`, lanza (en desarrollo y test; loguea en producción hasta P6, luego lanza) si `findMany/count/updateMany/deleteMany` no incluyen `company_id` en el `where`.
- Funciones/triggers que asumían mono-empresa se corrigen al portarlos.
- Seeds: `scripts/seed-company.ts` idempotente (módulos/tabs/actions, 3 roles de acceso total, tipos de documento base). Se elimina `supabase/seed.sql`.

## 8. Orden de ejecución (sub-proyectos, cada uno con plan, rama y PR)

| # | Sub-proyecto | Depende de | Terminado cuando |
|---|---|---|---|
| P1 | Infra local: compose, Dockerfile, `prisma/sql/` + inventario, baseline `0_init`, seed, pgTAP arrancando | — | `docker compose up` levanta todo; baseline aplica en Postgres plano; `npm run test:db` ≥ 1 test |
| P2 | Datos → Prisma, carpeta por carpeta (orden 4.1→4.13 del plan maestro), con `callFunction`, cookie → `getActiveCompanyId`, sin realtime, sin `any`, archivos > 600 líneas divididos, lógica pura con Vitest | P1 | por carpeta: 0 `.from()`/`.rpc()`/`any`; E2E del módulo verde |
| P3 | Storage → S3/MinIO | P2 | 0 `supabase.storage`; subida/descarga/borrado contra MinIO |
| P4 | Auth → Better Auth; eliminar cookie `actualComp` y `@supabase/*` | P2, P3 | login, invitación, reset, QR anónimo, cambio de empresa, baneo en E2E |
| P5 | Jobs y email | P4 | 3 jobs por `curl` con `jobs_runs`; tests de cada job |
| P6 | Limpieza final: `supabase/`, `database.types.ts`, deps, hosts, docs; guardia multi-tenant en modo estricto | P5 | `supabase_files = 0`, `any = 0` |

Nota: desde P1 la BD objetivo es el Postgres del compose; los accesos PostgREST restantes (`.from()`/`.rpc()` de `src/`) quedan inoperantes hasta que P2 los migre, por lo que **P1+P2 forman el primer estado deployable**.

Las Fases 5 y 7 del plan maestro se absorben dentro de P2.

## 9. Testing y CI

- Lógica pura: Vitest (TDD). SQL: pgTAP. Integración (auth, storage, jobs): Vitest contra el compose (`test:integration`), sin mocks de Better Auth/MinIO. Flujo completo: Cypress contra la app en compose con el usuario del seed.
- CI: `check-types` + Vitest en cada PR; `test:db` + E2E con servicios Docker en PRs a `dev`.

## 10. Riesgos

| Riesgo | Control |
|---|---|
| Portar 120 funciones SQL a mano | Inventario con llamador obligatorio; pgTAP sobre las críticas antes de dar por portada cada una |
| P2 largo (13 carpetas) | Cada carpeta mergeable sola; Supabase sigue funcionando entre medio |
| Auth es un corte duro | Rama propia, probada de punta a punta en compose; BD nueva, sin usuarios que migrar |
| `'use cache'` + `cookies()` | Funciones cacheadas reciben `companyId` por parámetro |

## 11. Fuera de alcance

Rebranding "Grupo Horizonte" (19 archivos de UI/PDF), rediseño funcional de módulos, migración de datos de GH, websockets/realtime propio.
