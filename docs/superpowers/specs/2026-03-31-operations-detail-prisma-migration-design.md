# Migrar /dashboard/operations/[id] a Prisma + Nuevo DataTable

**Fecha**: 2026-03-31
**Rama**: `refactor-operations-detail-prisma`
**Scope**: Solo `/dashboard/operations/[uuid]` (detalle de un parte diario)
**Excluido**: Tab de Preparte, página lista de operaciones (ya migrada)

## Contexto

La página de detalle de parte diario es una de las más pesadas del sistema. Usa el sistema viejo (BaseDataTable + Supabase directo + RPCs) con múltiples problemas de performance:

- 4 queries paralelas al cargar (filas + relaciones empleados + relaciones equipos + RPC desvíos)
- `useFormData` precarga TODOS los empleados y equipos activos al entrar a la página
- 10 RPCs separadas para popular facets de filtros de columna
- Una query SSR pesada (`getDailyReportById`) cuyos datos se ignoran en el render
- setTimeout de 1500ms esperando triggers de BD en el historial
- Componente de formulario monolítico de 800+ líneas
- CRUD de remitos escrito directamente desde el browser (viola server actions)
- Persistencia de tabla en cookies (sistema viejo)

## Decisiones de Diseño

1. **Reescritura completa** (enfoque B) — Cada componente se recrea desde cero con Prisma + nuevo DataTable. Sin parches sobre código viejo.
2. **1 query Prisma con JOINs** reemplaza 4 queries actuales. El diagrama del empleado para el día actual viene en el JOIN — desvíos se calculan sin RPC.
3. **3 DataTables con nuevo sistema**: tabla principal (server-side paginada) + selector de empleados (server-side paginada, se monta al abrir Dialog) + selector de equipos (idem).
4. **Datos on-demand**: los selectores de empleados/equipos NO precargan datos. Solo fetchean al abrir el Dialog.
5. **DailyReportRowForm descompuesto** en sub-componentes (~150 líneas el orquestador).
6. **Remitos migrados a server actions** con Prisma. Solo upload de archivos queda en el cliente (Supabase Storage).
7. **Permisos**: `checkPermissionServer` directo, sin TabsManagerServer (era una sola tab).
8. **Todas las tablas delegadas al agente `table-expert`** durante implementación.

## Arquitectura de Datos

### Query Principal

Una sola query Prisma con includes anidados reemplaza las 4 queries actuales:

```
prisma.dailyreportrows.findMany({
  where: { daily_report_id, ...filtros },
  include: {
    customers: { select: { id, name } },
    customer_services: { select: { id, service_name } },
    service_items: { select: { id, item_name } },
    service_sectors: { select: { id, sectors: { select: { name } } } },
    service_areas: { select: { id, areas_cliente: { select: { descripcion_corta } } } },
    preparte: { select: { id } },
    dailyreportemployeerelations: {
      include: {
        employees: {
          select: { id, firstname, lastname, file_number,
            employees_diagram: {
              where: { date: reportDate },
              select: { id, diagram_type: { select: { name, is_working_day } } }
            }
          }
        }
      }
    },
    dailyreportequipmentrelations: {
      include: {
        vehicles: { select: { id, domain, intern_number, brand_vehicles: { select: { name } } } },
        other_equipment: { select: { id, intern_number, serial_number } }
      }
    },
    dailyreport_customer_equipment_relations: {
      include: { equipos_clientes: { select: { id, name, type } } }
    },
    remitos: { select: { id, remit_number, _count: { select: { remito_documents: true } } } }
  },
  skip, take, orderBy
})
```

El diagrama del empleado para la fecha del parte viene en el JOIN. Si `employees_diagram` es vacío → sin diagrama (desvío). Si `diagram_type.is_working_day === false` → día no laboral (desvío). Sin RPC extra.

### Server Actions

Todas en `src/features/Operaciones/PartesDiarios/detail/actions.server.ts`:

