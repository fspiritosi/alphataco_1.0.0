# Modulo de Indumentaria y EPP — Spec de Diseno

**Fecha**: 2026-03-18
**Estado**: Aprobado
**Alcance**: 80 hs estimadas (catalogo maestro + vista mobile + reportes + PDF placeholder)

---

## 1. Resumen

Modulo integrado a GH Gestion para gestionar la entrega de ropa de trabajo y elementos de proteccion personal (EPP) al personal. NO incluye gestion de stock.

Tres ubicaciones:

1. **Dashboard > Empresa > RRHH > Listado Maestro de Articulos** — Catalogo con 4 subtabs (Articulos, Marcas, Talles, Reportes)
2. **Detalle Empleado > Tab "Indumentaria"** — Historial de entregas recibidas (readonly)
3. **Ruta standalone `/clothing`** — Vista mobile-first con login propio para registrar entregas en campo

---

## 2. Modelo de Datos

### 2.1. Enum

```prisma
enum clothing_delivery_type {
  PLANNED_CCT
  PLANNED_EPP
  REPLACEMENT
}
```

### 2.2. Tablas

#### `clothing_brands` — Catalogo de marcas

| Campo      | Tipo     | Constraints                     |
| ---------- | -------- | ------------------------------- |
| id         | UUID PK  | default gen_random_uuid()       |
| name       | String   | NOT NULL                        |
| is_active  | Boolean  | default true                    |
| company_id | UUID FK  | → company.id, ON DELETE CASCADE |
| created_at | DateTime | default now()                   |
| updated_at | DateTime | default now()                   |

Unique constraint: (`name`, `company_id`)

#### `clothing_sizes` — Catalogo de talles

| Campo      | Tipo     | Constraints                     |
| ---------- | -------- | ------------------------------- |
| id         | UUID PK  | default gen_random_uuid()       |
| name       | String   | NOT NULL                        |
| is_active  | Boolean  | default true                    |
| company_id | UUID FK  | → company.id, ON DELETE CASCADE |
| created_at | DateTime | default now()                   |
| updated_at | DateTime | default now()                   |

Unique constraint: (`name`, `company_id`)

#### `clothing_items` — Catalogo de articulos

| Campo       | Tipo     | Constraints                     |
| ----------- | -------- | ------------------------------- |
| id          | UUID PK  | default gen_random_uuid()       |
| name        | String   | NOT NULL                        |
| code        | String?  | Codigo interno opcional         |
| description | String?  |                                 |
| is_active   | Boolean  | default true                    |
| company_id  | UUID FK  | → company.id, ON DELETE CASCADE |
| created_at  | DateTime | default now()                   |
| updated_at  | DateTime | default now()                   |

Unique constraint: (`name`, `company_id`)

#### `clothing_item_brand_sizes` — Pivot articulo-marca-talle

| Campo             | Tipo     | Constraints                   |
| ----------------- | -------- | ----------------------------- |
| id                | UUID PK  | default gen_random_uuid()     |
| clothing_item_id  | UUID FK  | → clothing_items.id, CASCADE  |
| clothing_brand_id | UUID FK  | → clothing_brands.id, CASCADE |
| clothing_size_id  | UUID FK  | → clothing_sizes.id, CASCADE  |
| created_at        | DateTime | default now()                 |

Unique constraint: (`clothing_item_id`, `clothing_brand_id`, `clothing_size_id`)

Define que combinaciones articulo+marca+talle son validas. Ej: "Camisa Ombu" viene en S/M/L, "Camisa Pampero" viene en 38/40/42.

#### `clothing_deliveries` — Entregas registradas

| Campo           | Tipo                   | Constraints                 |
| --------------- | ---------------------- | --------------------------- |
| id              | UUID PK                | default gen_random_uuid()   |
| employee_id     | UUID FK                | → employees.id, NOT NULL    |
| delivered_by_id | UUID FK                | → employees.id, NOT NULL    |
| delivery_type   | clothing_delivery_type | NOT NULL                    |
| signature_url   | String?                | URL imagen firma en Storage |
| notes           | String?                |                             |
| delivered_at    | DateTime               | NOT NULL                    |
| company_id      | UUID FK                | → company.id, CASCADE       |
| created_at      | DateTime               | default now()               |
| updated_at      | DateTime               | default now()               |

