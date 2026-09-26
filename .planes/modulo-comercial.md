# Módulo Comercial (tsk-745)

**Fecha de inicio:** 2026-09-26
**Estado:** Análisis completado — bloqueantes respondidos, listo para planificar

---

## 1. Análisis

### 1.1 Problema

El ticket tsk-745 ("Modulo Comercial", proyecto Alphataco, estado Pendiente) pide **rehacer el módulo Comercial**. Es la única fuente: el ticket no tiene `analysis_notes`, ni `acceptance_criteria`, ni comentarios, ni adjuntos. El texto plantea cinco puntos, de los cuales tres son pedidos concretos y dos son decisiones de diseño explícitamente abiertas.

**Punto 1 — Áreas, sectores y equipos del cliente están fuera del cliente.**
> "áreas, sectores y equipos (los del cliente) son datos que estan asociados exclusivamente a un cliente, por lo que no tiene sentido que se encuentre fuera del cliente. Antes de modificar, revisar la lógica que tiene esto con operaciones por las dudas."

Hoy son tres subtabs de primer nivel del módulo Comercial, cada una con su propia tabla global de "todos los X de todos los clientes" (`ComerceTabContent.tsx:43-90`). La segunda frase es la parte crítica: Operaciones (partes diarios y prepartes) consume esas tres entidades de forma intensiva y **no directamente, sino a través de las pivotes contrato↔área y contrato↔sector**.

**Punto 2 — Contratos: decisión abierta.**
> "Contratos también son exclusivos de un cliente. revisar si lo metemos dentro del detalle del cliente o lo mantenemos aparte (solo visualización)"

El ticket **no decide**. Y hay un dato que cambia la pregunta: la ficha del cliente **ya tiene** una pestaña "Contratos" funcional y con permisos (`CustomerDetail.tsx:84-98`), así que lo que está duplicado es la tab de primer nivel, no lo que falta.

**Punto 3 — Partes diarios / certificación.**
> "Partes diarios: Esta sección tenía como objetivo poder crear una certificación de todo lo trabajado por la empresa, por cliente, por contrato, dentro de un período de tiempo."

El verbo en pasado ("tenía como objetivo") es exacto: hoy la pantalla es un **tablero de consulta con filtros + cambio de estado masivo + export a Excel**, no un generador de certificaciones. No existe ninguna entidad "certificación".

**Punto 4 — Los valores deberían estar en los ítems de los contratos.**
> "Los valores deberían estar dentro de los items de los contratos."

**Esto ya existe**: `service_items.item_price` es `Decimal` y se administra desde el form de ítems del contrato. Lo que no existe es su **uso**: ningún parte diario ni ninguna vista de certificación lee ese precio.

**Punto 5 — Versionado de precios: diseño sin definir.**
> "Justamente a esos items, se los tiene que poder revisionar con el tiempo e ir actualizando, se debe guardar el valor anterior, la fecha de actualización, etc. Las formas de actualizar un precio pueden ser varias, tenemos que pensar como vamos a resolver este punto para que sea adaptable a cada empresa y a cada contrato"

"Tenemos que pensar cómo vamos a resolver este punto" es una declaración explícita de que **el diseño no está definido**. Este es el punto de mayor incertidumbre funcional del ticket.

**Respuesta a la pregunta central del análisis: ¿el sistema hoy tiene precios?**
Sí, pero aislados y sin consumidor. Hay exactamente **un** campo monetario en el dominio comercial (`service_items.item_price`), se carga por formulario, se muestra en dos lugares como texto (`${item.item_price}`) y **nadie lo multiplica por nada**. Toda la valorización, la certificación y el versionado son **nuevos**.

---

### 1.2 Contexto actual

#### 1.2.1 El repo está sobre una base no consolidada

`git status --porcelain | wc -l` → **292 archivos sin commitear**, de una refactorización grande y reciente (sidebar `sidebar-07`, eliminación de la barra de tabs de primer nivel, rename Empresa→Configuración, módulo nuevo Selección). Entre esos 292 hay **archivos que este ticket va a tocar de lleno**:

```
 M src/features/Comercial/ComercialComponent.tsx
 M src/features/Empresa/Clientes/components/CustomerComponent.tsx
 M src/features/Empresa/Clientes/components/CustomerDetail/AssignmentDialog.tsx
 M src/features/Empresa/Clientes/components/CustomerDetail/CustomerDetailTab.tsx
 M src/features/Empresa/Clientes/components/CustomerForm.tsx
 M src/features/Empresa/Clientes/components/CustomersList.tsx
 M src/features/Empresa/Clientes/components/Services/ServiceItemsForm.tsx
 M src/features/Empresa/Clientes/components/Services/ServiceItemsTable.tsx
 M src/features/Empresa/Clientes/components/Services/ServiceTable.tsx
 M src/features/Empresa/Clientes/components/Services/ServicesForm.tsx
 M src/features/Empresa/Clientes/components/area_clientes/areaForm.tsx
 M src/features/Empresa/Clientes/components/equipos/customerEquipmentForm.tsx
 M src/features/Empresa/Clientes/components/sector_clientes/sectorForm.tsx
 M src/features/Operaciones/OperacionesComponent.tsx
 M src/features/Permissions/permissions-map.ts
```

#### 1.2.2 Qué monta hoy el módulo Comercial

| Capa | Archivo | Qué hace |
|---|---|---|
| Ruta | `src/app/dashboard/comercial/page.tsx:24-31` | Page delgada; resuelve `searchParams` y delega |
| Módulo | `src/features/Comercial/ComercialComponent.tsx:16-35` | **Una sola** sección vía `SectionManagerServer`, `defaultTab="comerce"` |
| Sección | `src/features/Comercial/Comerce/ComerceTabContent.tsx:21-140` | `TabsManagerServer` con `paramName="subtab"`, 7 subtabs |
| Navegación | `src/features/Layout/sidebar/constants/navigation.ts` (entrada "Comercial", `position: 5`) | Sin `items`: el comentario del archivo dice que se omiten en los módulos de una sola tab |
| Permisos | `src/features/Permissions/permissions-map.ts:1143-1250` | módulo `comercial`, `moduleId: 92bfac14-dc5b-41be-b366-740bfbeaea13`, tab `comerce` + 7 subtabs |

Las 7 subtabs de `comerce` (URL `/dashboard/comercial?tab=comerce&subtab=<slug>`):

| `subtab` | Label | Wrapper | Componente real |
|---|---|---|---|
| `customers` (default) | Clientes | `DataCustomersWrapper.tsx` | `Empresa/Clientes/components/CustomersPanel.tsx` |
| `areas` | Áreas | `CustomerTabWrapper.tsx` | `Empresa/Clientes/components/customerTab.tsx` → `area_clientes/areaTable.tsx` |
| `equipment` | Equipos | `CustomerEquipmentTabWrapper.tsx` | `Empresa/Clientes/components/equipos/customerEquipmentTab.tsx` |
| `sector` | Sectores | `SectorTabsWrapper.tsx` | `Empresa/Clientes/components/sector_clientes/sectorTabs.tsx` |
| `service` | Contratos | `ServiceComponentWrapper.tsx` | `Empresa/Clientes/components/Services/ServiceComponent.tsx` |
| `mensure_units` | Unidades de Medida | `MensureUnitsWrapper.tsx` | `Empresa/Clientes/components/meansure_units/MensureUnitsTab.tsx` |
| `daily_reports` | Partes Diarios | `DailyReportWrapper.tsx` (697 líneas, `'use client'`) | `Operaciones/Certificacion/*` |

**Hecho estructural clave: `features/Comercial/` es sólo una carpeta de wrappers.** Todo el código real vive en `src/features/Empresa/Clientes/` (57 archivos) y en `src/features/Operaciones/Certificacion/` (22 archivos). El único archivo con lógica propia en Comercial es `actions/location-actions.ts` (provincias). Rehacer "el módulo Comercial" significa, en la práctica, rehacer `Empresa/Clientes` y la parte comercial de `Operaciones`.

#### 1.2.3 Áreas, sectores y equipos: qué está asociado al cliente y qué no

| Modelo | Línea en `prisma/schema.prisma` | ¿FK a `customers`? | Tenencia |
|---|---|---|---|
| `areas_cliente` | `:64-75` | **Sí**, `customer_id @db.Uuid` NOT NULL, `onDelete: Cascade` | Por el cliente |
| `equipos_clientes` | `:1220-1232` | **Sí**, `customer_id` NOT NULL, `onDelete: NoAction` | Por el cliente |
| `sector_customer` | `:2150-2161` | **Sí** (pivote), `@@unique([sector_id, customer_id])` | Por el cliente |
| `sectors` | `:2178-2188` | **NO.** Sin `customer_id` **ni** `company_id` | **Tabla global** |
| `customer_services` (= contrato) | `:712-732` | **Sí**, `customer_id` nullable + `company_id` nullable | Por el cliente |
| `service_areas` | `:2190-2202` | No directa: pivote `customer_services`↔`areas_cliente` | Por el contrato |
| `service_sectors` | `:2228-2241` | No directa: pivote `customer_services`↔`sectors` | Por el contrato |
| `service_items` | `:2204-2226` | No: cuelga de `customer_service_id` + `company_id` NOT NULL | Por el contrato |
| `measure_units` | `:1642-1650` | **NO.** Sin `company_id` | **Catálogo global** |
| `assing_customer` | `:77-88` | Tiene `customer_id` pero **sin relación declarada** a `customers` | **Tabla muerta** (ver abajo) |
| `area_province` | `:53-62` | Pivote `areas_cliente`↔`provinces` | Por el área |

**`assing_customer` no tiene ningún consumidor.** `grep -rn "assing_customer" src/ --include="*.ts" --include="*.tsx" | grep -v "^src/generated"` devuelve **vacío**. Sólo existe en `prisma/schema.prisma:77` (modelo) + las back-relations en `employees` (`:1137`) y `vehicles` (`:2520`), y en `prisma/migrations/0_init/migration.sql`. No hay triggers ni SQL crudo que la toquen. La funcionalidad equivalente (afectación empleado/equipo ↔ cliente) vive en `contractor_employee` y `contractor_equipment`. Es candidata a `DROP TABLE`, pero el ticket no la menciona (`CLAUDE.md:455`).

**El caso `sectors` es el que rompe la premisa del ticket.** El ticket dice "sectores […] son datos que estan asociados exclusivamente a un cliente". A nivel esquema **no lo son**: `sectors` es una tabla global y la pertenencia se resuelve por la pivote. El código lo documenta y lo asume explícitamente:

- `src/features/Empresa/Clientes/actions/sectors.server.ts:16-19`: *"Sectores (`sectors`) no tienen `company_id`: pertenecen a la empresa a través de `sector_customer → customers`. Un sector sin clientes no es visible para nadie."*
- `src/features/Empresa/Clientes/actions/sectors.server.ts:89-90`: *"Sólo los vínculos con clientes de la empresa activa: **un sector puede estar compartido con otras empresas** y esos vínculos no se tocan (ni entran en el diff ni en el deleteMany)."*

O sea: un mismo `sectors` puede estar vinculado a N clientes y a N empresas. Un sector compartido puede tener el mismo nombre para dos clientes distintos y hoy es **una sola fila**.

Ni `sectors` ni `measure_units` figuran en el relevamiento de "Tablas sin company_id (decisión multi-tenant pendiente)" de `docs/superpowers/plans/2026-09-18-plan-maestro-deuda-tecnica.md:602-631`, así que esa deuda está sin registrar.

**Dónde se administran hoy:**

| Entidad | Pantalla de administración | Server actions |
|---|---|---|
| Áreas | Comercial → Áreas (`areaTable.tsx` + `areaForm.tsx`) | `Empresa/Clientes/actions/areas.server.ts` |
| Sectores | Comercial → Sectores (`sectorTabs.tsx` + `sectorTable.tsx` + `sectorForm.tsx`) | `Empresa/Clientes/actions/sectors.server.ts` |
| Equipos de cliente | Comercial → Equipos (`equipos/customerEquipmentTab.tsx`) **y** ficha del cliente → pestaña "Equipos" (`CustomerDetail/CustomerEquipmentTab.tsx`) | `Empresa/Clientes/actions/customer-equipment.server.ts` |
| Contratos | Comercial → Contratos (`Services/ServiceComponent.tsx`) **y** ficha del cliente → pestaña "Contratos" (`CustomerDetail/CustomerContractsTab.tsx`) | `Empresa/Clientes/actions/services.server.ts` |
| Ítems de contrato | dentro de `ServiceTable` / `ServiceItemsSection` + ruta `/dashboard/configuration/services/[id]` | `Empresa/Clientes/actions/service-items.server.ts` |
| Unidades de medida | Comercial → Unidades de Medida | `Empresa/Clientes/actions/measure-units.server.ts` |

