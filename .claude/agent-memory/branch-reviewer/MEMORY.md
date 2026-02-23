# Branch Reviewer - Memory

## Estilo de Commits del Proyecto

- Formato: `tipo(scope): descripcion en ingles`
- Scopes frecuentes: `mantenimiento`, `empleados`, `empresa`, `db`, `operator-panel`
- Mensajes descriptivos con bullet points en el body cuando hay muchos cambios
- NUNCA Co-Authored-By

## Nuevo Sistema DataTable (ACTUAL, obligatorio)

- Componente base: `src/shared/components/common/DataTable/` (DataTable.tsx, helpers.ts, types.ts, useDataTable.ts)
- Cliente Prisma: `src/shared/lib/prisma.ts` (singleton con PrismaPg adapter)
- Export Excel: `src/shared/lib/excel-export.ts` (usa ExcelJS)
- Preferencias de tabla: `src/shared/actions/table-preferences.ts` (persiste por user+tableId)
- Mappers de enums: `src/shared/utils/mappers.ts` (labels, badges, icons)
- Arquitectura 3 capas: `page.tsx` → `{Entity}List.tsx` (Server) → `_{Entity}DataTable.tsx` (Client)
- Facets cargados client-side via `useQuery` (NO bloqueantes en SSR)
- `:any` con `// eslint-disable-next-line @typescript-eslint/no-explicit-any` es aceptable en DataTableExportButton y excel-export (interop TanStack)
- Sistema VIEJO (BaseDataTable + Supabase): NO usar ni parchear, solo reemplazar completamente

## Patrones de Violaciones Frecuentes

### Corregidas al vuelo en codigo existente (no en diff)

- `console.*` en server actions de features (document-actions, actionsServer) — reemplazar con `Logger` de `@/lib/logger`
- Tipos `: any` y `as any` en params de server actions — usar enums de `database.types` o `Parameters<typeof fn>[n]`
- `router.refresh()` en Client Components — reemplazar con `queryClient.invalidateQueries`

### Patrones Correctos Observados

- Server actions en `src/features/{Feature}/actions/actionsServer.ts` con `'use server'`
- `useQuery` con `staleTime: 5 * 60 * 1000` para queries de catalogos
- `Logger` instanciado como `new Logger('scope')` al tope del archivo
- `invalidateAllMaintenanceQueries(queryClient)` en `utils/queryInvalidation.ts` para mutaciones del modulo Mantenimiento
- `moment().utcOffset(-3)` para manejo de fecha local Argentina (UTC-3)

## Convenciones de Branch Naming

- `feature/kebab-case-descripcion`

## Archivos Clave del Modulo Mantenimiento

- `src/features/Mantenimiento/utils/queryInvalidation.ts` — invalidar todas las queries del modulo
- `src/features/Checklist/actions/actionsServer.ts` — `fetchSupervisorsForChecklist` devuelve `isAvailable`, `hasLinkedEmployee`, `hasActiveDiagram`
- `src/features/Mantenimiento/SolicitudesMantenimiento/hooks/useMaintenanceRequests.ts` — `MAINTENANCE_REQUESTS_QUERY_KEY` constante

## Pre-commit Hook

- Corre `tsc --noEmit` (check-types) y `prettier --write`
- Si falla el hook se crea un stash backup automatico
- El hook ejecuta linter: verificar tipos antes de commitear

## Archivos a NO Commitear

- `.claude/agent-memory/` — directorio de memoria de agentes (ya en .gitignore o ignorar con untracked)
- Archivos `.env*`