#### `clothing_delivery_items` — Detalle lineas de entrega

| Campo                | Tipo     | Constraints                       |
| -------------------- | -------- | --------------------------------- |
| id                   | UUID PK  | default gen_random_uuid()         |
| clothing_delivery_id | UUID FK  | → clothing_deliveries.id, CASCADE |
| clothing_item_id     | UUID FK  | → clothing_items.id               |
| clothing_brand_id    | UUID FK? | → clothing_brands.id (nullable)   |
| clothing_size_id     | UUID FK? | → clothing_sizes.id (nullable)    |
| quantity             | Int      | NOT NULL, default 1               |

---

## 3. Ubicacion 1: Dashboard > Empresa > RRHH > Listado Maestro de Articulos

### 3.1. Navegacion

Nueva subtab bajo RRHH en el modulo Empresa:

```
Empresa > RRHH (tab existente)
  └── Listado Maestro de Artículos (nueva subtab hija de RRHH)
       ├── Artículos
       ├── Marcas
       ├── Talles
       └── Reportes
```

### 3.2. Subtab Articulos

**DataTable** de `clothing_items` con CRUD:

Columnas:

- `name` — Nombre del articulo (text filter)
- `code` — Codigo interno (text filter)
- `description` — Descripcion (text filter, hidden by default)
- `is_active` — Estado (faceted: Activo/Inactivo)
- `created_at` — Fecha creacion (dateRange, hidden by default)
- `actions` — Ver detalle / Editar / Eliminar

Formulario CRUD (Dialog o Sheet):

- name (requerido)
- code (opcional)
- description (opcional)

**Gestion de combinaciones marca-talle**: En el detalle/edicion de un articulo, seccion para configurar que marcas y talles aplican. UI tipo: seleccionar marca → seleccionar talles disponibles para esa marca. Se persiste en `clothing_item_brand_sizes`.

### 3.3. Subtab Marcas

**DataTable** de `clothing_brands` con CRUD simple:

Columnas:

- `name` — Nombre de la marca (text filter)
- `is_active` — Estado (faceted)
- `created_at` — Fecha creacion (dateRange, hidden)
- `actions` — Editar / Eliminar

Formulario: solo `name` (requerido).

### 3.4. Subtab Talles

**DataTable** de `clothing_sizes` con CRUD simple:

Columnas:

- `name` — Nombre del talle (text filter)
- `is_active` — Estado (faceted)
- `created_at` — Fecha creacion (dateRange, hidden)
- `actions` — Editar / Eliminar

Formulario: solo `name` (requerido).

### 3.5. Subtab Reportes

**DataTable** de `clothing_deliveries` (readonly, sin CRUD):

Columnas:

- `delivered_at` — Fecha de entrega (dateRange filter)
- `employee` — Empleado receptor con legajo `[file] lastname firstname` (faceted FK)
- `delivered_by` — Entregado por con legajo (faceted FK)
- `delivery_type` — Tipo (faceted enum: Planificada CCT / Planificada EPP / Reposicion)
- `items_summary` — Resumen de articulos entregados (virtual, sin filtro)
- `signature` — Firma (icono Check/X, faceted boolean "Con firma"/"Sin firma")
- `notes` — Notas (text filter, hidden by default)
- `created_at` — Fecha registro (dateRange, hidden)

Filtros avanzados (requieren `where` custom en Prisma):

- Por puesto del empleado receptor: `{ employee: { company_position_id: { in: ids } } }` (join employees → company_positions)
- Por articulo especifico: `{ clothing_delivery_items: { some: { clothing_item_id: { in: ids } } } }` (M:M-through via delivery_items)

Ambos filtros usan logica custom en `buildWhereClause` ya que `buildFiltersWhere` no maneja joins anidados nativamente.

Exportacion Excel con formatters para enum y fechas.

---

## 4. Ubicacion 2: Detalle Empleado > Tab "Indumentaria"

### 4.1. Posicion

Nueva tab en `EmployeeTabs` (TabsManagerClientSide), despues de "Documentacion":

```
Datos Personales | Datos de Contacto | Datos Laborales | Documentación | Indumentaria | Diagramas
```