**Buena parte del punto 1 y del punto 2 ya está hecha.** `DataCustomersWrapper.tsx:23-29` carga `customers` + `areas` + `sectors` + `services` + `measureUnits` en un solo `Promise.all` y se los pasa a `CustomersPanel`, que al seleccionar una fila muestra `CustomerDetail`. La ficha del cliente ya tiene cuatro pestañas: Detalle / Empleados / Equipos / **Contratos** (`CustomerDetail.tsx:56-99`), y la de Contratos monta el `ServiceTable` completo con áreas, sectores y unidades de medida. Lo que **no** está en la ficha es la administración de **áreas** y de **sectores** como pestañas propias.

Detalle de permisos a tener presente: la pestaña "Contratos" de la ficha **hereda** el permiso `comercial:service:view` en vez de tener su propio slug, y eso está documentado como decisión en el mapa:

- `src/features/Permissions/permissions-map.ts:1183-1185`: *"`'contratos-cliente'`: HEREDA permisos de `'comercial/comerce/service'`. Esta tab no debe estar aquí porque hereda permisos de la tab Contratos/Servicios."*
- Se materializa con `<PermissionGuard module="comercial" tab="service" action="view">` en `CustomerDetail.tsx:62` y `:84`.

#### 1.2.4 La relación real con Operaciones (el punto de mayor riesgo)

El ticket pide explícitamente "revisar la lógica que tiene esto con operaciones por las dudas". Lo que aparece es un acoplamiento fuerte y **no obvio**: **los partes diarios y los prepartes no apuntan al área ni al sector del cliente; apuntan a las pivotes contrato↔área y contrato↔sector.**

`dailyreportrows` (`prisma/schema.prisma:837-880`):

| Columna | FK | Apunta a |
|---|---|---|
| `customer_id` | `public_dailyreportrows_customer_id_fkey` | `customers.id` |
| `service_id` | → `customer_services` | el contrato |
| `item_id` | `public_dailyreportrows_item_id_fkey` | **`service_items.id`** |
| `areas_service_id` | → `service_areas` | **`service_areas.id`**, no `areas_cliente.id` |
| `sector_service_id` | → `service_sectors` | **`service_sectors.id`**, no `sectors.id` |

`dailyreport_customer_equipment_relations` (`:796-806`): `customer_equipment_id` → `equipos_clientes.id`, `onDelete: Cascade`.

`preparte` (`:1800-1854`): `cliente_id` → `customers`, `contrato_id` → `customer_services`, `item` → `service_items`, `areas_service_id` → `service_areas`, `sector_service_id` → `service_sectors`, `equipos_cliente` → `equipos_clientes`. Consecuencia directa: `preparte.cliente_id` tiene `onDelete: SetDefault`, lo que es una bomba silenciosa aparte.

**El núcleo del acoplamiento es un solo archivo:** `src/features/Operaciones/PartesDiarios/detail/lib/row-query.ts`. Ahí viven, compartidos por el listado paginado, el export, los facets y el perímetro:

- `FK_SORT_MAP` (`:38-44`) — el ordenamiento de las columnas FK atraviesa las pivotes literalmente:
  ```ts
  customer: (dir) => ({ customers: { name: dir } }),
  service:  (dir) => ({ customer_services: { service_name: dir } }),
  item:     (dir) => ({ service_items: { item_name: dir } }),
  sector:   (dir) => ({ service_sectors: { sectors: { name: dir } } }),
  area:     (dir) => ({ service_areas: { areas_cliente: { descripcion_corta: dir } } }),
  ```
- `buildWhereClause` (`:86`) — filtra sector por `service_sectors.sectors.id` y área por `service_areas.areas_cliente.id`, con soporte de `NULL_FILTER_VALUE`, anclando siempre `dailyreport: { company_id }` (`:271`).
- `buildRowSelect` (`:296`) — el select completo con las cinco relaciones más las tres pivotes de recursos.
- `assertDailyReportInCompany` / `assertRowInCompany` / `filterRowsInCompany` / `assertRowResourcesInCompany` (`:452-547`) — todo el perímetro de empresa, que **no lo garantiza la base** (no hay RLS): está sólo en código, y **duplicado casi literalmente** en `PartesDiarios/actions/comercial-rows.server.ts:180-235` y `Preparte/actions/mutations.server.ts:56-101`. Tres copias de la misma validación.

Consumidores concretos en Operaciones:

- `src/features/Operaciones/Certificacion/actions/queries.server.ts:33-83` — `ROW_SELECT` del tablero comercial: trae `service_sectors → sectors`, `service_areas → areas_cliente`, `dailyreport_customer_equipment_relations → equipos_clientes`, `service_items` (**y de `service_items` selecciona sólo `id, item_name, item_description` — no `item_price`**).
- `src/features/Operaciones/PartesDiarios/detail/form-data.server.ts:24-70`, `:344-414` — `getCustomersForForm()`: el catálogo en cascada del formulario de línea de Operaciones. Lee además `service_items.needs_personnel` / `needs_equipment` (`:50-51`) para decidir si el form exige recursos.
- `src/features/Operaciones/PartesDiarios/actions/comercial-rows.server.ts:23-93` — `getCustomersForRowForm()`: la variante Comercial del mismo catálogo (incluye inactivos y `cuit`). **Sí trae `item_price`** y lo serializa a `number` (`:63`, `:83`), pero solo para no romper el pasaje al cliente; no se usa para calcular.
- `src/features/Operaciones/PartesDiarios/actions/comercial-rows.server.ts:177-220` — validación de pertenencia contra `service_sectors`, `service_areas`, `service_items` y `equipos_clientes`.
- `src/features/Operaciones/PartesDiarios/detail/mutations.server.ts:105-302` — `createRowRelations` / `updateDailyReportRowPrisma`: las tres pivotes de recursos se reconstruyen con `deleteMany` + `createMany` (`:296-302`).
- `src/features/Operaciones/Preparte/actions/actions.ts:22-38`, `:49`, `:111-121`, `:146-154`, `:181` — `fetchCustomersWithRelations()`, `fetchSectorsByContract()`, `fetchAreasByContract()`, `fetchEquipmentsByCustomer()`. Asimetría deliberada documentada en `:171`: **los equipos del cliente se filtran por cliente, no por contrato** (no hay `service_id`), mientras sectores y áreas van por contrato.
- `src/features/Operaciones/Preparte/actions/mutations.server.ts:128` (`buildSectorMap`) y `:146` (`buildAreaMap`) — **traducen lo que manda el form (que puede ser `sectors.id` o `areas_cliente.id`) al id de la pivote** antes de guardar (`:229-234`).
- `src/features/Operaciones/Preparte/actions/bulk.server.ts:145-195` — `confirmSinglePreparte()`: convierte el pedido en fila de parte diario. Hace `dailyreport.upsert` por `(date, company_id)` y copia `cliente_id → customer_id`, `contrato_id → service_id`, `item → item_id`, `sector_service_id`, `areas_service_id`, `jornada → working_day`, `tipo → type_service`, y si hay `equipos_cliente` crea la relación. **Verificado: NO copia `preparte.quantity` — porque `dailyreportrows` no tiene dónde ponerla. La cantidad pedida se pierde en la conversión.** (Ver R3.)
- `src/features/Operaciones/Preparte/list/actions.server.ts:87-89`, `:198-207`, `:382-390`, `:440-446` — select, `orderBy` y **facets** del listado de prepartes.
- `src/features/Operaciones/Preparte/list/columns.tsx:378-413` — columnas Cliente / Contrato / Sector / Área / Equipo del cliente.
- `src/features/Operaciones/Preparte/hooks/usePreparteFormOptions.ts` — `useContratos`, `useServiceItems`, `useSectors`, `useAreas`, `useEquipments` (React Query, `staleTime` 5 min).
- `src/features/Operaciones/Preparte/components/preparte-form/LocationSection.tsx:59-106`, `:146-165` — selector de sector/área con **lógica de normalización entre `sectors.id` y `service_sectors.id`** (`:89`: *"If the current value is sectors.id, normalize it to the matching service_sectors.id"*). Esa normalización está **triplicada**: acá, en `Preparte/actions/mutations.server.ts:128/146` y en `PreparteManager.tsx:380-405`. Es la firma de datos heredados sucios, y `CLAUDE.md:562-568` dice que tres copias de la misma regla **van a divergir**.
- `src/features/Operaciones/PartesDiarios/detail/clone.server.ts:127-139`, `:265-277`, `:401-419` — clonado de filas (copia las FKs tal cual, con `cloned_from_row_id`) y `getCloneConflicts()`, que detecta duplicados comparando por nombre de sector y `descripcion_corta` del área.
- `src/features/Operaciones/PartesDiarios/actions/validation.server.ts:187` — `$queryRaw` a `get_daily_report_deviations()`, cuya definición (`prisma/sql/daily-report.sql:135`, joins en `:273`, `:297-303`) hace **siete `LEFT JOIN`** sobre `customers`, `customer_services`, `service_items`, `service_sectors`, `sectors`, `service_areas`, `areas_cliente` y `equipos_clientes`. La réplica en TypeScript está en `PartesDiarios/lib/resource-deviations.ts` (otra fórmula duplicada).
- `prisma/sql/daily-report.sql:731-732`, `:791-793`, `:838-840`, `:878-880` — `log_dailyreport_changes()` **materializa `customer_name` / `service_name` / `item_name` dentro de `dailyreportrows_history.changed_data`**. Consecuencia: renombrar un cliente, contrato o ítem **no reescribe el historial ya guardado** (exactamente el caso de `CLAUDE.md:492-496`).
- `src/features/Operaciones/PartesDiarios/detail/columns/badge-cells.tsx:261-262`, `detail/components/ServiceDetailDialog.tsx:146-155`, `PartesDiarios/components/ServiceDetailModal.tsx:61-70`, `Preparte/components/PreparteDetailModal.tsx:70-97`, `Certificacion/components/form-sections/CustomerDataSection.tsx:13-71`, `Certificacion/lib/transform.ts:21-75` — presentación.

**Fuga de perímetro ya presente**: `Certificacion/actions/catalogs.server.ts:136-144` — `getFilterSectors()` hace `prisma.sectors.findMany({ select: { id, name } })` **sin ningún filtro de empresa**, a diferencia de `getFilterCustomers()` (`:17`), `getFilterServices()` (`:33`), `getFilterItems()` (`:89`) y `getFilterCustomerEquipments()` (`:108`), que sí lo tienen. Está asumido en el comentario del archivo (`:10-12`: *"Todos acotados a la empresa activa salvo `sectors`, que es un catálogo global (la tabla no tiene `company_id`)"*), pero con más de una empresa con datos el filtro de sectores del tablero comercial muestra los sectores de todas.

**Criterio de perímetro inconsistente para `service_items`**: `catalogs.server.ts:89` filtra por `service_items.company_id` directo, mientras `Preparte/actions/mutations.server.ts:82` y `row-query.ts:500` lo hacen por `customer_services → customers.company_id`. Dos criterios para la misma tabla.

**Consumidores fuera de Operaciones y Comercial** (relevantes porque cualquier cambio de esquema los alcanza):

- **API pública externa** — `src/features/ExternalApi/resources/commercial.ts`: `fetchExternalCustomers()` (`:32-56`), `fetchExternalCommercialSectors()` (`:94-130`, sobre `sectors` + `sector_customer`), `fetchExternalCustomerAreas()` (`:165-192`, sobre `areas_cliente`), con sus tipos públicos `PublicCustomer` / `PublicCommercialSector` / `PublicCustomerArea`. Expuestos en `src/app/api/external/v1/customers/route.ts`, `.../commercial-sectors/route.ts`, `.../customer-areas/route.ts`. **Es un contrato con consumidores de afuera: cambiar la forma de estas tablas es un cambio de API pública.**
- `src/features/Dashboard/Estadisticas/Operaciones/actions/actions.server.ts:88` — **SQL crudo** con `JOIN customers c ON c.id = drr.customer_id` (mensual vs adicional por cliente / centro de costo).
- `src/features/Dashboard/Principal/actions/services.server.ts:63`, `:91`, `:126`, `:211` — `dailyreportrows → customers` y facets.
- `src/features/Dashboard/Estadisticas/SalaDeControl/actions/preparte-kpi.server.ts:51` — KPI de prepartes por cliente.
- `src/features/Empresa/Clientes/actions/measure-units.server.ts:78` — `count` de `service_items` para impedir borrar una unidad de medida en uso.
- `src/shared/lib/storage-perimeter.ts:79-84` — dueño de un documento de contrato para las descargas de MinIO.
- `src/features/Checklists/actions/actionsServer.ts:140`, `:277`, `:297` y `ChecklistAnswers/actions.server.ts:475` — `customers` en checklists (incluido el flujo QR anónimo).
- `src/features/Equipos/EquipoID/actions/vehicle-actions.ts:20`, `:35` — `fetchContractsByClientId()` / `fetchAllContracts()`, que **también usa el form de Preparte** vía `usePreparteFormOptions`.
- `src/features/Formularios/actions/form-actions.ts:75` — perímetro del rol "Invitado": `share_company_users → customers → contractor_equipment`.
- `src/features/Documentacion/TiposDocumentos/actions/catalog.server.ts:186` y `prisma/sql/misc.sql:99` (`build_employee_where_alias`, `JOIN customers cust`) — los tipos de documento tienen condiciones que dependen de clientes.

