# Migraciones históricas (gh_gestion / Supabase) — solo referencia, NO se ejecutan

Archivo de las migraciones con las que se construyó la base de datos de `gh_gestion` sobre Supabase, movidas acá en la Task 4 del plan P1 (`.superpowers/sdd/2026-09-21-p1-infra-local/`) cuando alphataco pasó a Postgres plano:

| Carpeta | Origen | Contenido |
| --- | --- | --- |
| `supabase/` | `supabase/migrations/` | 43 migraciones de la CLI de Supabase (2025-11 → 2026-03): estructura inicial, RLS, funciones, triggers, cron. |
| `prisma/` | `prisma/migrations/` | `0_baseline` (re-serialización del esquema, incluía tablas de `auth`/`storage`) + 80 migraciones Prisma (2026-03 → 2026-09). |

**Ninguna se aplica**: `prisma migrate deploy` solo lee `prisma/migrations/`, cuyo único punto de partida es ahora `0_init` (generado por `npm run db:baseline` a partir de `prisma/schema.prisma` + `prisma/sql/*.sql`). Estas carpetas quedan como historia para entender de dónde salió cada función/trigger (la columna "origen" de `prisma/sql/*.sql` e `INVENTARIO.md` apunta acá) y para auditar decisiones viejas.

Referencian schemas que no existen en Postgres plano (`auth.`, `storage.`, `extensions.`, `net.`, `cron.`, políticas RLS de Supabase): no intentar ejecutarlas contra el compose.