Agregar la nueva tab al array `tabs` en `EmployeeDetailClient.tsx`. La clase `grid-cols-*` se calcula dinamicamente por `TabsManagerClientSide` — no requiere cambio manual.

### 4.2. Contenido

**DataTable** readonly de entregas de ESE empleado (filtrado por `employee_id`):

Columnas:

- `delivered_at` — Fecha (dateRange)
- `delivery_type` — Tipo (faceted enum)
- `delivered_by` — Entregado por con legajo (faceted FK)
- `items_detail` — Articulos entregados: articulo, marca, talle, cantidad (expandible o tooltip)
- `signature` — Firma (icono)
- `notes` — Notas (text, hidden)

Sin boton de crear — las entregas se registran desde la ruta standalone `/clothing`.

### 4.3. Permisos

- Tab protegida por permiso `view` en `empleados:indumentaria_empleado`
- Sin acciones de `create`/`update`/`delete` en esta vista
- Deshabilitada en modo `new` (empleado nuevo)

---

## 5. Ubicacion 3: Ruta Standalone `/clothing`

### 5.1. Rutas

```
/clothing              → page.tsx: redirige a /clothing/login o /clothing/delivery
/clothing/login        → Login email+password (patron /operator/login)
/clothing/(panel)/     → Layout con auth guard + ClothingLayoutProvider
  /clothing/delivery   → Wizard de registro de entrega
/clothing/thanks       → Confirmacion post-entrega (redirect a /clothing/delivery en 5s)
```

### 5.2. Autenticacion

- Login con `supabase.auth.signInWithPassword(email, password)`
- Post-login: validar que el perfil tiene `employee_id` vinculado
- Setear cookie `actualComp` con el `company_id` del empleado
- Guard en layout `(panel)/`: llamar `getClothingOperatorContext()` → si null, redirect a `/clothing/login`

**`getClothingOperatorContext()` — logica explicita:**

1. Obtener user de `supabase.auth.getUser()`
2. Buscar `profile` por `user.id` → obtener `employee_id`
3. Si `profile.employee_id` es null → retornar null (login invalido, no tiene empleado vinculado)
4. NO requiere `workshop_sector_id` (a diferencia de `/operator`)
5. Buscar employee por `employee_id` → obtener `company_id`, `firstname`, `lastname`, `file`
6. Retornar `{ userId, employeeId, employeeName, companyId }` — `employeeId` se usa como `delivered_by_id` al crear entregas

### 5.3. Layout

- Sin sidebar, sin navbar, sin PermissionsProvider
- `ClothingLayoutProvider`: React context con `userId`, `employeeId`, `employeeName`, `companyId`
- `QueryClientProvider` independiente
- Header minimalista con nombre del usuario logueado y boton de logout

### 5.4. Wizard de Entrega (5 pasos)

**Step 1 — Seleccionar empleado receptor**

- Combobox/search de empleados activos de la empresa
- Mostrar: `[file] Apellido Nombre` (campo `file` del modelo employees = legajo)
- Al seleccionar, mostrar card con info del empleado (puesto, CUIL)

**Step 2 — Tipo de entrega**

- Select con 3 opciones: Planificada CCT / Planificada EPP / Reposicion
- Simple, un solo campo

**Step 3 — Agregar articulos**

- Lista editable de items
- Cada item: Articulo (combobox) → Marca (combobox, filtrado por articulo) → Talle (combobox, filtrado por articulo+marca) → Cantidad (input numerico)
- Boton "Agregar otro articulo"
- Validacion: al menos 1 articulo

**Step 4 — Firma digital**

- Canvas de firma (libreria `signature_pad`)
- Responsive para funcionar bien en mobile
- Boton "Limpiar firma" y "Confirmar firma"
- Al confirmar: subir imagen a Supabase Storage bucket `clothing-signatures` (publico, accesible por URL directa para uso en PDFs)

**Step 5 — Resumen y confirmar**

- Resumen de la entrega: empleado, tipo, articulos, firma (preview)
- Boton "Confirmar entrega"
- Al confirmar: crear `clothing_delivery` + `clothing_delivery_items` + redirect a `/clothing/thanks`

### 5.5. UI/UX Mobile-First