Guardas ya existentes que prueban el acoplamiento (son mensajes de error escritos a mano porque el FK explotaba en producción):

- `src/features/Empresa/Clientes/actions/services.server.ts:108` — `FK_IN_USE_MESSAGE = 'No se pueden quitar áreas o sectores que están siendo utilizados en partes diarios'` (se dispara en `P2003`, `:126`/`:234`).
- `src/features/Empresa/Clientes/actions/sectors.server.ts:126-128` — *"No se puede cambiar el cliente del sector porque está siendo utilizado en contratos o partes diarios"*.
- `src/features/Empresa/Clientes/actions/areas.server.ts:76-87` — `findContractUsingArea()`: impide cambiarle el cliente a un área si hay un contrato activo que la usa.
- `src/features/Empresa/Clientes/actions/services.server.ts:89-102` — `assertAreasAndSectorsBelongToCustomer()`: valida los ids del form contra el cliente.

#### 1.2.5 Contratos

**Aclaración de nomenclatura, para no equivocar la tabla.** El "contrato de cliente" del ticket es **`customer_services`**. Las tres tablas con "contract" en el nombre son otra cosa:

| Tabla | Qué es realmente | Dónde se administra |
|---|---|---|
| `types_of_contract` (`:2386-2400`) | **Tipos de contrato de EMPLEADOS.** Relación `employees[]`, `company_id` NOT NULL | Configuración → RRHH (`Empresa/RRHH/ContractTypes/actions.server.ts`). Consumido por Empleados, Dashboard/Estadísticas, WorkDiagrams, TiposDocumentos. **Nada que ver con Comercial.** |
| `equipment_owner_contract_types` (`:1191-1201`) | Tipos de contrato de los **dueños de equipos** (`contract_type_enum`) | Configuración → Equipos |
| `documents_contracts` (`:994-1010`) | Documentos adjuntos a un contrato de cliente | `services.server.ts:252-380`, bucket `contract-documents` |

`documents_contracts` tiene un defecto estructural relevante: **`contract_id` es `String` suelto, sin `@db.Uuid` y sin FK**. Está documentado en `src/shared/lib/storage-perimeter.ts:74`: *"Son dos consultas porque `documents_contracts.contract_id` es un `String` suelto, sin…"*. Cualquier cambio de ubicación o de borrado de contratos deja documentos huérfanos sin que la base se queje.

**¿Los contratos ya cuelgan de un cliente?** Sí: `customer_services.customer_id` → `customers` con `onDelete: Cascade` (`:721`). Pero con dos flojedades: `customer_id` es **nullable** y `company_id` es **nullable**, y por eso el perímetro de empresa se resuelve por la relación, no por la columna (`service-items.server.ts:95-96`: *"Perímetro por la relación (`customer_services.company_id` es nullable)"*).

**Datos que hacen falta para decidir "dentro del detalle" vs "aparte solo-lectura"** — el ticket deja la decisión abierta y esto es lo que hay que poner sobre la mesa antes de resolverla:

1. ¿Hay algún flujo que necesite ver contratos **de varios clientes a la vez** (comparar, buscar por número de contrato, listar vencimientos)? Hoy la tab `service` es exactamente eso y el `ServiceTable` recibe `customers` como lista.
2. ¿Quién crea contratos y con qué frecuencia? Si es un alta rara, vive bien en la ficha; si es alta frecuente, un listado propio ahorra clics.
3. ¿"Solo visualización" significa sin alta/edición **ni** documentos **ni** ítems? Los ítems (y con ellos los precios) son el corazón del punto 4-5 del ticket: si la tab queda solo-lectura, la administración de precios se muda entera a la ficha del cliente.
4. ¿Qué pasa con la ruta `/dashboard/configuration/services/[id]` (`ServiceItemsSection`), que hoy es una pantalla de ítems de contrato **fuera** de Comercial y fuera de la ficha? Hay tres entradas a lo mismo.
5. ¿La herencia de permisos `contratos-cliente` → `comercial:service:view` se mantiene, o la tab pasa a tener slug propio? Si la tab `service` desaparece, el permiso del que hereda la ficha desaparece con ella.

#### 1.2.6 Partes diarios y certificación: qué hay hoy

**No existe ninguna entidad "certificación".** "Certificación" hoy es:

1. **Un valor del enum `daily_report_status`**: `en_certificacion` (`prisma/schema.prisma:3017-3028`, junto a `pendiente`, `sin_recursos_asignados`, `ejecutado`, `reprogramado`, `cancelado`).
2. **Una transición de estado masiva**: `Certificacion/actions/mutations.server.ts:18-51` pasa a `en_certificacion` las filas que están en `ejecutado`, y setea `last_comercial_edit_at`. UI: `BulkCertificacionModal.tsx`.
3. **Un tablero de consulta filtrable**: `Comercial/Comerce/components/DailyReportWrapper.tsx` (697 líneas, `'use client'`) + `Certificacion/components/EnhancedComercialReportTable.tsx` (698 líneas) sobre `getFilteredDailyReportRows()` (`Certificacion/actions/queries.server.ts`), con filtros de cliente, contrato, estado, empleado, equipo, ítem, equipo de cliente, áreas, sectores y `dateFrom`/`dateTo`.
4. **Un export a Excel** (`Certificacion/components/export-formatters.ts`).
5. **Remitos opcionales**: al pasar a `en_certificacion` se puede cargar un `remit_number` y se crea una fila en `remitos` (`Certificacion/components/hooks/useFormSubmit.ts:184-185`; modelo `remitos` en `:2060-2078`).

**Qué falta para que eso sea una certificación:**

- **No hay entidad de certificación**: ni cabecera (cliente, contrato, período, número, estado, total), ni líneas, ni numeración, ni emisión, ni cierre.
- **No hay período**: hay un filtro `dateFrom`/`dateTo` que es de pantalla, no un atributo persistido de nada.
- **No hay cantidad.** `dailyreportrows` **no tiene ninguna columna de cantidad**. Verificado contra la base:
  ```
  SELECT table_name, column_name FROM information_schema.columns
  WHERE table_schema='public' AND (data_type='numeric' OR column_name ~* 'price|...|quantity|cantidad')
  ```
  devuelve 21 filas; de `dailyreportrows` **ninguna**. Lo que hay es `preparte.quantity numeric` y el par `start_time`/`end_time` + `working_day` + `completed_day`/`completed_night` en la fila. Es decir: **hoy no se puede valorizar una línea de parte diario porque no se sabe cuánto se hizo.** Salvo que la regla sea "cantidad = 1 por línea" o "cantidad = horas", que es una decisión de negocio sin definir.
- **No hay importes en ningún lado**: `ROW_SELECT` (`queries.server.ts:57`) trae de `service_items` sólo `id, item_name, item_description`.

**El único campo monetario del dominio comercial es `service_items.item_price`** (`prisma/schema.prisma:2211`, `Decimal @db.Decimal`, **sin precisión ni escala**). Inventario completo de columnas monetarias del sistema:

| Tabla.columna | Tipo | Dominio |
|---|---|---|
| `service_items.item_price` | `Decimal @db.Decimal` | **comercial — el del ticket** |
| `vehicles.price` | `Decimal? @db.Decimal(15, 2)` + `currency currency_enum?` | valor del equipo |
| `other_equipment.initial_value` | `Decimal? @db.Decimal` + `currency` | valor del equipo |
| `model_vehicles.price` | `Decimal @db.Decimal` | catálogo |
| `modules.price` | `numeric` | comercialización de módulos (legado) |

Existen `currency_enum` (`USD/EUR/GBP/ARS`, `:2999-3006`), `cost_type_enum` y la tabla `cost_center`, pero **ninguno alcanza a `service_items`**: el precio del ítem no tiene moneda, ni centro de costo, ni escala. `Decimal(15,2)` ya tiene precedente en el schema (`vehicles.price`).

Uso actual de `item_price` en el código (grep completo, 8 sitios):

- `Empresa/Clientes/schemas/service-item.ts:9` — Zod: `z.preprocess((val) => Number(val), z.number().min(0, …))` ⟵ **el precio pasa por `number` de JS, no por `Decimal`**
- `Empresa/Clientes/actions/service-items.server.ts:22-24` — `serializeItem`: `item_price: Number(item_price)` ⟵ **Decimal → number al salir**
- `Empresa/Clientes/actions/service-items.server.ts:72` — `item_price: new Prisma.Decimal(values.item_price)` ⟵ number → Decimal al entrar
- `Empresa/Clientes/components/Services/ServiceItemsForm.tsx:32`, `:126` — input del form
- `Empresa/Clientes/components/Services/ServiceItemsSection.tsx:177`, `:214-220` — `${item.item_price}` y un input suelto con `Number(e.target.value)`
- `Empresa/Clientes/components/Services/ServiceItemsTable.tsx:93-96` — columna `${row.original.item_price}`
- `Operaciones/Preparte/actions/actions.ts:66`, `:89` y `Operaciones/PartesDiarios/actions/comercial-rows.server.ts:63`, `:83` — se trae y se convierte a `number`, sin usar

#### 1.2.7 Ítems de contrato y precedentes de versionado

**¿Existen "items de contrato"?** Sí: `service_items` (`:2204-2226`), con `item_name`, `item_description`, `item_price`, `item_measure_units` → `measure_units`, `code_item`, `item_number`, `needs_equipment`, `needs_personnel`, `is_active`, `customer_service_id`, `company_id`. Es exactamente la entidad que el ticket llama "los items de los contratos".

**Precedentes de historial/versionado en el proyecto** (3 patrones distintos):

| Patrón | Tabla | Cómo se escribe | Aplicabilidad al versionado de precios |
|---|---|---|---|
| **Revisión "antes/después" por campo, a nivel aplicación** | `kpi_revisions` (`:1296-1314`): `previous_number`, `new_number`, `previous_validity_date`, `new_validity_date`, `change_reason`, `changed_by` → `profile.credential_id`, `is_active`, `created_at` | Server action, dentro de `$transaction` junto al `update` — `Dashboard/Estadisticas/KPIs/actions/actions.ts:243-264`. El comentario `:224-226` explica por qué: *"antes la revisión se insertaba después y, si fallaba, el KPI quedaba cambiado sin rastro de quién lo hizo"* | **El mejor precedente.** Misma forma que pide el ticket ("valor anterior, fecha de actualización"), sin agregar triggers |
| **Log genérico campo/old/new** | `preparte_change_logs` (`:1856-1876`): `field_name`, `old_value`, `new_value`, `reason`, `changed_by`, `changed_at`, `metadata Json` | Aplicación | Sirve como bitácora, no como fuente del precio vigente |
| **Auditoría por trigger, JSON** | `dailyreportrows_history` (`:883-902`): `action_type`, `changed_data Json`, `changed_fields Json`, `changed_by`, `metadata`, `reassignment_reason` | **Triggers**: `tr_dailyreportrows_history_after_insert`, `_before_update`, `_before_delete` → `log_dailyreport_changes()` (`prisma/sql/daily-report.sql:673-917`, triggers `:984-994`). Actor vía `public.app_current_user_id()` (`app.user_id`, helper `withActor`) | Es el patrón "pesado". La función compara **campo por campo a mano** (`:706-730…`): agregar una columna nueva (cantidad, precio) exige editarla explícitamente |

Tablas `*_history` / `*_log` que existen en la base: `dailyreportrows_history`, `diagrams_logs`, `documents_employees_logs`, `documents_equipment_logs`, `external_api_access_logs`, `kpi_revisions`, `maintenance_activity_log`, `preparte_change_logs`. **`service_items` y `customer_services` no tienen ninguna.**

**Triggers hoy sobre las tablas involucradas** (consultado en la base viva vía `pg_trigger`):

| Tabla | Trigger | Función |
|---|---|---|
| `customer_services` | `after_service_update` (`AFTER UPDATE OF is_active … WHEN (old.is_active IS DISTINCT FROM new.is_active)`) | `deactivate_service_items()` |
| `service_items` | `after_service_update` (idem) | `deactivate_service_items()` |
| `dailyreportrows` | `before_update_log_reason`, `tr_after_dailyreportrows_update_optimized`, `tr_dailyreportrows_history_{after_insert,before_update,before_delete}` | 3 funciones distintas |
| `areas_cliente`, `sectors`, `sector_customer`, `equipos_clientes`, `service_areas`, `service_sectors`, `dailyreport`, `preparte` | **ninguno** | — |

Y hay un **trigger mal enganchado** que conviene mirar antes de tocar `service_items`. `deactivate_service_items()` (`prisma/sql/misc.sql:228-238`) hace:

```sql
UPDATE service_items SET is_active = NEW.is_active WHERE customer_service_id = NEW.id;
```

Eso tiene sentido colgado de `customer_services` (`prisma/sql/misc.sql:1031`): desactivar un contrato desactiva sus ítems. Pero está colgado **también de `service_items`** (`prisma/sql/misc.sql:1045-1047`), donde `NEW.id` es el id del **ítem**, no del contrato: `WHERE customer_service_id = <id de ítem>` no matchea nada. Hoy es un no-op costoso; si alguien lo "arregla" sin entender por qué está ahí, pasa a ser una desactivación masiva en cascada de todos los ítems del contrato cada vez que se toca uno.

#### 1.2.8 Datos existentes

Contado en el Postgres del compose:

| Tabla | Filas | | Tabla | Filas |
|---|---|---|---|---|
| `customers` | **0** | | `service_items` | **0** |
| `areas_cliente` | **0** | | `measure_units` | **0** |
| `sectors` | **0** | | `dailyreport` | **0** |
| `sector_customer` | **0** | | `dailyreportrows` | **0** |
| `equipos_clientes` | **0** | | `dailyreportrows_history` | **0** |
| `customer_services` | **0** | | `preparte` | **0** |
| `service_areas` | **0** | | `documents_contracts` | **0** |
| `service_sectors` | **0** | | `types_of_contract` | **0** |
| `area_province` | **0** | | `assing_customer` | **0** |
| `dailyreport_customer_equipment_relations` | **0** | | | |

Contexto: la base **no está vacía** (`company` = 2, `profile` = 26, `employees` = 3, `vehicles` = 1, `modules` = 11, `tabs` = 141, `_prisma_migrations` = 16). Es decir: está sembrada con la estructura de permisos y algo de datos de prueba, pero **el dominio comercial completo está en cero**.

Consecuencias, y son dos en direcciones opuestas:

- **A favor**: cualquier migración de estructura sobre estas tablas no tiene que hacer backfill localmente; se puede diseñar el esquema con las restricciones "correctas" (NOT NULL, FK, unique) sin pelear con filas históricas.
- **En contra**: **no hay ningún dato con el que validar la migración**, ni las guardas de FK, ni el cálculo de la certificación. Todo lo que se pruebe local será con datos inventados. Y las tablas de prod/dev del cliente (la app viene de `gh_gestion`) presumiblemente **sí** tienen datos, así que las restricciones nuevas hay que escribirlas defensivamente y verificarlas contra esa base antes de aplicar.

Las 14 filas de `tabs` del módulo `comercial` ya existen en la base y coinciden una a una con `permissions-map.ts` (ids `40000000-0000-0000-0000-0000000000{01,11,12,13,14,15,16,17,111,112,113,151,152,153}`).

---

### 1.3 Archivos involucrados

#### Se rehacen o se mueven (núcleo)

```
src/features/Comercial/ComercialComponent.tsx
src/features/Comercial/Comerce/ComerceTabContent.tsx
src/features/Comercial/Comerce/components/DataCustomersWrapper.tsx
src/features/Comercial/Comerce/components/CustomerTabWrapper.tsx          (Áreas)
src/features/Comercial/Comerce/components/SectorTabsWrapper.tsx           (Sectores)
src/features/Comercial/Comerce/components/CustomerEquipmentTabWrapper.tsx (Equipos)
src/features/Comercial/Comerce/components/ServiceComponentWrapper.tsx     (Contratos)
src/features/Comercial/Comerce/components/MensureUnitsWrapper.tsx
src/features/Comercial/Comerce/components/DailyReportWrapper.tsx          (697 líneas)
src/features/Comercial/actions/location-actions.ts
```

#### Ficha del cliente (destino de áreas/sectores/equipos/contratos)

```
src/features/Empresa/Clientes/components/CustomersPanel.tsx
src/features/Empresa/Clientes/components/CustomersList.tsx
src/features/Empresa/Clientes/components/CustomerComponent.tsx
src/features/Empresa/Clientes/components/CustomerForm.tsx
src/features/Empresa/Clientes/components/CustomerDetail/CustomerDetail.tsx
src/features/Empresa/Clientes/components/CustomerDetail/CustomerDetailTab.tsx
src/features/Empresa/Clientes/components/CustomerDetail/CustomerEmployeesTab.tsx
src/features/Empresa/Clientes/components/CustomerDetail/CustomerEquipmentTab.tsx
src/features/Empresa/Clientes/components/CustomerDetail/CustomerContractsTab.tsx
src/features/Empresa/Clientes/components/CustomerDetail/AssignmentDialog.tsx
src/features/Empresa/Clientes/components/customerTab.tsx
src/features/Empresa/Clientes/components/area_clientes/{areaTable,areaForm}.tsx
src/features/Empresa/Clientes/components/sector_clientes/{sectorTabs,sectorTable,sectorForm}.tsx
src/features/Empresa/Clientes/components/equipos/{customerEquipmentTab,customerEquipmentTable,customerEquipmentForm}.tsx
src/features/Empresa/Clientes/components/meansure_units/{MensureUnitsTab,MensureUnitsTable,MensureUnitsForm}.tsx
```

#### Contratos e ítems (precios y versionado)

```
src/features/Empresa/Clientes/components/Services/ServiceComponent.tsx
src/features/Empresa/Clientes/components/Services/ServiceTable.tsx
src/features/Empresa/Clientes/components/Services/ServicesForm.tsx
src/features/Empresa/Clientes/components/Services/ServiceItemsSection.tsx
src/features/Empresa/Clientes/components/Services/ServiceItemsTable.tsx
src/features/Empresa/Clientes/components/Services/ServiceItemsForm.tsx
src/features/Empresa/Clientes/components/Services/contractDocuments.tsx
src/features/Empresa/Clientes/actions/service-items.server.ts
src/features/Empresa/Clientes/actions/services.server.ts
src/features/Empresa/Clientes/schemas/service-item.ts
src/features/Empresa/Clientes/schemas/service.ts
src/features/Empresa/Clientes/lib/{service-item-form,service-dates,contract-documents}.ts
src/app/dashboard/configuration/services/[id]/page.tsx
```

#### Server actions y schemas de áreas/sectores/equipos/unidades

```
src/features/Empresa/Clientes/actions/areas.server.ts
src/features/Empresa/Clientes/actions/sectors.server.ts
src/features/Empresa/Clientes/actions/customer-equipment.server.ts
src/features/Empresa/Clientes/actions/customers.server.ts
src/features/Empresa/Clientes/actions/measure-units.server.ts
src/features/Empresa/Clientes/actions/assignments.server.ts
src/features/Empresa/Clientes/actions/contacts.server.ts
src/features/Empresa/Clientes/schemas/{area,sector,customer-equipment,customer,measure-unit}.ts
src/features/Empresa/Clientes/lib/{serializers,assignment-diff,allocated-to,action-result}.ts
```

#### Operaciones (lo que se rompe si se mueve algo)

```
src/features/Operaciones/PartesDiarios/detail/lib/row-query.ts        ← NÚCLEO: FK_SORT_MAP, buildWhereClause, buildRowSelect, perímetro
src/features/Operaciones/PartesDiarios/detail/queries.server.ts       (paginado + facets)
src/features/Operaciones/PartesDiarios/detail/form-data.server.ts     (cascada del form de Operaciones)
src/features/Operaciones/PartesDiarios/detail/mutations.server.ts
src/features/Operaciones/PartesDiarios/detail/clone.server.ts
src/features/Operaciones/PartesDiarios/detail/export.server.ts
src/features/Operaciones/PartesDiarios/detail/history.server.ts
src/features/Operaciones/PartesDiarios/detail/columns/{resource-columns,badge-cells}.tsx
src/features/Operaciones/PartesDiarios/detail/components/DailyReportRowForm/CustomerServiceSection.tsx
src/features/Operaciones/PartesDiarios/actions/comercial-rows.server.ts
src/features/Operaciones/PartesDiarios/actions/validation.server.ts   (llama get_daily_report_deviations)
src/features/Operaciones/PartesDiarios/lib/resource-deviations.ts     (réplica TS de la función SQL)
src/features/Operaciones/Preparte/actions/actions.ts                  (catálogos en cascada)
src/features/Operaciones/Preparte/actions/mutations.server.ts         (buildSectorMap / buildAreaMap)
src/features/Operaciones/Preparte/actions/bulk.server.ts              (preparte → dailyreportrows)
src/features/Operaciones/Preparte/actions/report.server.ts
src/features/Operaciones/Preparte/list/actions.server.ts
src/features/Operaciones/Preparte/list/columns.tsx
src/features/Operaciones/Preparte/hooks/usePreparteFormOptions.ts
src/features/Operaciones/Preparte/components/preparte-form/{LocationSection,CustomerContractSection,ItemsSection}.tsx
src/features/Operaciones/Preparte/components/{PreparteManager,PreparteDetailModal}.tsx
src/features/Operaciones/Certificacion/actions/queries.server.ts      (ROW_SELECT)
src/features/Operaciones/Certificacion/actions/mutations.server.ts    (en_certificacion)
src/features/Operaciones/Certificacion/actions/catalogs.server.ts     (getFilterSectors sin perímetro)
src/features/Operaciones/Certificacion/components/EnhancedComercialReportTable.tsx  (698 líneas)
src/features/Operaciones/Certificacion/components/BulkCertificacionModal.tsx
src/features/Operaciones/Certificacion/components/export-formatters.ts
src/features/Operaciones/Certificacion/components/DailyReportRowFormRefactored.tsx
src/features/Operaciones/Certificacion/components/form-sections/*.tsx
src/features/Operaciones/Certificacion/components/hooks/*.ts
src/features/Operaciones/Certificacion/hooks/useFilterOptions.ts
src/features/Operaciones/Certificacion/lib/transform.ts
src/features/Operaciones/lib/with-session-actor.ts                    (SET LOCAL app.user_id)
```

#### Fuera de Comercial y Operaciones (los alcanza un cambio de esquema)

```
src/features/ExternalApi/resources/commercial.ts                      ← API PÚBLICA
src/app/api/external/v1/customers/route.ts
src/app/api/external/v1/commercial-sectors/route.ts
src/app/api/external/v1/customer-areas/route.ts
src/features/Dashboard/Estadisticas/Operaciones/actions/actions.server.ts   (SQL crudo con JOIN customers)
src/features/Dashboard/Principal/actions/services.server.ts
src/features/Dashboard/Estadisticas/SalaDeControl/actions/preparte-kpi.server.ts
src/features/Checklists/actions/actionsServer.ts
src/features/Checklists/ChecklistAnswers/actions.server.ts
src/features/Equipos/EquipoID/actions/vehicle-actions.ts              (fetchContractsByClientId, lo usa Preparte)
src/features/Formularios/actions/form-actions.ts                      (perímetro del rol Invitado)
src/features/Documentacion/TiposDocumentos/actions/catalog.server.ts
src/shared/lib/storage-perimeter.ts
src/shared/actions/{countries,shared-users,session}.server.ts
```

#### Infraestructura transversal

```
prisma/schema.prisma                                    (models nuevos + FKs + precisión de Decimal)
prisma/migrations/<timestamp>_<nombre>/migration.sql    (una carpeta manual por cambio)
prisma/sql/misc.sql                                     (deactivate_service_items, si se toca)
prisma/sql/daily-report.sql                             (log_dailyreport_changes, si se agrega columna auditada)
src/features/Permissions/permissions-map.ts             (tabs nuevas / bajas)
src/features/Layout/sidebar/constants/navigation.ts     (items del módulo)
src/shared/lib/storage-perimeter.ts                     (perímetro de documents_contracts)
cypress/e2e/comercial/comerce--{areas,customers,daily_reports,equipment,mensure_units,sector,service}.cy.ts
cypress/e2e/dashboard-navigation.cy.ts
```

---

### 1.4 Dependencias

**Framework y librerías** (`package.json`): Next.js 16 (App Router, Server Components/Actions), React 19, Prisma 7 con `@prisma/adapter-pg` (cliente generado en `src/generated/prisma/`), Postgres del compose (`docker-compose.yml`, servicio `postgres`, `.env.docker`), TanStack Query 5, TanStack Table, `react-hook-form` + `zod`, shadcn/ui + Tailwind, `moment` (fechas), Cypress 15, Vitest.

**Módulos internos de los que depende este trabajo:**