| Función                                                       | Propósito                              | Reemplaza                                                 |
| ------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| `getDailyReportHeader(id)`                                    | Status + fecha para header             | `getDailyReportByIdOnlyDate` (Supabase)                   |
| `getDailyReportDetailPaginated(id, searchParams)`             | Filas paginadas con JOINs              | 4 queries Supabase + RPC desvíos                          |
| `getDailyReportDetailForExport(id, searchParams)`             | Todas las filas respetando filtros     | `fetchAllDailyReportData`                                 |
| `getDailyReportDetailSingleFacet(id, columnId, searchParams)` | Facet individual con cross-filter      | RPC `select_distinct_values` (x10)                        |
| `getDailyReportRowHistory(rowId)`                             | Historial de una fila                  | RPC `get_dailyreportrow_history`                          |
| `createDailyReportRow(data)`                                  | Crear fila + relaciones en transacción | 4-5 calls secuenciales                                    |
| `updateDailyReportRow(id, data)`                              | Actualizar fila + sync relaciones      | `updateDailyReportRow` + `update*Relations`               |
| `deleteDailyReportRow(id)`                                    | Eliminar fila + revertir preparte      | `deleteDailyReportRow`                                    |
| `bulkUpdateRowStatus(ids, status, fields?)`                   | Update masivo de filas                 | `updateDailyReportRowStatus` + `updateDailyReportRowBody` |
| `cloneDailyReportRows(sourceId, targetDates, rowIds)`         | Clonar filas a otras fechas            | Lógica dispersa en ClonarRegistrosButton                  |

Selectores en `detail/components/EmployeeSelector/actions.server.ts`:

| Función                                                  | Propósito                                |
| -------------------------------------------------------- | ---------------------------------------- |
| `getActiveEmployeesPaginated(searchParams, reportDate)`  | Empleados paginados con diagrama del día |
| `getEmployeeSelectorSingleFacet(columnId, searchParams)` | Facet individual para selector           |

Selectores en `detail/components/EquipmentSelector/actions.server.ts`:

| Función                                                   | Propósito                      |
| --------------------------------------------------------- | ------------------------------ |
| `getActiveEquipmentPaginated(searchParams)`               | Equipos paginados              |
| `getEquipmentSelectorSingleFacet(columnId, searchParams)` | Facet individual para selector |

Remitos en `detail/components/RemitosManager/actions.server.ts`:

| Función                                     | Propósito                         |
| ------------------------------------------- | --------------------------------- |
| `getRemitosForRow(rowId)`                   | Listar remitos de una fila        |
| `createRemito(rowId, remitNumber)`          | Crear remito                      |
| `updateRemitoNumber(remitoId, number)`      | Actualizar número                 |
| `deleteRemito(remitoId)`                    | Eliminar remito + docs de storage |
| `linkExistingRemito(remitoId, targetRowId)` | Vincular remito existente         |
| `unlinkRemito(remitoId)`                    | Desvincular remito                |
| `getAvailableRemitosForLinking(rowId)`      | Remitos disponibles para vincular |

### Transacciones

Crear y actualizar filas usan `prisma.$transaction()`:

```typescript
await prisma.$transaction(async (tx) => {
  const row = await tx.dailyreportrows.upsert/create/update(...)
  // Sync relaciones: delete existentes + create nuevas
  await tx.dailyreportemployeerelations.deleteMany({ where: { daily_report_row_id: row.id } })
  await tx.dailyreportemployeerelations.createMany({ data: employeeRelations })
  await tx.dailyreportequipmentrelations.deleteMany({ where: { daily_report_row_id: row.id } })
  await tx.dailyreportequipmentrelations.createMany({ data: equipmentRelations })
  await tx.dailyreport_customer_equipment_relations.deleteMany({ where: { daily_report_row_id: row.id } })
  await tx.dailyreport_customer_equipment_relations.createMany({ data: ceRelations })
})
```

## Estructura de Archivos