- Layout responsive: stepper lineal en la parte superior + card de contenido debajo. En `lg` se puede usar side-stepper (card lateral) + card de contenido (patron `lg:grid-cols-3`). En mobile el stepper colapsa a indicador compacto
- Cards con padding generoso para touch
- Inputs grandes para facilitar uso en campo
- ScrollArea para listas largas de items

---

## 6. PDF (Deshabilitado — placeholder)

- Server action `generateDeliveryPdf()` que retorna error "Funcionalidad no disponible aun"
- Boton en UI deshabilitado con tooltip "Proximamente"
- Cuando se tenga el formato fisico, implementar layout con `@react-pdf/renderer`

---

## 7. Feature Structure

```
src/features/Clothing/
├── ClothingItems/                    # Subtab Articulos
│   ├── ClothingItemsTabContent.tsx   # Server Component
│   ├── ClothingItemsList/            # DataTable 3-layer
│   │   ├── ClothingItemsList.tsx     # Server Component
│   │   ├── columns.tsx
│   │   ├── actions.server.ts
│   │   ├── components/
│   │   │   └── _ClothingItemsDataTable.tsx
│   │   └── fallback/
│   │       └── ClothingItemsTableSkeleton.tsx
│   └── components/                   # Form CRUD + gestion marca-talle
│       ├── ClothingItemForm.tsx
│       └── ItemBrandSizeManager.tsx
│
├── ClothingBrands/                   # Subtab Marcas
│   ├── ClothingBrandsTabContent.tsx
│   ├── ClothingBrandsList/           # DataTable 3-layer
│   │   ├── ...
│   └── components/
│       └── ClothingBrandForm.tsx
│
├── ClothingSizes/                    # Subtab Talles
│   ├── ClothingSizesTabContent.tsx
│   ├── ClothingSizesList/            # DataTable 3-layer
│   │   ├── ...
│   └── components/
│       └── ClothingSizeForm.tsx
│
├── ClothingReports/                  # Subtab Reportes
│   ├── ClothingReportsTabContent.tsx
│   └── ClothingReportsList/          # DataTable 3-layer (readonly)
│       ├── ...
│
├── EmployeeDeliveries/               # Tab en detalle empleado
│   ├── EmployeeDeliveriesTabContent.tsx
│   └── EmployeeDeliveriesList/       # DataTable 3-layer (readonly)
│       ├── ...
│
├── ClothingDelivery/                 # Wizard standalone /clothing
│   ├── components/
│   │   ├── DeliveryWizard.tsx        # Wizard principal
│   │   ├── StepSelectEmployee.tsx
│   │   ├── StepDeliveryType.tsx
│   │   ├── StepAddItems.tsx
│   │   ├── StepSignature.tsx
│   │   ├── StepConfirm.tsx
│   │   └── SignaturePad.tsx          # Componente de firma canvas
│   └── actions/
│       └── actionsServer.ts
│
├── actions/                          # Server actions compartidas
│   └── actionsServer.ts              # CRUD de brands/sizes/items + getClothingOperatorContext
│
├── types/
│   └── index.ts
│
└── utils/
    ├── mappers.ts                    # Labels del enum delivery_type
    └── queryInvalidation.ts          # Invalidation helpers
```

**Responsabilidad de cada `actions.server.ts`:**

- `Clothing/actions/actionsServer.ts` — CRUD de catalogo (brands, sizes, items, item_brand_sizes) + `getClothingOperatorContext()`
- `ClothingItems/ClothingItemsList/actions.server.ts` — Queries paginadas y facets de la DataTable de articulos
- `ClothingBrands/ClothingBrandsList/actions.server.ts` — Queries paginadas y facets de la DataTable de marcas
- `ClothingSizes/ClothingSizesList/actions.server.ts` — Queries paginadas y facets de la DataTable de talles
- `ClothingReports/ClothingReportsList/actions.server.ts` — Queries paginadas, facets y export de la DataTable de reportes
- `EmployeeDeliveries/EmployeeDeliveriesList/actions.server.ts` — Queries paginadas y facets (filtrado por employee_id)
- `ClothingDelivery/actions/actionsServer.ts` — `createDelivery` (wizard submit), `getEmployeesForDelivery`, `getItemsForDelivery`, `getBrandsForItem`, `getSizesForItemBrand`, `uploadSignature`

### Rutas standalone