| Dependencia | Para qué | Archivo |
|---|---|---|
| `SectionManagerServer` | montar la sección única del módulo, resuelta por `?tab=` en el servidor | `src/features/TabsManager/SectionManagerServer.tsx` |
| `TabsManagerServer` | subtabs (`?subtab=`) | `src/features/TabsManager/TabsManagerServer.tsx` |
| `createTabVisibilityChecker` | **regla única** de visibilidad de tabs, compartida por sidebar y páginas | `src/features/Permissions/lib/tab-visibility.ts:20-45` |
| `permissions-map.ts` + `PermissionGuard` + `usePermissions` | permisos por módulo/tab/acción | `src/features/Permissions/` |
| `navigation.ts` | items del sidebar, declarados a mano (no derivados del mapa) | `src/features/Layout/sidebar/constants/navigation.ts` |
| `getActiveCompanyId()` | perímetro de empresa en toda server action | `src/shared/lib/tenant.ts` |
| `withActor` / `app.user_id` | actor de la transacción para los triggers de auditoría | `src/shared/lib/actor.ts`, `prisma/sql/README.md` |
| `getSessionUserId()` | `profile.credential_id` para `changed_by` (patrón `kpi_revisions`) | `src/shared/lib/session.ts` |
| `ActionResult` / `ok()` / `fail()` | contrato de retorno de las actions de Clientes | `src/features/Empresa/Clientes/lib/action-result.ts` |
| `diffAssignments` | altas/bajas explícitas en pivotes M:M | `src/features/Empresa/Clientes/lib/assignment-diff.ts` |
| `BaseDataTable` (**sistema viejo**) | tablas actuales de áreas, sectores, ítems y el tablero comercial | `src/shared/components/data-table/base/data-table.tsx` |
| `DataTable` (**sistema vigente**) | el que exige `.claude/rules/datatable.md` para tablas nuevas | `src/shared/components/common/DataTable/` |
| `measure_units` | unidad de medida del ítem (catálogo global) | — |
| Storage `contract-documents` | documentos de contrato | `src/features/Empresa/Clientes/lib/contract-documents.ts` |

**Dependencia de trabajo previo no cerrado:** `docs/superpowers/plans/2026-09-18-plan-maestro-deuda-tecnica.md`. Su decisión global 3 (`:23`) dice *"Partes diarios viven en **`features/Operaciones`**; `Comercial` consume de ahí"*, y la Fase 4.10 (`:681`) tiene pendiente migrar `Comercial` de Supabase a Prisma. `docs/superpowers/plans/2026-09-19-consolidar-partes-diarios.md` registra que `Certificacion/actions/actions.ts` seguía en `supabaseBrowser()` y que su migración a Prisma quedaba para la Fase 4.8.

---

### 1.5 Restricciones y reglas

Sólo lo que aplica a este trabajo, con cita.

#### Alcance — la restricción que manda sobre todas

- `CLAUDE.md:455` — *"Regla del usuario, absoluta: **solo se modifica lo que el ticket o el video de la reunión dicen que hay que modificar.** Si algo no se menciona en ninguno de los dos, queda tal cual — aunque quede inconsistente con lo que sí se cambió, aunque 'de paso' parezca una mejora obvia, aunque use un patrón deprecado."*
- `CLAUDE.md:459` — *"'exista' lo dice el usuario, no yo: no salir a rastrear […] por iniciativa propia [videos de reunión]"*. El ticket no trae análisis y no se mencionó reunión: **el alcance sale del texto del ticket y lo que quede abierto se pregunta.**
- `CLAUDE.md:457` — precedente directo: se **respetó** una tabla con el patrón bulk de facets deprecado porque el video no la mencionaba. Aplica a `BaseDataTable` en el tablero comercial.
- `CLAUDE.md:465` — *"si al sacar algo de la UI el código queda sin ningún consumidor, **se borra** […] nunca sin antes mapear los importadores reales con grep."*
- `CLAUDE.md:469` — *"el default es **replicar las reglas que ya rigen ese flujo**, no diseñar reglas propias"*; `:473` — *"La pregunta correcta no es '¿qué comportamiento es mejor?' sino '¿qué hace hoy el flujo del que esto forma parte?'"*
- `CLAUDE.md:360` — *"**Antes de diseñar esquema, buscar si la capacidad YA existe y solo está mal nombrada o mal ubicada.** […] El camino más corto suele ser texto, no DDL."* Aplica literalmente: la pestaña "Contratos" de la ficha del cliente ya existe, y `item_price` ya existe.
- `CLAUDE.md:337` / `:343` — *"la obligatoriedad de negocio vive en el schema del form, no en el DDL"*; *"espejar EXACTAMENTE la nullability de la tabla original — ni relajar ni endurecer"*.

#### Impacto en lo vinculado

- `CLAUDE.md:292-305` — *"### Toda modificación exige analizar el IMPACTO en lo vinculado — nunca tratar una entidad como aislada"*. Los cuatro pasos: (1) *"leer bien la funcionalidad y sus relaciones (schema Prisma, FKs, tablas pivote, triggers SQL, server actions que tocan lo mismo, cálculos de estado/status, alertas, estadísticas, exportaciones, PDFs)"*; (2) listar los efectos colaterales; (3) **"Si hay duda sobre si algo DEBE verse afectado o no, PREGUNTAR al usuario antes de implementar"**; (4) al reportar, explicitar qué quedó afuera.
- `CLAUDE.md:305` — *"cambios en DataTables ↔ filtros + facets + export + sorting + permisos"*.

#### Migraciones

- `.claude/rules/migrations.md:22` — *"Todo cambio posterior al baseline es una carpeta manual `prisma/migrations/YYYYMMDDHHMMSS_nombre/migration.sql` + `prisma migrate deploy`"*.
- `migrations.md:129` — *"**NUNCA** usar `npx prisma migrate dev`"*; `:130` — *"**NUNCA** regenerar `0_init` despues del primer deploy real"*; `:131` — *"**SIEMPRE** revisar el output de `migrate diff` y tomar SOLO los cambios necesarios (ignorar drift colateral, en especial las columnas GENERATED)"*; `:133` — nombres *"en ingles, snake_case"* con timestamp; `:134` — verificación post-migración con `psql` **obligatoria**; `:135` — prohibido `auth.`/`storage.`/`extensions.`/`net.`/`cron.`/`uuid_generate_v4()`; `:75` — UUIDs con `gen_random_uuid()`.
- `migrations.md:64-69` — *"## Funciones, triggers y vistas: cambio **DOBLE**"*: (1) editar `prisma/sql/<dominio>.sql`; (2) escribir **la misma** `CREATE OR REPLACE …` en la migración, *"porque el baseline no se regenera"*.
- `migrations.md:74` — *"Empresa: toda funcion recibe/filtra `company_id`; nada de supuestos 'solo GH'."*
- `CLAUDE.md:96` — vía MCP está *"**ESTRICTAMENTE PROHIBIDO**"* todo `CREATE`/`ALTER`/`DROP`/… : *"**TODA migración […] se hace EXCLUSIVAMENTE con Prisma**"*.
- `CLAUDE.md:353-362` — *"### NUNCA aplicar una migración a dev antes de que el usuario valide el alcance"*. La actualización 2026-09-11 autoriza aplicar en DEV las migraciones **cuyo alcance ya está validado**; *"lo que sigue exigiendo mostrar primero es un diseño no validado. PROD nunca."*
- `CLAUDE.md:440-447` — si el cambio toca `tabs` en dev y main: migración idempotente `INSERT … ON CONFLICT (id) DO UPDATE`, manteniendo **el mismo `tab_id` y el mismo slug** en las dos ramas.

#### Triggers y auditoría

- `CLAUDE.md:546-560` — *"### Agregar o modificar un trigger: auditar el grafo completo y MEDIR antes de escribirlo"*. *"Un trigger nuevo no se agrega 'porque falta'"*; el usuario ya frenó esto: *"los triggers pueden afectar negativamente muchas cosas, auto llamados en bucle, muchas ejecuciones sin querer, problemas en otras funcionalidades"*. Qué verificar, en orden: (1) **ciclos**, *"sobre la BASE VIVA (`pg_trigger` + `pg_get_functiondef`), no sobre las migraciones"*; (2) *"un trigger statement-level se dispara aunque la sentencia afecte 0 filas"*; (3) *"**Medir antes y después, y con/sin el trigger**"* (`ALTER TABLE … DISABLE TRIGGER` en transacción con `ROLLBACK`). Mitigar con early-return, `WHERE col IS DISTINCT FROM nuevo` y escrituras fuera del loop. Probar equivalencia con `BEGIN; …; ROLLBACK;`.
- `CLAUDE.md:272-274` — *"### Cambiar guardas/triggers row-level: analizar cascadas y TODOS los flujos masivos antes"*; la opción segura es *"una **lista explícita de columnas en el `WHEN`**"*.
- `CLAUDE.md:492-496` — *"### Cambiar un trigger que escribe texto: verificarlo con un evento NUEVO, no mirando el historial"*: *"las filas ya escritas conservan el texto viejo materializado"*; y hay que *"decirle al usuario que los registros anteriores siguen mostrando el texto viejo y dejarle a él la decisión"*.
- `CLAUDE.md:420-428` — *"### `created_at` NO es fecha de alta si el código hace delete+insert"*; *"un dato es recuperable solo si depende de tablas inmutables"*; **"Ante un dato no medible, va `NULL`, nunca `0`"**. Directamente aplicable: **no se puede reconstruir el historial de precios anteriores a la migración — el precio previo es `NULL`, no 0.**
- `CLAUDE.md:490` — *"el proyecto **no tiene PITR** (`archive_mode = off` en prod). Un borrado masivo en una pivote es irrecuperable."*
- `CLAUDE.md:562-568` — *"### Una columna calculada con la misma regla escrita en varios lugares va a divergir"*; *"una sola función […] que llamen todos los escritores, incluido el TypeScript. Dejar copias 'porque el cambio es más chico' es reproducir la causa raíz."* Aplica al "precio vigente" y a los totales de la certificación.
- `CLAUDE.md:280` — funciones SQL que retornan `void`: `$executeRaw`, **nunca** `$queryRaw` (*"El error NO aparece en `check-types`"*).
- No hay regla escrita para tablas `*_history`; el patrón hay que tomarlo del precedente (`kpi_revisions` / `dailyreportrows_history`) — ver 1.2.7.

#### Mutaciones M:M (crítica para áreas, sectores y equipos)

- `CLAUDE.md:477-490` — *"### Mutaciones M:M: enviar altas y bajas EXPLÍCITAS, nunca 'borrar todo e insertar lo nuevo'"*. *"**nunca** mandar el conjunto final para que el servidor borre por diferencia, ni hacer `deleteMany()` + `createMany()` de todo. […] **La ausencia de un id no significa nada** — jamás debe implicar borrado."* El incidente: *"El 26/08/2026 un solo guardado en Comercial → Clientes → Empleados borró **149 afectaciones** de Vista Oil."* Cómo se implementa: firma `updateXxx(parentId, { add, remove })`, `DELETE` acotado a `parent_id = X AND child_id IN (remove)`, todo en `$transaction`, retorna `{ added, removed }` reales; baseline leído **de la base** al abrir el modal; delta mostrado antes de confirmar; *"Un reemplazo total solo es aceptable si el formulario se renderiza **desde el servidor** con el estado real y acotado a UNA entidad"*.
  ⚠️ Esto choca con el código actual: `services.server.ts:176-235` y `sectors.server.ts:99-120` usan `diffAssignments` calculando el diff **en el servidor** contra la base — es la variante aceptable del punto 4, pero conviene verificarlo tab por tab al rehacer las pantallas.
- `CLAUDE.md:481` — *"la server action capturaba el error y lo **devolvía** en vez de lanzarlo, así que el `catch` del cliente nunca corría"* → el toast decía "correctamente" sobre un fallo.

#### Permisos y tabs

- `.claude/rules/permissions.md:5` — *"**Todo elemento de interaccion (botones de Crear, Editar, Eliminar) debe estar protegido por permisos.**"*
- `permissions.md:83-136` — checklist de tab nueva: componente → agregarlo al padre (`TabsManagerServer`/`SectionManagerServer`) → entrada en `permissions-map.ts` con `{ slug, name, tabId, parent, allowedActions, subtabs }` → **`INSERT INTO tabs … ON CONFLICT (id) DO NOTHING`** en una carpeta de migración manual (*"NUNCA `prisma migrate dev`"*).
- `permissions.md:119` — *"el seed (`npm run db:seed`) ya upsertea `modules`/`tabs`/`actions`/`role_permissions` desde `permissions-map.ts`; en el compose local alcanza con actualizar el mapa y correr el seed. **La migracion es lo que lleva el cambio a los entornos desplegados.**"*
- `CLAUDE.md:213-221` — *"Al insertar nuevas tabs o `role_permissions`, SIEMPRE incluir los 3 roles: `admin`, `administrador`, y `full-access-provisional`. […] **Y SOLO esos 3.**"* Y *"para que la asignación manual funcione, la tab DEBE estar declarada en `permissions-map.ts` con sus `allowedActions`"*.
- `permissions.md:137-146` — documentar en `docs/desarrollo/03-notas-desarrollo.md` **solo** los INSERT/UPDATE/DELETE de `tabs`/`roles`/`role_permissions`/`user_permissions`; **no** el DDL.
- `permissions.md:161` — `comercial: '92bfac14-dc5b-41be-b366-740bfbeaea13'`; `:156` — `operaciones: '5563157e-fc3e-470f-b90b-dadd7cc38417'`.
- **No hay regla escrita** sobre `navigation.ts`, `SectionManagerServer` ni `createTabVisibilityChecker`. La convención está en el código: `navigation.ts` declara los sub-items **a mano** porque *"Derivarlos del mapa generaria items que apuntan a un `?tab=` inexistente y el modulo caeria a su tab por defecto en silencio"*, y advierte: *"Si se agrega o renombra una tab de primer nivel en un modulo, hay que reflejarlo aca."* La visibilidad la decide `createTabVisibilityChecker` (`tab-visibility.ts:20-45`), que es la **única** regla y la usan sidebar y páginas (`SectionManagerServer.tsx:31-38`).