```
src/features/Operaciones/PartesDiarios/
├── detail/                                    # NUEVO — Todo lo de [uuid]
│   ├── DailyReportHeader.tsx                  # Server Component async — header con estado/fecha
│   ├── DailyReportDetailTable.tsx             # Server Component async — fetch + DataTable wrapper
│   ├── actions.server.ts                      # Server actions del detalle
│   ├── columns.tsx                            # Columnas tabla principal
│   ├── components/
│   │   ├── _DailyReportDetailDataTable.tsx    # Client — DataTable principal
│   │   ├── DailyReportRowForm/                # Sheet crear/editar (descompuesto)
│   │   │   ├── index.tsx                      # Orquestador (~150 líneas)
│   │   │   ├── CustomerServiceSection.tsx     # Combobox cascada Cliente→Servicio→Ítem
│   │   │   ├── EmployeeSection.tsx            # Empleados seleccionados + selector
│   │   │   ├── EquipmentSection.tsx           # Equipos seleccionados + selector
│   │   │   ├── ScheduleSection.tsx            # Jornada, horarios, estado, descripción
│   │   │   └── schema.ts                     # Zod schema + FormValues type
│   │   ├── EmployeeSelector/                  # Dialog con DataTable server-side
│   │   │   ├── EmployeeSelectorDialog.tsx
│   │   │   ├── _EmployeeSelectorDataTable.tsx
│   │   │   ├── columns.tsx
│   │   │   └── actions.server.ts
│   │   ├── EquipmentSelector/                 # Dialog con DataTable server-side
│   │   │   ├── EquipmentSelectorDialog.tsx
│   │   │   ├── _EquipmentSelectorDataTable.tsx
│   │   │   ├── columns.tsx
│   │   │   └── actions.server.ts
│   │   ├── BulkEditModal.tsx
│   │   ├── CloneRowsDialog.tsx
│   │   ├── DeleteRowDialog.tsx
│   │   ├── HistoryDialog.tsx
│   │   ├── ServiceDetailDialog.tsx
│   │   └── RemitosManager/
│   │       ├── RemitosManagerDialog.tsx
│   │       ├── AddRemitDialog.tsx
│   │       ├── LinkRemitDialog.tsx
│   │       └── actions.server.ts
│   ├── hooks/
│   │   └── useDailyReportDetail.ts            # queryKey + invalidación centralizada
│   ├── types/
│   │   └── index.ts                           # Tipos inferidos de server actions
│   └── fallback/
│       ├── DailyReportHeaderSkeleton.tsx      # Skeleton atómico del header
│       └── DailyReportDetailSkeleton.tsx      # Skeleton atómico de la tabla
├── store/
│   └── dailyReportFormStore.ts                # Simplificado: isOpen + editingRowId
```

## Vercel React Best Practices Aplicadas

### `async-suspense-boundaries` — Suspense Atómico

El header y la tabla son independientes. NO se bloquean mutuamente. Cada uno tiene su propio Suspense boundary con skeleton dedicado:

```tsx
// page.tsx [thin] — NO hace await de nada, solo compone
function Page({ params, searchParams }) {
  return (
    <div className="mx-6 mt-4 space-y-6">
      <Suspense fallback={<DailyReportHeaderSkeleton />}>
        <DailyReportHeader uuid={params.uuid} /> {/* async, fetches own data */}
      </Suspense>
      <Suspense fallback={<DailyReportDetailSkeleton />}>
        <DailyReportDetailTable uuid={params.uuid} searchParams={searchParams} /> {/* async, fetches own data */}
      </Suspense>
    </div>
  );
}
```

El header renderiza en ~50ms (query ligera: status + fecha). La tabla puede tardar más — el usuario ve el header inmediatamente mientras la tabla hace streaming.

### `server-parallel-fetching` — Cada Server Component fetcha sus propios datos

NO centralizar fetching en un componente padre. Cada Server Component async es responsable de sus propias queries:

- `DailyReportHeader` → `getDailyReportHeader(uuid)` + `checkPermissionServer('update')`
- `DailyReportDetailTable` (Server) → `getDailyReportDetailPaginated(uuid, searchParams)` + `getTablePreferences(TABLE_ID)` + `checkPermissionServer('update')` (via `Promise.all`)

React los ejecuta en paralelo automáticamente porque son siblings en el tree.

### `bundle-dynamic-imports` — Modales pesados lazy-loaded

Los modales solo se renderizan cuando el usuario los abre. Usar `next/dynamic` para excluirlos del bundle inicial:

```tsx
const DailyReportRowForm = dynamic(() => import('./DailyReportRowForm'), { ssr: false });
const HistoryDialog = dynamic(() => import('./HistoryDialog'), { ssr: false });
const RemitosManagerDialog = dynamic(() => import('./RemitosManager/RemitosManagerDialog'), { ssr: false });
const CloneRowsDialog = dynamic(() => import('./CloneRowsDialog'), { ssr: false });
```

Modales livianos (DeleteRowDialog, ServiceDetailDialog, BulkEditModal) se importan normalmente — su peso no justifica code-splitting.

### `server-serialization` — Minimizar datos en la frontera Server→Client

Los `select` de Prisma ya limitan los campos. Regla adicional: en el Server Component, NO pasar el objeto completo de permisos. Pasar solo los booleans que el Client necesita:

```tsx
// Server Component
const canUpdate = await checkPermissionServer('operaciones', 'detalle-parte-diario', 'update');
const canDelete = await checkPermissionServer('operaciones', 'detalle-parte-diario', 'delete');
// Pasar solo 2 booleans, no el mapa completo de permisos
<_DailyReportDetailDataTable canUpdate={canUpdate} canDelete={canDelete} ... />
```

### `async-parallel` — Promise.all para queries independientes dentro de un mismo componente

Dentro de `DailyReportDetailTable` (Server Component):

```tsx
const [{ data, total }, preferences] = await Promise.all([
  getDailyReportDetailPaginated(uuid, tableSearchParams),
  getTablePreferences(TABLE_ID),
]);
```

## Skeletons Atómicos

Cada Suspense boundary tiene su propio skeleton dedicado que simula la UI real:

| Skeleton                    | Simula                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `DailyReportHeaderSkeleton` | Card con título placeholder + badge placeholder + fecha placeholder + botón back     |
| `DailyReportDetailSkeleton` | Card con toolbar placeholder (search + filter buttons) + tabla con 10 filas skeleton |

Ubicación: `detail/fallback/DailyReportHeaderSkeleton.tsx` y `detail/fallback/DailyReportDetailSkeleton.tsx`

## Jerarquía de Componentes (actualizada)

```
page.tsx [thin — NO async, solo compone con Suspense]
  │
  ├─ Suspense fallback={<DailyReportHeaderSkeleton />}
  │    └─ DailyReportHeader [SERVER async]
  │         ├─ getDailyReportHeader(uuid)
  │         ├─ checkPermissionServer('update')
  │         └─ Renders: Título + Badge estado + Fecha + BackButton + Crear (si permiso)
  │
  └─ Suspense fallback={<DailyReportDetailSkeleton />}
       └─ DailyReportDetailTable [SERVER async]
            ├─ Promise.all([getDailyReportDetailPaginated, getTablePreferences])
            ├─ checkPermissionServer('update'), checkPermissionServer('delete')
            │
            └─ Card > CardContent > _DailyReportDetailDataTable [CLIENT]
                 ├─ queryFn → getDailyReportDetailPaginated (client-side navigation)
                 ├─ facetedFilters con fetchFacet → getDailyReportDetailSingleFacet
                 ├─ exportConfig → getDailyReportDetailForExport(currentParams)
                 │
                 ├─ DailyReportRowForm (Sheet) [CLIENT, dynamic import]
                 │    ├─ CustomerServiceSection — cascada on-demand
                 │    ├─ EmployeeSection
                 │    │    └─ EmployeeSelectorDialog → _EmployeeSelectorDataTable
                 │    ├─ EquipmentSection
                 │    │    └─ EquipmentSelectorDialog → _EquipmentSelectorDataTable
                 │    └─ ScheduleSection
                 │
                 ├─ BulkEditModal [CLIENT]
                 ├─ CloneRowsDialog [CLIENT, dynamic import]
                 ├─ DeleteRowDialog [CLIENT]
                 ├─ HistoryDialog [CLIENT, dynamic import]
                 ├─ ServiceDetailDialog [CLIENT]
                 └─ RemitosManagerDialog [CLIENT, dynamic import]
```

## DataTables

Las 3 tablas se implementan delegando al agente `table-expert`. Aquí el spec de cada una.