```
src/app/clothing/
├── page.tsx                          # Redirect logic
├── login/
│   └── page.tsx                      # Login form
├── (panel)/
│   ├── layout.tsx                    # Auth guard + ClothingLayoutProvider
│   └── delivery/
│       └── page.tsx                  # Wizard
├── thanks/
│   └── page.tsx                      # Post-delivery confirmation
└── clothing-layout-provider.tsx      # Context provider
```

---

## 8. Permisos

### 8.1. Nuevas tabs en permissions-map.ts

Bajo modulo `empresa` > tab RRHH:

```typescript
listado_maestro_articulos: {
  slug: 'listado_maestro_articulos',
  name: 'Listado Maestro de Artículos',
  tabId: '<UUID>',
  parent: 'rrhh',
  allowedActions: ['view'],
  subtabs: {
    articulos_indumentaria: {
      slug: 'articulos_indumentaria',
      name: 'Artículos',
      tabId: '<UUID>',
      parent: 'listado_maestro_articulos',
      allowedActions: ['view', 'create', 'update', 'delete'],
    },
    marcas_indumentaria: {
      slug: 'marcas_indumentaria',
      name: 'Marcas',
      tabId: '<UUID>',
      parent: 'listado_maestro_articulos',
      allowedActions: ['view', 'create', 'update', 'delete'],
    },
    talles_indumentaria: {
      slug: 'talles_indumentaria',
      name: 'Talles',
      tabId: '<UUID>',
      parent: 'listado_maestro_articulos',
      allowedActions: ['view', 'create', 'update', 'delete'],
    },
    reportes_indumentaria: {
      slug: 'reportes_indumentaria',
      name: 'Reportes',
      tabId: '<UUID>',
      parent: 'listado_maestro_articulos',
      allowedActions: ['view'],
    },
  },
}
```

Bajo modulo `empleados` > subtab de `detalle-empleado`:

```typescript
// Dentro de detalle-empleado.subtabs:
indumentaria_empleado: {
  slug: 'indumentaria_empleado',
  name: 'Indumentaria',
  tabId: '<UUID>',
  parent: 'detalle-empleado',
  allowedActions: ['view'],
}
```

### 8.2. Migracion SQL

Insertar tabs + role_permissions para admin siguiendo el flujo de migracion del proyecto (`.claude/rules/migrations.md`):

1. `prisma migrate diff` → generar SQL del schema
2. Crear carpeta manual en `prisma/migrations/`
3. Escribir SQL (estructura + inserts de tabs/permisos)
4. `prisma db execute` → aplicar
5. `prisma migrate resolve --applied` → registrar
6. `prisma generate` → regenerar client
7. Verificar con MCP supabase-LOCAL

### 8.3. Storage Bucket

Crear bucket `clothing-signatures` en Supabase Storage (publico) para almacenar las imagenes de firma. Puede hacerse via migracion SQL:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing-signatures', 'clothing-signatures', true)
ON CONFLICT (id) DO NOTHING;
```

---

## 9. Consideraciones de Performance (Vercel Best Practices)

- **async-parallel**: Todas las queries iniciales (datos + preferencias) en `Promise.all`
- **async-suspense-boundaries**: Cada subtab envuelta en `<Suspense>` con skeleton dedicado
- **bundle-dynamic-imports**: `SignaturePad` cargado con `next/dynamic` (libreria pesada, solo se usa en el wizard)
- **server-serialization**: Minimizar datos pasados a Client Components (solo lo necesario para la tabla)
- **server-parallel-fetching**: Server Components hacen fetch en paralelo, no en cascada
- **rerender-memo**: Columnas y filtros memoizados con `useMemo`
- **rerender-functional-setstate**: Callbacks del wizard con `useCallback`
- **bundle-conditional**: El canvas de firma se importa condicionalmente solo en Step 4

---

## 10. Dependencias Nuevas

- `signature_pad` — Canvas de firma digital (o `react-signature-canvas`)
- Ninguna otra dependencia nueva necesaria

---

## 11. Fuera de Alcance

- Gestion de stock (cantidades disponibles)
- Configuracion de dotaciones por puesto/convenio
- Alertas o notificaciones de entregas pendientes
- Layout PDF (se implementa cuando se tenga el formato fisico)