#### DataTables

- `CLAUDE.md:78` — *"**REGLA DataTables**: TODA tarea que involucre DataTables DEBE delegarse al agente `table-expert`."* Repetido en `.claude/rules/datatable.md:443`.
- `datatable.md:12-14` — *"## CHECKLIST OBLIGATORIO — TODA TABLA NUEVA O MODIFICADA […] **VERIFICAR CADA ÍTEM. Ninguno es opcional salvo que tenga justificación explícita.**"*
- `datatable.md:91` — *"**SIEMPRE** usar el `DataTable` de `@/shared/components/common/DataTable/` con Prisma."*
- `datatable.md:19` — **`stripPrefixFromSearchParams(searchParams, tableId)` SIEMPRE OBLIGATORIO**; `:28` — **`paramNamespace={tableId}` CRÍTICO SIN EXCEPCIÓN** — *"Sin esto, los filtros/ordenamiento se mezclan entre tablas si hay más de una en la página."* ⟵ la ficha del cliente va a tener 4-6 tablas en una sola página.
- `datatable.md:33` — facets **lazy-load** con `fetchFacet`; `:23` — **NO** cargar facets en SSR; `:41` — **`queryFn` obligatorio** (client-side mode).
- `datatable.md:36` / `:349` — *"Acciones individuales (editar/eliminar) condicionadas a permisos dentro de la columna `actions` — nunca ocultar la columna completa"*.
- `datatable.md:400-426` — marcadores del **sistema viejo** y de los **facets bulk deprecados**: `BaseDataTable`, `toolbarOptions`, `savedVisibility`/`savedFilters` de cookies, `import de @/shared/components/data-table/`, `getXxxFacets()`, `options:` estático, `externalCounts:`. **Todo el módulo Comercial actual está marcado como sistema viejo.**
- `datatable.md:430` — *"**NUNCA parchear** una tabla del sistema viejo. Siempre recrear completamente"* ⟵ en tensión directa con `CLAUDE.md:457` (no migrar lo que el ticket no pide): **esto es una pregunta de alcance para el usuario**, no una decisión de implementación.
- `.claude/rules/datatable-filters.md:40` — *"**TODA columna numerica** (days, amount, quantity, **Decimal**) DEBE tener filtro `text` para busqueda libre. NO se excluyen columnas numéricas — si el dato se muestra, se debe poder filtrar."* ⟵ aplica a precio, cantidad e importe.
- `datatable-filters.md:5` — toda columna de datos filtrable debe tener filtro; `:69` — toda columna nullable con filtro `faceted` lleva "Sin asignar"; `:98-102` — los labels del filtro deben coincidir **exactamente** con los de la celda.
- `datatable.md:387` — *"TODA columna exportable debe tener dato legible"* (enums→labels, fechas→`DD/MM/YYYY`, booleanos→`Sí/No`).
- `CLAUDE.md:225` / `.claude/rules/employee-file-number.md:3` — si la certificación muestra empleados, el **legajo va como columna separada, con su propio filtro `text`, antes del nombre**.

#### Server actions, forms, tipos

- `.claude/rules/server-actions.md:3` — *"**SIEMPRE** usar Server Actions (`'use server'`) en lugar de rutas API"*; `:7` — dentro de la carpeta de la feature; `:25-40` — nomenclatura `metodoFiltroEntidad`; `:44-78` — `prisma` de `@/shared/lib/prisma` + `new Logger('features/X')` + try/catch + `export type X = Awaited<ReturnType<typeof fn>>`.
- `.claude/rules/forms.md:5` / `:188-195` — `Form` de shadcn + `react-hook-form` + `zod`; `zodResolver`; `z.infer`; `<FormMessage />` por campo; submit deshabilitado con `isSubmitting`; **nunca** `useState` para valores.
- `forms.md:143` — para dinero desde input: `z.coerce.number()` (*"Número desde input de texto (siempre string en el DOM)"*).
- `CLAUDE.md:331-335` — schemas Zod compartidos server/client **nunca** en un archivo `'use client'`; van en `features/{X}/schemas/*.ts` (*"No lo detecta `npm run check-types`"*).
- `.claude/rules/typescript-types.md:3` — **nunca** `:any`; inferir del retorno.
- `CLAUDE.md:203` — columnas UUID/FK opcionales: enviar **`null`**, nunca string vacío; normalizar **en la server action**.
- `CLAUDE.md:227-236` — *"### NUNCA encadenar modales — unificar en un solo form"*: un único formulario con secciones separadas por `<Separator />` y **un solo submit**.
- `CLAUDE.md:390-394` — *"### Modales de dos pasos: el paso 2 no puede ser el que da vida al registro"*; *"nunca reutilizar/mutar un registro en estado cerrado (`approved`) para colgarle datos nuevos: crear uno nuevo"* ⟵ aplica a una certificación ya emitida.
- `CLAUDE.md:345` / `:351` — `type="button"` en todo `<Button>` de un form que no guarda; el submit corta temprano si el estado no admite edición.
- `.claude/rules/react-query.md:5-9` + `CLAUDE.md:264` — fetching client-side con `useQuery` (nunca `useEffect`+`useState`), e invalidar queries tras cada mutación (`queryClient.invalidateQueries()` **y** `router.refresh()`).
- `.claude/rules/efficient-queries.md:5-11` — nada de N+1; filtrar en la query, no en el frontend.
- `.claude/rules/server-components.md:5` / `.claude/rules/tab-content.md:5`, `:34`, `:92` — Server Components primero; los `TabContent` no llevan `'use client'` si son wrappers; **nunca** `<div>Cargando…</div>` como fallback de `Suspense` — Skeleton dedicado en `fallback/`.
- `.claude/rules/moment-dates.md:3` — **moment.js** para fechas, nunca date-fns ⟵ aplica al filtro de período de la certificación.
- `.claude/rules/date-pickers.md:3` / `:9-12` — los campos de fecha individuales permiten escribir la fecha; el **date range picker queda como está**.
- `.claude/rules/no-native-dialogs.md:3` — nunca `window.confirm/alert/prompt`.
- `.claude/rules/logger.md:3` — logger propio, nunca `console.*`.
- `.claude/rules/code-language.md:3` — código en inglés; español sólo en comentarios, strings de UI y slugs/ids que ya existen en la base.
- `.claude/rules/no-format-commands.md:3` / `:19` — **prohibido** correr prettier/eslint; `npm run check-types` está permitido.
- `CLAUDE.md:528-534` — el dev server **no arranca con Turbopack**: `npx next dev --webpack`; y no borrar `.next` "para limpiar".
- `CLAUDE.md:307` + `.claude/rules/git-rules.md:3`, `:9` — commits: **sólo** la línea de asunto, formato `tipo(scope): <nro ticket> - descripción`, sin cuerpo y **sin `Co-Authored-By`**; no commitear sin pedido.
- `CLAUDE.md:325` — implementación con `/feature-dev:feature-dev`, no con las skills de superpowers.
- `CLAUDE.md:498-502` — *"'¿Lo verificaste?' es la señal de que reporté terminado demasiado pronto"*: mientras falte la prueba en la app real, el estado es **"subido, verificación visual pendiente"**.

#### Borrado, soft delete y tenencia

- `CLAUDE.md:276-278` — el precedente de soft delete del proyecto es **`archived_at` (NULL = vigente)**, conservando el registro como historial y excluyéndolo de listas, status, alertas y estadísticas; sólo visible en el detalle. Las filas vacías sí se borran.
- En el dominio comercial el patrón vigente es `is_active Boolean? @default(true)` (`customer_services`, `service_items`, `customers`), no `archived_at`. `CLAUDE.md:469` obliga a **replicar lo que ya rige el flujo**: `is_active`, salvo que el ticket diga otra cosa.
- No hay regla escrita de manejo/serialización de `Decimal` hacia el cliente. El precedente en el código es convertir a `number` en el borde (`service-items.server.ts:21-24`) y el precedente de tipo para dinero es `@db.Decimal(15, 2)` (`vehicles.price`, `prisma/schema.prisma:2516`).

---

### 1.6 Riesgos identificados

#### R1 — CRÍTICO: mover áreas/sectores/equipos rompe Operaciones si se toca el esquema

Lo que el ticket llama "moverlos adentro del cliente" tiene dos lecturas con costos incomparables:

**(a) Mover sólo la UI** (las pantallas pasan a ser pestañas de la ficha del cliente, el esquema no cambia): costo bajo, cero riesgo de datos. Se rompen las URLs `?subtab=areas|sector|equipment`, los 3 tabs de `permissions-map.ts` y sus filas en `tabs`, y los specs de Cypress. Los consumidores de Operaciones **no se enteran**.

**(b) Mover el esquema** (p. ej. darle `customer_id` a `sectors`, o colapsar `sector_customer`, o reemplazar `service_areas`/`service_sectors` por FKs directas): riesgo alto. Quienes leen esas tablas hoy, y romperían:

| Consumidor | Qué se rompe |
|---|---|
| `dailyreportrows.areas_service_id` / `sector_service_id` | apuntan a `service_areas.id` / `service_sectors.id`. Cambiar esas pivotes invalida **todos los partes diarios históricos** |
| `preparte.areas_service_id` / `sector_service_id` / `equipos_cliente` / `item` | idem para prepartes |
| `dailyreport_customer_equipment_relations.customer_equipment_id` | `onDelete: Cascade` sobre `equipos_clientes`: borrar un equipo de cliente **borra silenciosamente** sus relaciones con partes diarios |
| **`PartesDiarios/detail/lib/row-query.ts:38-44, 86, 296, 452-547`** | **`FK_SORT_MAP`, `buildWhereClause`, `buildRowSelect` y los 4 assertions de perímetro. Es el archivo del que dependen el listado, el export y los facets del detalle del parte diario** |
| `Certificacion/actions/queries.server.ts:33-83` (`ROW_SELECT`) | el tablero comercial entero |
| `PartesDiarios/detail/form-data.server.ts:24-70, 344-414` | catálogo en cascada del form de Operaciones (+ `needs_personnel`/`needs_equipment`) |
| `PartesDiarios/actions/comercial-rows.server.ts:23-93` y `:177-220` | catálogo en cascada y validación de pertenencia del form de línea de Comercial |
| `Preparte/actions/bulk.server.ts:145-195` | la conversión preparte → fila de parte diario copia las 5 FKs tal cual |
| `Preparte/actions/mutations.server.ts:128-165, 229-234` | `buildSectorMap` / `buildAreaMap`: la traducción `sectors.id`→`service_sectors.id` al guardar |
| `Preparte/list/actions.server.ts:87-89, 198-207, 382-390, 440-446` | select, orderBy y **facets** del listado de prepartes |
| `Preparte/list/columns.tsx:378-413` | columnas Cliente/Contrato/Sector/Área/Equipo del DataTable |
| `Preparte/components/preparte-form/LocationSection.tsx:59-106, 146-165` | la normalización `sectors.id` ↔ `service_sectors.id` (triplicada, ver R11) |
| `PartesDiarios/detail/clone.server.ts:127-139, 265-277, 401-419` | clonado de filas y detección de duplicados |
| `PartesDiarios/detail/columns/badge-cells.tsx:261-262` | badges de equipo de cliente |
| **`prisma/sql/daily-report.sql:135, 273, 297-303`** | **`get_daily_report_deviations()`: 7 `LEFT JOIN` sobre estas tablas, llamada por `$queryRaw` desde `validation.server.ts:187`. Cambio de tabla = cambio doble (`prisma/sql` + migración, `migrations.md:64-69`)** |
| `prisma/sql/daily-report.sql:731-732, 791-793, 838-840, 878-880` | `log_dailyreport_changes()` materializa `customer_name`/`service_name`/`item_name` en el historial |
| `prisma/sql/misc.sql:99` | `build_employee_where_alias()`: `JOIN customers` para las condiciones de tipos de documento |
| **`ExternalApi/resources/commercial.ts:94-130, 165-192`** | **API pública `/api/external/v1/commercial-sectors` y `/customer-areas`: contrato con consumidores externos** |
| `Dashboard/Estadisticas/Operaciones/actions/actions.server.ts:88` | SQL crudo `JOIN customers` (mensual vs adicional) |