### Tabla 1: Filas del Parte Diario (principal)

- **tableId**: `daily-report-detail`
- **paramNamespace**: `daily-report-detail`
- **Server-side**: `queryFn` + client-side navigation
- **Lazy-load facets**: `fetchFacet` con `getDailyReportDetailSingleFacet`
- **Export**: Con filtros activos via `currentParams`

Columnas: select, cliente (FK faceted), servicio (FK faceted), ítem (FK faceted), sector (FK faceted), área (FK nullable faceted), tipo servicio (enum nullable faceted), jornada (faceted), horario inicio (text), horario fin (text), estado (enum faceted con iconos), empleados (M:M faceted, badge con legajo), equipos (M:M faceted, badge), equipos cliente (M:M faceted), descripción (text), nro remito (text nullable), completado día (bool faceted), completado noche (bool faceted), desvíos (virtual visual, sin filtro), actions.

### Tabla 2: Selector de Empleados

- **tableId**: `employee-selector`
- **paramNamespace**: `emp-sel`
- **Server-side**: `queryFn` + client-side navigation
- **Lazy-load facets**: `fetchFacet` con `getEmployeeSelectorSingleFacet`
- **Sin export**
- **enableRowSelection**: true
- **Monta al abrir Dialog** — no precarga datos

Columnas: select, legajo (text), nombre completo (text, searchPlaceholder), CUIL (text), documento (text), sector/hierarchy (FK faceted), puesto/company_positions (FK faceted), diagrama/work_diagram (FK faceted), afectaciones M:M (faceted), aptitudes M:M (faceted), estado doc (faceted), provincia (FK faceted).

Comportamiento: filas ya seleccionadas → checkbox disabled. Badge "No asignado" si no afectado al cliente del form. Badge desvío diagrama.

### Tabla 3: Selector de Equipos

- **tableId**: `equipment-selector`
- **paramNamespace**: `eq-sel`
- **Server-side**: `queryFn` + client-side navigation
- **Lazy-load facets**: `fetchFacet` con `getEquipmentSelectorSingleFacet`
- **Sin export**
- **enableRowSelection**: true
- **Monta al abrir Dialog** — no precarga datos

Columnas: select, dominio (text), nro interno (text, searchPlaceholder), tipo (FK faceted), sub tipo (FK faceted), estado (faceted), condición (faceted con iconos), marca (FK faceted), modelo (FK faceted), año (text), afectado a M:M (faceted), kilómetros (text).

Comportamiento: filas ya seleccionadas → checkbox disabled. Badge "No asignado" si no afectado al cliente del form.

## Modales

| Modal                | Tipo        | Cambios clave                                                                                                                                |
| -------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| DailyReportRowForm   | Sheet       | Descompuesto en 5 sub-componentes. Store simplificado (isOpen + editingRowId). Cascada on-demand. Prisma $transaction para crear/actualizar. |
| BulkEditModal        | Dialog      | Tipos nuevos inferidos. Server action `bulkUpdateRowStatus`. Sin import legacy.                                                              |
| CloneRowsDialog      | Dialog      | Server action `cloneDailyReportRows` con transacción. Recibe IDs seleccionados.                                                              |
| DeleteRowDialog      | AlertDialog | Server action `deleteDailyReportRow`. Revert preparte en misma transacción.                                                                  |
| HistoryDialog        | Dialog      | Prisma query directa. Sin setTimeout. Skeleton mientras carga.                                                                               |
| ServiceDetailDialog  | Dialog      | Read-only. Solo limpieza de tipos.                                                                                                           |
| RemitosManagerDialog | Dialog      | CRUD migrado a server actions. Solo upload queda client-side.                                                                                |

## Performance: Antes vs Después

