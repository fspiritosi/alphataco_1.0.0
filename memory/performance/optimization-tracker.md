# Performance Optimization Tracker

**Iniciado:** 2026-03-05
**Branch:** `feat/performance-optimization`

## Fase Actual: Fase 0 — Quick Wins Globales

## Estado de Tablas (21 total)

### Mantenimiento (Fase 1 — Prioridad Maxima)

| #   | Tabla                                   | Estado    | Ultimo audit | Issues                           |
| --- | --------------------------------------- | --------- | ------------ | -------------------------------- |
| 1   | maintenance_requests (Solicitudes)      | pendiente | -            | repairlogs scan, select agresivo |
| 2   | maintenance_orders (Ordenes)            | pendiente | -            | nesting 4 niveles, tiene cache   |
| 3   | order_management (Gestion ordenes)      | pendiente | -            | sin Card wrapper, catalogos SSR  |
| 4   | workshop_tracking                       | pendiente | -            | -                                |
| 5   | pending_orders (Pedidos pendientes)     | pendiente | -            | -                                |
| 6   | confirmed_orders (Pedidos confirmados)  | pendiente | -            | -                                |
| 7   | for_workshop (Para taller)              | pendiente | -            | -                                |
| 8   | pending_execution (Pendientes ejecutar) | pendiente | -            | -                                |

### Empleados (Fase 2)

| #   | Tabla               | Estado    | Ultimo audit | Issues                            |
| --- | ------------------- | --------- | ------------ | --------------------------------- |
| 9   | employees (Activos) | pendiente | -            | 42 queries facets, M:M secuencial |

### Equipos (Fase 2)

| #   | Tabla                                    | Estado    | Ultimo audit | Issues                            |
| --- | ---------------------------------------- | --------- | ------------ | --------------------------------- |
| 10  | vehicles (Activos)                       | pendiente | -            | 24 queries facets, M:M secuencial |
| 11  | other_equipment (Activos)                | pendiente | -            | 25 queries facets, M:M secuencial |
| 12  | inactive_vehicles (Dados de baja)        | pendiente | -            | -                                 |
| 13  | inactive_other_equipment (Dados de baja) | pendiente | -            | -                                 |

### Documentacion (Fase 3)

| #   | Tabla                    | Estado    | Ultimo audit | Issues |
| --- | ------------------------ | --------- | ------------ | ------ |
| 14  | employee_permanent_docs  | pendiente | -            | -      |
| 15  | employee_monthly_docs    | pendiente | -            | -      |
| 16  | equipment_permanent_docs | pendiente | -            | -      |
| 17  | equipment_monthly_docs   | pendiente | -            | -      |

### Otros (Fase 3)

| #   | Tabla             | Estado    | Ultimo audit | Issues           |
| --- | ----------------- | --------- | ------------ | ---------------- |
| 18  | forms             | pendiente | -            | -                |
| 19  | checklist_answers | pendiente | -            | -                |
| 20  | daily_reports     | pendiente | -            | sin Card wrapper |
| 21  | users             | pendiente | -            | tiene cache      |

## Estado de Pages (principales)

| Page                   | Estado    | Ultimo audit | Issues               |
| ---------------------- | --------- | ------------ | -------------------- |
| /dashboard/maintenance | pendiente | -            | 8 tablas, mas pesada |
| /dashboard/employee    | pendiente | -            | -                    |
| /dashboard/equipment   | pendiente | -            | -                    |
| /dashboard/document    | pendiente | -            | -                    |
| /dashboard/forms       | pendiente | -            | -                    |
| /dashboard/operations  | pendiente | -            | -                    |
| /dashboard/company     | pendiente | -            | -                    |
| /dashboard             | pendiente | -            | -                    |

## Optimizaciones Globales

### Fase 0 — Quick Wins (componente DataTable compartido)

- [ ] Remover getFacetedRowModel/getFacetedUniqueValues de DataTable.tsx
- [ ] Memoizar filterableColumns en DataTable.tsx
- [ ] Estabilizar updateURL con useRef en useDataTable.ts
- [ ] Simplificar saveTableColumnVisibility a 1 upsert
- [ ] Agregar spinner overlay durante isPending en DataTable.tsx
- [ ] Centralizar toFacetMap en helpers.ts

### Pendientes para Fase 4+

- [ ] Audit de loading.tsx (36 archivos)
- [ ] Audit de barrel imports
- [ ] Audit de dynamic imports
- [ ] Audit de Suspense boundaries
- [ ] Audit global de 'use cache'

## Historial de Cambios

| Fecha      | Entidad | Cambio                     | Impacto |
| ---------- | ------- | -------------------------- | ------- |
| 2026-03-05 | -       | Creacion del agente y plan | -       |