Y hay un problema de modelo, no sólo de código: **`sectors` es global y compartible entre clientes y entre empresas** (`sectors.server.ts:89-90`). Darle `customer_id` obliga a decidir qué pasa con un sector hoy vinculado a N clientes: ¿se duplica en N filas (y entonces los `service_sectors` históricos apuntan a cuál)? ¿Se deja como está y sólo cambia la UI? Esta pregunta **no la resuelve el ticket**.

Guardas que ya existen porque esto ya explotó: `services.server.ts:108` (`FK_IN_USE_MESSAGE`), `sectors.server.ts:126-128`, `areas.server.ts:76-87`.

**Riesgo adicional en el flujo de edición de sectores, hoy:** `updateSector()` (`sectors.server.ts:99-120`) calcula el diff con `diffAssignments(sector.sector_customer.map(sc => sc.customer_id), [values.customer_id])` — es decir, contra **un único cliente**, el del formulario. Para un sector vinculado a 3 clientes de la misma empresa, guardar el form **desvincula los otros 2**. El `deleteMany` está correctamente acotado a `toRemove` y a la empresa activa, así que no es el bug de "borrar todo", pero el efecto para el usuario es el mismo: el form trata como 1:1 lo que en la base es N:M. Es exactamente el escenario que `CLAUDE.md:477-490` describe.

#### R2 — CRÍTICO: introducir dinero convierte cualquier bug en un error monetario silencioso

Hoy `item_price` no se usa para nada, así que un valor mal cargado no tiene consecuencia. Una vez que exista certificación valorizada, el mismo error factura mal. Puntos concretos:

- **`service_items.item_price` es `Decimal @db.Decimal` sin precisión ni escala** (`prisma/schema.prisma:2211`). `numeric` sin `(p,s)` en Postgres acepta cualquier escala: `1234.5678901` entra sin quejarse y después se redondea distinto en cada suma. `vehicles.price` ya usa `@db.Decimal(15, 2)`: hay precedente para fijarlo.
- **El precio hace el viaje completo por `number` de JS.** Zod lo castea con `z.preprocess((val) => Number(val), …)` (`schemas/service-item.ts:9`), la action lo vuelve a `Decimal` (`service-items.server.ts:72`) y al leer se convierte otra vez a `number` (`:22-24`). Todo cálculo hecho en el cliente sobre ese `number` arrastra error de punto flotante. `CLAUDE.md:562-568` es explícito: si la fórmula del total se escribe en el server y otra vez en el cliente, **va a divergir**.
- **No hay moneda.** Existe `currency_enum` y lo usan `vehicles` y `other_equipment`, pero no `service_items`. Si el cliente trabaja en más de una moneda, cualquier suma de ítems es una suma de peras con manzanas y nadie se entera.
- **No hay cantidad en `dailyreportrows`** (ver R3): sin cantidad, el importe de una línea es una convención implícita.
- **`service_items` no tiene ninguna auditoría** (ni trigger, ni `*_history`) y **`customer_services` tampoco**. Hoy un cambio de precio no deja rastro de quién ni cuándo. En cuanto el precio vale dinero, eso es inaceptable: un precio cambiado a mitad de un período de certificación re-valoriza silenciosamente trabajo ya hecho. El proyecto **no tiene PITR** (`CLAUDE.md:490`), así que un `UPDATE` errado de precios no se puede rebobinar.
- **El historial previo no es reconstruible.** `CLAUDE.md:420-428`: el precio anterior a la migración es `NULL`, **nunca `0`** — cero significaría "el ítem valía cero".
- **Decisión de diseño ineludible**: ¿la certificación **congela** el precio en la línea (snapshot) o lo **resuelve** contra el precio vigente a la fecha? Son comportamientos distintos y el ticket no lo dice. Si no se congela, reimprimir una certificación vieja puede dar otro total.

#### R3 — ALTO: falta la cantidad, o sea falta la mitad de la fórmula

`dailyreportrows` no tiene ninguna columna de cantidad (verificado en `information_schema.columns`). Lo que hay para medir el trabajo de una línea es `start_time`/`end_time`, `working_day`, `completed_day`, `completed_night`. La única cantidad del flujo es `preparte.quantity` (`numeric`), y **se pierde**: `confirmSinglePreparte()` (`Preparte/actions/bulk.server.ts:164-181`) copia `cliente_id`, `contrato_id`, `item`, `sector_service_id`, `areas_service_id`, `jornada`, `tipo`, `observaciones`, horas y `preparte_id` — y **no copia `quantity`**, porque no hay columna destino. Es decir: el operador pide 8 unidades de un ítem, el preparte se confirma, y la fila del parte diario no sabe cuántas.

Además `service_items` tiene `item_measure_units` → `measure_units` (con `tipo`), así que la unidad puede ser hora, viaje, m³, etc., y **la cantidad no se deriva igual según la unidad**.

Sin una regla explícita de cómo se obtiene la cantidad de cada línea, no hay certificación posible. Y si la regla se elige "por criterio propio", el resultado es un número que parece bien y está mal.

#### R4 — ALTO: se trabaja sobre 292 archivos sin commitear, varios de ellos los del ticket

La base no está consolidada, y la intersección no es marginal: 13 de los archivos modificados son de `Empresa/Clientes` y `Comercial`, más `permissions-map.ts` y `OperacionesComponent.tsx`. Consecuencias prácticas: `git diff` deja de servir para aislar el trabajo de este ticket; un `git stash`/`checkout` mal hecho se lleva la refactorización del sidebar; y no hay un punto conocido-bueno al que volver si la migración de precios sale mal. `CLAUDE.md:438-447` muestra que este proyecto ya sufrió el problema de trabajo apilado sin liberar.

#### R5 — MEDIO-ALTO: hay tres entradas a lo mismo y la herencia de permisos se apoya en una tab que puede desaparecer

Contratos e ítems se administran hoy desde tres lugares (tab `service` de Comercial, pestaña Contratos de la ficha, ruta `/dashboard/configuration/services/[id]`). Y la pestaña de la ficha **no tiene permiso propio**: hereda `comercial:service:view` por decisión documentada (`permissions-map.ts:1183-1185`, `CustomerDetail.tsx:62`, `:84`). Si el rediseño elimina la tab `service`, **la ficha del cliente pierde su fuente de permiso** y la pestaña Contratos deja de verse para todos, en silencio (el `PermissionGuard` simplemente no renderiza). Lo mismo vale para las tabs `areas`, `sector` y `equipment` si se eliminan sin reemplazar el slug.

#### R6 — MEDIO: el trigger `after_service_update` está mal enganchado a `service_items`

`deactivate_service_items()` (`prisma/sql/misc.sql:228-238`) hace `UPDATE service_items SET is_active = NEW.is_active WHERE customer_service_id = NEW.id`. Está enganchado a `customer_services` (`misc.sql:1031`) — correcto — **y también a `service_items`** (`misc.sql:1045-1047`), donde `NEW.id` es el id del ítem: la cláusula no matchea nada. Es un no-op hoy. Dos riesgos: (a) si el rediseño toca `is_active` de ítems en masa, ese trigger se dispara fila por fila y escanea `service_items` cada vez; (b) si alguien lo "corrige" sin entender, cada edición de un ítem desactiva/activa **todos** los ítems de su contrato. `CLAUDE.md:546-560` exige auditar el grafo **sobre la base viva** antes de tocar cualquier trigger, y `CLAUDE.md:272-274` recomienda la lista explícita de columnas en el `WHEN` (que acá ya está: `UPDATE OF is_active`).

Nota relacionada: desactivar un contrato **sí** desactiva todos sus ítems en cascada. Si el versionado de precios guarda estado por ítem, esa cascada lo va a afectar.

#### R7 — MEDIO: tablas nuevas contra reglas de DataTable que el módulo actual no cumple

Todo lo que hay hoy en Comercial usa `BaseDataTable` + `savedVisibility`/`savedFilters` por cookies + toolbar legacy (`EnhancedComercialReportTable.tsx:12-13`, comentario `:28-30` *"Columna filtrable del toolbar legacy"*; `areaTable.tsx:8-9`; `ServiceItemsTable.tsx:8-9`) — todos marcadores del sistema viejo según `datatable.md:400-412`. Las reglas dicen *"NUNCA parchear una tabla del sistema viejo. Siempre recrear completamente"* (`datatable.md:430`) y *"TODA tarea que involucre DataTables DEBE delegarse al agente `table-expert`"* (`CLAUDE.md:78`), pero también dicen que no se migra lo que el ticket no pide (`CLAUDE.md:457`). Además, meter 4-6 tablas en la ficha del cliente activa dos reglas que hoy nadie está aplicando ahí: `stripPrefixFromSearchParams` (`datatable.md:19`) y `paramNamespace={tableId}` (`:28`) — sin ellas los filtros de las tablas se pisan entre sí.

Volumen a rehacer: `DailyReportWrapper.tsx` 697 líneas + `EnhancedComercialReportTable.tsx` 698 líneas.

#### R8 — MEDIO: `documents_contracts.contract_id` no tiene integridad referencial

Es `String` sin `@db.Uuid` y sin FK (`prisma/schema.prisma:994-1009`), lo que obliga a `storage-perimeter.ts:74-82` a hacer dos consultas para validar el perímetro. Si los contratos se mueven, se renumeran o se borran, quedan documentos huérfanos en la tabla y archivos huérfanos en el bucket `contract-documents`, y la base no avisa.

#### R9 — MEDIO: pérdida de cobertura E2E y de navegación

Los 7 specs `cypress/e2e/comercial/comerce--*.cy.ts` navegan a URLs literales `?tab=comerce&subtab=<slug>`. Están casi todos en estado "A IMPLEMENTAR" (sólo verifican la URL), así que su valor real es bajo, pero se van a romper todos. `cypress/e2e/dashboard-navigation.cy.ts:18-19` también toca `/dashboard/comercial`, y ya figura como modificado en el working tree. Y `navigation.ts` advierte explícitamente que si se agrega o renombra una tab de primer nivel **hay que reflejarlo ahí**, porque si no el módulo cae a su tab por defecto **en silencio**.

#### R10 — MEDIO: hay una API pública externa sobre estas tablas

`src/features/ExternalApi/resources/commercial.ts` expone `customers`, `sectors` + `sector_customer` y `areas_cliente` con tipos públicos propios (`PublicCustomer`, `PublicCommercialSector`, `PublicCustomerArea`), servidos en `/api/external/v1/customers`, `/api/external/v1/commercial-sectors` y `/api/external/v1/customer-areas`. Hay `external_api_clients` y `external_api_access_logs` en el esquema (`prisma/schema.prisma:3383`, `:3411`), o sea que esto está pensado para integraciones de terceros. Cualquier cambio de forma en esas tres tablas es un **cambio de contrato con consumidores que no controlamos** y que no se detecta con `check-types`. Antes de tocar el esquema hay que saber si hay clientes de la API activos.

#### R11 — MEDIO: la traducción `sectors.id` ↔ `service_sectors.id` está escrita tres veces

`Preparte/actions/mutations.server.ts:128` (`buildSectorMap`) y `:146` (`buildAreaMap`) en el servidor, `preparte-form/LocationSection.tsx:59-106` y `:146-165` en el cliente, y otra vez en `PreparteManager.tsx:380-405`. Las tres toleran valores "legacy" (un `sectors.id`, o incluso un `sector_customer.id`, guardado donde debería haber un `service_sectors.id`), lo que confirma que **en la base hay datos con la identidad equivocada**. `CLAUDE.md:562-568` es taxativo: *"Una columna calculada con la misma regla escrita en varios lugares va a divergir"*, y *"el síntoma para el usuario era intermitente y por eso difícil"*. Si el rediseño toca sectores o áreas, esas tres copias hay que unificarlas o van a discrepar. Lo mismo vale para `get_daily_report_deviations()` (SQL) y su réplica `PartesDiarios/lib/resource-deviations.ts` (TypeScript): dos implementaciones de la misma regla de desvíos.

#### R12 — MEDIO: el perímetro de empresa está sólo en código, triplicado, y con dos criterios distintos

No hay RLS (`migrations.md:5`). Todo el perímetro son assertions de aplicación: `row-query.ts:452-547` (`assertDailyReportInCompany`, `assertRowInCompany`, `filterRowsInCompany`, `assertRowResourcesInCompany`), duplicadas casi literalmente en `comercial-rows.server.ts:180-235` y en `Preparte/actions/mutations.server.ts:56-101`. Y para `service_items` hay dos criterios en uso: `catalogs.server.ts:89` filtra por `service_items.company_id`, mientras `mutations.server.ts:82` y `row-query.ts:500` lo hacen por `customer_services → customers.company_id`. Sumado a la fuga ya existente de `getFilterSectors()` (`catalogs.server.ts:136-144`, sin filtro de empresa), cualquier pantalla nueva que se agregue tiene tres precedentes distintos para copiar, y dos están mal.

