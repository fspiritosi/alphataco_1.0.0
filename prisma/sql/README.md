# `prisma/sql/` — lógica SQL vigente (funciones, triggers y vistas)

Extracción de la última definición vigente de cada función, trigger y vista a partir de las migraciones históricas (`supabase/migrations/*.sql` y `prisma/migrations/*/migration.sql`), agrupada por dominio. Es la fuente que la Task 4 revisa a mano y concatena en el baseline `0_init` para Postgres plano.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `permissions.sql`, `documents.sql`, `diagrams.sql`, `daily-report.sql`, `kpis.sql`, `maintenance.sql`, `misc.sql` | Objetos portables, aplicables tal cual con `psql -f` sobre una BD que ya tenga las tablas. Dentro de cada archivo: funciones, después vistas, después triggers. |
| `INVENTARIO.md` | Tabla por objeto (nombre, tipo, dominio, tabla, llamadores, referencias Supabase), resumen con conteos, lista "Sin llamador — no se portan", "Descartados por tabla eliminada", "Con referencias Supabase" y sobrecargas detectadas. |
| `objects.json` | Inventario completo en JSON: TODOS los objetos vigentes, incluidos los huérfanos (`orphan: true`) y los descartados (`discarded: '...'`), con sus llamadores y referencias. |

## Cómo se generan

```sh
node scripts/sql/extract-sql-objects.ts
```

(Node ≥ 22.18 ejecuta TypeScript directamente por type stripping.) El script:

1. Lee en orden cronológico `supabase/migrations/*.sql` (por nombre) y luego `prisma/migrations/<timestamp>_*/migration.sql` con timestamp ≥ `20260313` (`0_baseline` no se lee: es una re-serialización del esquema).
2. Divide cada archivo en sentencias con `scripts/sql/split-statements.ts` (respeta strings, comentarios y dollar-quoting).
3. Aplica `CREATE [OR REPLACE] FUNCTION|TRIGGER|VIEW` como upsert y `DROP FUNCTION|TRIGGER|VIEW|TABLE` como baja (los triggers caen con su tabla). Los nombres se comparan sin comillas ni `public.`, en minúsculas; las funciones sólo por nombre (sin firma). Todo lo demás (tablas, policies, grants, `cron.schedule`, `ALTER`) se ignora.
4. Descarta los objetos que mencionen tablas eliminadas en Fases 1–2 (`checklist_answer_repairs`, `repair_solicitudes`, `repairlogs`, `hired_modules`) y los triggers cuya función se descartó.
5. Detecta llamadores: `src/` (`rpc('nombre'`, `nombre(` en SQL crudo, o el nombre como literal, p. ej. `source` de `daily_indicators`), edge functions de `supabase/functions/`, triggers que ejecutan la función, otras funciones/vistas que la usan y jobs `cron.schedule` de las migraciones. Las menciones en comentarios no cuentan.
6. Marca como huérfano (no se porta) todo objeto sin llamadores vigentes, hasta punto fijo: un llamador que a su vez es huérfano o descartado no cuenta.

## Dominios (primera coincidencia gana, sobre el nombre)

| Dominio | Patrones |
| --- | --- |
| `permissions` | `permission`, `role`, `module`, `tab` |
| `documents` | `documento`, `document`, `alerta`, `status` |
| `diagrams` | `diagram`, `novelty`, `absence`, `hr_` |
| `daily-report` | `daily`, `preparte`, `deviation` |
| `kpis` | `kpi`, `indicator`, `services_summary` |
| `maintenance` | `maintenance`, `work_order`, `repair`, `tire`, `checklist` |
| `misc` | el resto |

Los triggers se clasifican por el nombre de la función que ejecutan; si ese nombre no decide, por el nombre de la tabla. Las funciones sin dominio quedan en `misc.sql`, que es el primero en el orden de concatenación del baseline (`misc` → `permissions` → `documents` → `diagrams` → `daily-report` → `kpis` → `maintenance`), así los triggers de otros dominios encuentran sus funciones ya creadas.

## Edición manual

Los `.sql` se editan a mano SOLO en la revisión de la Task 4 (quitar `auth.*`, `net.*`, etc.). Regenerar con el script pisa esas ediciones.
