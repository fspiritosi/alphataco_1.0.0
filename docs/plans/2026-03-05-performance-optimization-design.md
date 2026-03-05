# Performance Optimization — Design Document

**Fecha:** 2026-03-05
**Branch:** `feat/performance-optimization`
**Estado:** En progreso

---

## Objetivo

Optimizar el rendimiento completo de la aplicacion GH Gestion a nivel MACRO (infraestructura, routing, bundle) y MICRO (queries, componentes, re-renders) sin alterar funcionalidad existente. Los usuarios reportan lentitud especialmente en tablas de datos con paginacion server-side.

## Inventario del Proyecto

| Recurso                                     | Cantidad                                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| DataTables (sistema nuevo Prisma)           | 21                                                                                                 |
| Pages en dashboard                          | 29                                                                                                 |
| Server actions de tabla (actions.server.ts) | 21 archivos (~63 funciones)                                                                        |
| Server actions con `'use cache'`            | 9 archivos                                                                                         |
| Loading.tsx                                 | 36                                                                                                 |
| Modulos principales                         | 8 (Employees, Equipos, Documentacion, Empresa, Formularios, Operaciones, Mantenimiento, Comercial) |

## Prioridades del Usuario

1. **Mantenimiento** (8 tablas) — reportado como mas lento
2. **Empleados** (1 tabla con 42 queries de facets)
3. **Equipos** (4 tablas)
4. Resto de tablas y pages

## Decisiones de Diseno

| Decision              | Eleccion                                                     | Razon                                           |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| Estructura del agente | Unico multi-modo (AUDIT/FIX/MEASURE/COMPARE/SCAN)            | Contexto fluye entre modos sin coordinacion     |
| Autonomia             | Auditar primero, esperar aprobacion                          | El usuario quiere control sobre los cambios     |
| Mediciones            | Analisis estatico siempre + chrome-devtools bajo peticion    | Balance entre velocidad y precision             |
| Cambios en DB         | Permitidos con migracion controlada                          | Indices, denormalizacion, vistas materializadas |
| moment.js             | Se mantiene (regla del proyecto)                             | No se toca                                      |
| ExcelJS               | Se mantiene como import estatico                             | Decisión del usuario                            |
| Documentacion         | SIEMPRE consultar Context7 y Vercel MCP antes de implementar | Asegurar patrones actualizados                  |

## 7 Capas de Analisis

| Capa                        | Que analiza                                      | Herramientas                                          |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| 1. Infraestructura          | next.config, middleware, headers, compresion     | Vercel best practices, Context7                       |
| 2. Routing & Loading        | layout.tsx, loading.tsx, page.tsx, Suspense      | async-suspense-boundaries, server-parallel-fetching   |
| 3. Bundle & Imports         | Imports pesados, barrel files, dynamic imports   | bundle-barrel-imports, bundle-dynamic-imports         |
| 4. Server Components & Data | Server actions, RSC, streaming, cache            | server-cache-react, server-dedup-props, Prisma expert |
| 5. Client Components        | Re-renders, estado, memoizacion, hooks           | rerender-_, rendering-_ rules                         |
| 6. Queries & DB             | Prisma queries, indices, facets, denormalizacion | Prisma expert, raw SQL, indices                       |
| 7. UX & Perceived Perf      | Skeletons, transitions, optimistic updates       | rerender-transitions, rendering-usetransition-loading |

## Plan de Fases

### Fase 0 — Quick Wins Globales (componente DataTable compartido)

Cambios que benefician a las 21 tablas de golpe:

- Remover getFacetedRowModel/getFacetedUniqueValues innecesarios del DataTable.tsx
- Memoizar filterableColumns en DataTable.tsx
- Estabilizar updateURL con useRef en useDataTable.ts
- Simplificar saveTableColumnVisibility a 1 upsert
- Agregar spinner overlay durante isPending
- Centralizar toFacetMap en helpers.ts

### Fase 1 — Tablas de Mantenimiento (8 tablas)

1. Solicitudes de mantenimiento (repairlogs scan completo)
2. Ordenes de mantenimiento (nesting 4 niveles)
3. Gestion de ordenes (wizard + catalogos)
4. Workshop tracking
5. Pedidos pendientes
6. Pedidos confirmados
7. Para taller (operaciones)
8. Pendientes ejecutar

### Fase 2 — Tablas de Empleados y Equipos (5 tablas)

1. Empleados activos (42 queries de facets → cache/raw SQL)
2. Vehiculos activos (24 queries de facets)
3. Otros equipos activos (25 queries de facets)
4. Vehiculos dados de baja
5. Otros equipos dados de baja

### Fase 3 — Resto de Tablas (8 tablas)

- Documentacion empleados permanentes/mensuales
- Documentacion equipos permanentes/mensuales
- Formularios y respuestas de checklist
- Partes diarios
- Usuarios

### Fase 4 — Pages & Routing

- Optimizar page.tsx, layouts, loading.tsx
- Suspense boundaries adecuados
- Parallel fetching a nivel de pagina
- Eliminar waterfalls de datos

### Fase 5 — Bundle & Infraestructura

- Dynamic imports para componentes pesados
- Barrel file cleanup
- Cache headers en next.config
- Middleware optimization

## Hallazgos Iniciales (del audit preliminar)

### CRITICAL

1. Facets M:M hacen 3-4 queries secuenciales (vehicles, equipment, employees)
2. Employees: 42+ queries por request de facets
3. RepairSolicitudes: scan completo de repairlogs (potencialmente 50k+ rows)

### HIGH

4. RepairSolicitudes: select carga TODOS los logs de cada solicitud
5. MaintenanceOrders: nesting de 4 niveles en select
6. getFacetedRowModel/getFacetedUniqueValues calculan facets locales innecesarios
7. filterableColumns se recalcula sin useMemo en cada render
8. updateURL se recrea en cada cambio de URL (cascada de re-renders)

### MEDIUM

9. saveTableColumnVisibility hace 2 queries (findUnique + upsert)
10. Facets no usan initialData del servidor (22 de 23 tablas)
11. toFacetMap duplicado en 7+ archivos
12. Triple parseSearchParams por tabla
13. Opacity-50 sin spinner durante navegacion

### LOW

14. Export no deshabilita UI durante proceso