| Métrica                              | Antes                                                  | Después                                                                                   |
| ------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Render inicial (first paint)         | Bloqueado hasta que TODAS las queries SSR completan    | Header se muestra inmediatamente (Suspense atómico), tabla hace streaming                 |
| Queries al cargar página             | 4 paralelas (filas + emp + equip + RPC) + 1 SSR pesada | 2 Server Components paralelos: header (1 query ligera) + tabla (1 query Prisma con JOINs) |
| Datos precargados                    | TODOS los empleados + equipos activos                  | Nada. On-demand al abrir selectores                                                       |
| Facets                               | 10 RPCs al cargar                                      | Lazy: 1 query por facet al abrir popover                                                  |
| SSR pesada (getDailyReportById)      | Carga todo, se ignora casi todo                        | Eliminada. Solo getDailyReportHeader                                                      |
| Bundle inicial                       | Todos los modales importados estáticamente             | Modales pesados con `next/dynamic` (Sheet, History, Remitos, Clone)                       |
| History setTimeout                   | 1500ms hardcoded                                       | Eliminado. Query directa post-mutación                                                    |
| Transformación de datos              | Client-side (transformDailyReports)                    | Datos formateados desde server                                                            |
| Cascada form (Cliente→Servicio→Ítem) | Precargada completa                                    | On-demand con `enabled`                                                                   |
| Export                               | Sin filtros activos                                    | Respeta filtros via currentParams                                                         |
| Persistencia tabla                   | Cookies                                                | BD (getTablePreferences)                                                                  |
| Serialización Server→Client          | Objeto completo de permisos + datos sin filtrar        | Solo booleans de permisos + datos con `select` preciso                                    |

## Archivos a Eliminar

| Archivo                                              | Razón                                             |
| ---------------------------------------------------- | ------------------------------------------------- |
| `components/DayliReportDetailTable.tsx`              | Legacy, reemplazado                               |
| `components/DayliReportDetailTableServer.tsx`        | Reemplazado por `_DailyReportDetailDataTable.tsx` |
| `components/DayliReportDetailTableServerWrapper.tsx` | Reemplazado por `DailyReportDetail.tsx`           |
| `components/DayliReportDetailTableWrapper.tsx`       | Legacy no usado                                   |
| `components/SearchEmployee.tsx`                      | Reemplazado por `EmployeeSelector/`               |
| `components/SearchEquipment.tsx`                     | Reemplazado por `EquipmentSelector/`              |
| `components/data-equipment-diagrams.tsx`             | Reemplazado por `EquipmentSelector/`              |
| `components/equipment-diagram-colum.tsx`             | Reemplazado por `EquipmentSelector/columns.tsx`   |
| `components/DailyReportRowForm.tsx` (monolítico)     | Reemplazado por `DailyReportRowForm/`             |
| `components/ClonarRegistrosButton.tsx`               | Reemplazado por `CloneRowsDialog.tsx`             |
| `components/DeleteConfirmationModal.tsx`             | Reemplazado por `DeleteRowDialog.tsx`             |
| `components/HistoryModal.tsx`                        | Reemplazado por `HistoryDialog.tsx`               |
| `components/ServiceDetailModal.tsx`                  | Reemplazado por `ServiceDetailDialog.tsx`         |
| `components/BulkEditModal.tsx`                       | Reemplazado por nueva versión en `detail/`        |
| `components/DocumentUploadModal.tsx`                 | Funcionalidad integrada en RemitosManager         |
| `hooks/useDailyReportDetailData.ts`                  | Reemplazado por queryFn del DataTable             |
| `hooks/useFormData.ts`                               | Eliminado — datos on-demand                       |
| `hooks/useValidationData.ts`                         | Eliminado — desvíos en JOIN                       |
| `actions/actionsClient.ts`                           | Migrado a server actions                          |
| `actions/server-actions.ts`                          | Consolidado en `detail/actions.server.ts`         |
| `types/daily-report-server.ts`                       | Consolidado en `detail/types/index.ts`            |

## Notas de Implementación

- Todas las tablas se delegan al agente `table-expert` que sigue su propio checklist
- Usar `/frontend-design` para el layout del header y disposición general
- Usar `/vercel-react-best-practices` para patrones de React/Next.js
- El store Zustand se simplifica a: `{ isOpen, editingRowId, open(rowId?), close() }`
- Los tipos se infieren de las server actions con `Awaited<ReturnType<typeof fn>>` — nunca manuales
- Logger con scope `features/Operaciones/PartesDiarios/detail` en todas las server actions
- `file_number` (legajo) visible en celda de empleados y en selector