#### R13 — BAJO-MEDIO: la base local no sirve para validar

Las 19 tablas del dominio comercial tienen **0 filas**. No se puede probar la migración de precios, ni el backfill, ni las guardas de FK, ni el cálculo de la certificación con datos reales. Todo lo que se verifique local es con datos fabricados a mano. `CLAUDE.md:558` recomienda probar equivalencia *"con datos reales, en transacción descartada"* (`BEGIN; …; ROLLBACK;`) — para eso hace falta acceso a una base con datos (dev/prod del cliente), que hay que pedir.

#### R14 — BAJO: tenencia de `sectors` y `measure_units` sin resolver ni registrada

Las dos son globales (sin `company_id`) y **no figuran** en el relevamiento de "Tablas sin company_id (decisión multi-tenant pendiente)" del plan maestro (`docs/superpowers/plans/2026-09-18-plan-maestro-deuda-tecnica.md:602-631`). `measure-units.server.ts:15-17` lo documenta como decisión consciente (*"catálogo global (sin `company_id`)"*), pero si áreas/sectores pasan a vivir "dentro del cliente", la pregunta de a quién pertenece un sector deja de ser teórica. `migrations.md:74` es la regla: *"toda funcion recibe/filtra `company_id`"*.

---

### 1.7 Decisiones tomadas y preguntas abiertas

#### Decisiones del usuario (2026-09-26) — cierran los bloqueantes

| # | Pregunta | Decisión |
|---|---|---|
| 3 | ¿Mover a áreas/sectores/equipos es sólo UI o también esquema? | **También esquema.** "Estamos arrancando desde 0, podemos modificar la DB". Cae R1 (no hay histórico que invalidar) y con él la parte cara del riesgo. |
| 4 | `sectors` global y compartido | **Pasa a ser por cliente.** "La estructura como estaba, estaba bien para GH; ahora cambia". |
| 5 | ¿De dónde sale la cantidad? | **1 por línea**, salvo que el parte traiga una cantidad explícita: en ese caso manda la del parte. |
| 7 | ¿Certificación entidad o vista? | **Entidad persistida.** |
| 6 | ¿Precio congelado o resuelto a la fecha? | Las actualizaciones llevan un indicador de **`current`**; ese es el precio a utilizar. (Ver la salvedad de abajo.) |
| 2 | ¿Cómo se actualizan los precios? | **Tabla de reglas.** Métodos: por **índice**, por **fórmula polinómica**, y **manual**. |
| 14 | ¿Hay datos reales? | **No.** Es un desarrollo que mejora el sistema del que se parte; no hay migración de datos. |

#### Decisiones de la segunda tanda (2026-09-26)

| Pregunta | Decisión |
|---|---|
| Congelado del precio | **El `current` se usa sólo al momento de emitir.** Una vez emitida y confirmada, la certificación queda fijada al valor con el que se emitió. Implica que **la certificación tiene estados**. |
| Contratos | **Dentro** de la ficha del cliente. |
| Moneda y precisión | Delegada — ver abajo. |
| Permiso de precios | **Sí**, permiso propio. |
| Consolidar los 292 archivos antes de empezar | **Sí.** |

##### Congelado y estados — lo que implica

El precio no se congela al crear la línea sino **al emitir**: mientras la certificación está en borrador refleja el `current` vigente y se recalcula sola; al emitirla, el precio unitario de cada línea se **copia a la línea** y a partir de ahí el documento no vuelve a mirar el catálogo. Reimprimir o reabrir una certificación emitida devuelve exactamente los mismos importes.

Eso obliga a una máquina de estados (borrador → emitida → confirmada, más anulación) y a una regla dura: **una certificación emitida no se muta**. Si hay que corregirla se anula y se emite otra, que es lo que ya manda `CLAUDE.md` para registros en estado cerrado ("nunca reutilizar/mutar un registro en estado cerrado: crear uno nuevo").

##### Moneda y precisión — decisión tomada

Delegada al criterio técnico. Se resuelve así:

- **Precio unitario: `Decimal(15,4)`.** Cuatro decimales, no dos. Los métodos de actualización por índice y por fórmula polinómica multiplican por coeficientes; redondear el unitario a 2 decimales *antes* de multiplicarlo por la cantidad arrastra el error a cada línea y lo amplifica con el volumen.
- **Importes y totales: `Decimal(15,2)`.** El redondeo ocurre **una sola vez, en el importe de la línea** (cantidad × unitario). Los totales son la suma de importes ya redondeados, no el redondeo de una suma: así el documento impreso cierra exactamente, que es lo que el cliente va a verificar a mano.
- **Moneda: en el contrato, no en el ítem.** Un contrato está en una moneda. Código ISO de 3 caracteres con default `ARS`. Se guarda aunque hoy sea siempre el mismo: cuesta nada ahora y evita una migración con datos vivos después.
- **Sin conversión multimoneda.** No hay tabla de cotizaciones ni importes convertidos. Un contrato en USD se certifica en USD. Es un límite de alcance deliberado: nadie lo pidió y arrastra decisiones (cotización de qué fecha, de qué fuente) que no tienen respuesta en el ticket.
- **Regla de aritmética: los importes nunca se convierten a `number` de JavaScript.** Prisma devuelve `Decimal`; las cuentas se hacen con `Decimal` o en SQL. Es la mitigación concreta de R2: un `number` de JS no puede representar exactamente la mayoría de los decimales, y el error aparece recién en el total de una certificación grande, sin que nada falle en el camino.

#### Corrección al análisis (verificada sobre el código)

La feature `src/features/Operaciones/Certificacion/` (21 archivos) **no es de Operaciones ni es código muerto**: su único consumidor es `src/features/Comercial/Comerce/components/DailyReportWrapper.tsx`. Es el motor de la pantalla de partes diarios **del módulo Comercial**, alojado en la carpeta equivocada. Corrige la afirmación de §1.2 de que la certificación es enteramente nueva: la **vista** existe y hay que terminarla y reubicarla; lo nuevo es la **entidad** persistida.

`workshop_sectors` (mantenimiento) es una tabla distinta de `sectors` (comercial) y ya tiene `company_id`: el cambio de la decisión 4 no la toca.

`dailyreportrows` tiene **cuatro** rutas de alta (`clone.server.ts:265`, `mutations.server.ts:195`, `comercial-rows.server.ts:300`, `bulk.server.ts:166`). La regla de cantidad de la decisión 5 tiene que vivir en un solo lugar que las cuatro consuman, o va a divergir (`CLAUDE.md`, "una columna calculada con la misma regla escrita en varios lugares va a divergir").

#### Preguntas que siguen abiertas


#### Las que el ticket deja explícitamente sin resolver

1. **Contratos: ¿dentro del detalle del cliente o aparte solo-lectura?** El ticket dice literalmente "revisar si". Y hace falta la sub-respuesta: si van "aparte solo visualización", ¿solo-lectura incluye documentos e **ítems** (que es donde viven los precios)?
2. **¿Cómo se actualizan los precios?** El ticket: *"Las formas de actualizar un precio pueden ser varias, tenemos que pensar como vamos a resolver este punto para que sea adaptable a cada empresa y a cada contrato"*. Concretamente: ¿alta manual por ítem? ¿ajuste porcentual masivo por contrato? ¿por índice/polinómica con vigencia? ¿importación desde planilla? ¿varias de esas conviviendo? "Adaptable a cada empresa y a cada contrato" sugiere que el **método** es configurable, lo que es un modelo de datos en sí mismo (una tabla de reglas de actualización), no un campo.

#### Las que surgen del código y bloquean el diseño

3. **¿Qué significa exactamente "moverlos adentro del cliente" para áreas, sectores y equipos: sólo la UI, o también el esquema?** (R1). Si es sólo UI, el ticket es de tamaño mediano; si toca el esquema, es un proyecto con migración de datos históricos de partes diarios.
4. **`sectors` es global y compartible entre clientes y entre empresas.** ¿Se acepta que quede así (y "está dentro del cliente" es sólo la pantalla)? ¿O se duplica un sector por cliente? Si se duplica, ¿qué pasa con los `service_sectors` históricos que apuntan a la fila compartida?
5. **¿De dónde sale la cantidad de cada línea de parte diario?** (R3). Hoy no existe la columna, y `preparte.quantity` **se descarta** al confirmar el pedido (`bulk.server.ts:164-181`). ¿Se agrega `quantity` a `dailyreportrows` y se propaga desde el preparte? ¿Se calcula de `start_time`/`end_time` cuando la unidad es hora? ¿Es 1 por línea? ¿Depende de `measure_units.tipo`? Y si se propaga: ¿qué pasa con las filas históricas, que no tienen de dónde tomarla (→ `NULL`, nunca `0`, `CLAUDE.md:428`)?
6. **¿La certificación congela el precio en la línea o lo resuelve a la fecha?** Y una vez emitida, ¿es inmutable? (`CLAUDE.md:390-394` dice que no se mutan registros en estado cerrado: *"crear uno nuevo"*).
7. **¿Qué es una certificación como entidad?** ¿Cabecera con cliente + contrato + período + número + estado + total, y líneas propias? ¿O es una **vista** sobre `dailyreportrows` filtrada por período, sin persistir nada? La diferencia es toda la arquitectura: numeración, reimpresión, reapertura, anulación.
8. **¿Moneda?** ¿Un solo signo monetario implícito, o `currency_enum` en el ítem / en el contrato? Si es multimoneda, ¿cotización a qué fecha?
9. **Precisión y redondeo.** ¿`Decimal(15,2)` como `vehicles.price`? ¿Dónde se redondea: por línea o por total? ¿El precio unitario admite más de 2 decimales?
10. **¿Quién puede ver y cambiar precios?** Hoy los ítems se manejan con el permiso `comercial:comerce:items-contrato` (`view/create/update`). Un precio no es un dato como los otros: ¿hace falta un permiso propio para "modificar precios" y otro para "ver importes" en la certificación?
11. **¿Qué se hace con las tabs que se vacían?** Si `areas`, `sector`, `equipment` y/o `service` dejan de ser tabs de primer nivel: ¿se borran de `permissions-map.ts` y de `tabs`, o se conservan como slug para no romper la herencia de permisos de la ficha del cliente (R5)? ¿Y qué pasa con los `role_permissions` que roles custom de la empresa ya tienen asignados sobre esas tabs?
12. **¿Y `mensure_units` y `daily_reports` (las otras dos subtabs)?** El ticket no las menciona. `CLAUDE.md:455` dice que lo no mencionado queda tal cual — pero si el módulo se queda con esas dos solas, el resultado es raro. ¿La sección "Partes Diarios" de Comercial se transforma en la certificación, o queda y la certificación es nueva?
13. **¿Se rehacen las tablas al sistema vigente de DataTable?** (R7). Las reglas del repo dicen "nunca parchear el sistema viejo, recrear" y "delegar al `table-expert`"; el ticket no habla de tablas. Es una decisión de alcance del usuario.
14. **¿Hay acceso a una base con datos reales (dev/prod del cliente) para validar?** (R13). Sin eso, la migración se escribe a ciegas.
15. **¿Se consolidan primero los 292 archivos sin commitear?** (R4). Arrancar sobre una base no consolidada es una decisión, y conviene que sea explícita.
16. **¿Se corrige el trigger `after_service_update` mal enganchado a `service_items`?** (R6). Es un bug preexistente que el ticket no menciona; `CLAUDE.md:455` diría que no se toca, pero el rediseño de ítems lo va a pisar.
17. **¿Se le pone FK a `documents_contracts.contract_id`?** (R8). Mismo razonamiento de alcance.
18. **¿Hay consumidores activos de la API pública `/api/external/v1/{customers,commercial-sectors,customer-areas}`?** (R10). Si los hay, el esquema de esas tres tablas es un contrato y no se puede cambiar sin versionar la API.
19. **¿Se unifica la traducción `sectors.id` ↔ `service_sectors.id` (hoy triplicada) y se limpian los datos con la identidad equivocada?** (R11). Es deuda preexistente que el rediseño va a pisar.
20. **`assing_customer` está muerta (0 consumidores). ¿Se dropea en este ticket o queda?** (§1.2.3). El alcance dice que no se toca lo no mencionado; se pregunta porque el ticket habla justamente de "equipos y áreas del cliente" y alguien podría creer que esa tabla participa.
21. **¿Se corrige la fuga de `getFilterSectors()` (sectores de todas las empresas en el filtro del tablero comercial)?** (R12). Está asumida en un comentario, pero si el rediseño toca sectores hay que decidir.

---

## 2. Planificación
_Pendiente - ejecutar `/planificar modulo-comercial`_

## 3. Diseño
_Pendiente - ejecutar `/disenar modulo-comercial`_

## 4. Implementación
_Pendiente - ejecutar `/implementar modulo-comercial`_

## 5. Verificación
_Pendiente - ejecutar `/verificar modulo-comercial`_
