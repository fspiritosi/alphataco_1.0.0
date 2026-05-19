# Tire Types Refactoring — Design Spec

**Fecha:** 2026-03-26
**Módulo:** Mantenimiento > Gomería

---

## Problema

Actualmente en `tires`, los campos `size` (medida) y `tread_type` (tipo de banda) son datos no normalizados que se repiten en cada cubierta individual. No existe una entidad "tipo de cubierta" que agrupe estos atributos. Además, el CRUD de marcas está embebido como widget colapsable dentro de la tab Catálogo, sin DataTable paginada ni URL propia.

## Solución

1. Crear entidad `tire_types` (independiente de marcas) que agrupe `size` + `tread_type`
2. Modificar `tires` para referenciar `tire_type_id` en vez de tener `size` y `tread_type` directamente
3. Extraer el CRUD de marcas a una tab independiente con DataTable paginada
4. Crear CRUD de tipos de cubierta como nueva tab con DataTable paginada
5. Ambas tabs son hermanas al mismo nivel bajo Gomería

---

## A. Modelo de Datos

### Nueva tabla `tire_types`

```prisma
model tire_types {
  id         String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name       String        // ej: "295/80R22.5 Lisa"
  size       String        // ej: "295/80R22.5"
  tread_type TireTreadType // enum: SMOOTH, MIXED, BLOCK
  company_id String        @db.Uuid
  is_active  Boolean       @default(true)
  created_at DateTime      @default(now()) @db.Timestamptz(6)
  updated_at DateTime      @updatedAt

  company company @relation(fields: [company_id], references: [id])
  tires   tires[]

  @@unique([size, tread_type, company_id])
}
```

### Modificación de `tires`

```diff
model tires {
-  size            String
-  tread_type      TireTreadType
+  tire_type_id    String        @db.Uuid
+  tire_type       tire_types    @relation(fields: [tire_type_id], references: [id])
   brand_id        String        @db.Uuid   // QUEDA — quién fabricó la cubierta
   // ... resto sin cambios
}
```

**Relaciones finales:**

```
tire_brands ──┐
              ├──→ tires ←── tire_types
              │   (quién)     (qué: medida + banda)
```

Un tipo de cubierta puede ser usado por cualquier marca. Una cubierta Bridgestone y una Firestone pueden ser del mismo tipo "295/80R22.5 Lisa".

### Migración de datos existentes

```sql
-- 1. Crear tabla tire_types

-- 2. Insertar tipos únicos desde datos existentes
INSERT INTO tire_types (id, name, size, tread_type, company_id, created_at, updated_at)
SELECT DISTINCT
  gen_random_uuid(),
  CONCAT(size, ' ', tread_type),  -- nombre auto-generado
  size,
  tread_type::text::"TireTreadType",
  company_id,
  NOW(), NOW()
FROM tires
WHERE size IS NOT NULL
ON CONFLICT (size, tread_type, company_id) DO NOTHING;

-- 3. Agregar columna tire_type_id a tires (nullable primero)
ALTER TABLE tires ADD COLUMN tire_type_id UUID;

-- 4. Popular tire_type_id en tires existentes
UPDATE tires t
SET tire_type_id = tt.id
FROM tire_types tt
WHERE t.size = tt.size
  AND t.tread_type = tt.tread_type
  AND t.company_id = tt.company_id;

-- 5. Hacer tire_type_id NOT NULL + FK
ALTER TABLE tires ALTER COLUMN tire_type_id SET NOT NULL;
ALTER TABLE tires ADD CONSTRAINT tires_tire_type_id_fkey
  FOREIGN KEY (tire_type_id) REFERENCES tire_types(id);

-- 6. Quitar columnas viejas
ALTER TABLE tires DROP COLUMN size;
ALTER TABLE tires DROP COLUMN tread_type;
```

---

## B. Estructura de Tabs

### Gomería — 5 tabs hermanas

```
Gomería (gomeria_tab)
  ├── catalogo_cubiertas    → Catálogo (tabla de cubiertas, SIN brand manager)
  ├── plantillas_cubiertas  → Plantillas (sin cambios)
  ├── ordenes_gomeria       → Órdenes (sin cambios)
  ├── marcas_cubiertas      → Marcas (NUEVA)
  └── tipos_cubiertas       → Tipos de Cubierta (NUEVA)
```

### Estructura de archivos nuevos

```
src/features/Mantenimiento/Gomeria/
  ├── Marcas/
  │   ├── MarcasTabContent.tsx          (Server Component)
  │   ├── components/
  │   │   ├── MarcasList.tsx            (Server Component — fetch + DataTable)
  │   │   ├── _MarcasDataTable.tsx      (Client Component)
  │   │   ├── columns.tsx
  │   │   └── MarcaForm.tsx             (Dialog — crear/editar)
  │   ├── actions/
  │   │   └── actions.server.ts
  │   └── fallback/
  │       └── MarcasSkeleton.tsx
  └── Tipos/
      ├── TiposTabContent.tsx           (Server Component)
      ├── components/
      │   ├── TiposList.tsx             (Server Component)
      │   ├── _TiposDataTable.tsx       (Client Component)
      │   ├── columns.tsx
      │   └── TipoForm.tsx             (Dialog — crear/editar)
      ├── actions/
      │   └── actions.server.ts
      └── fallback/
          └── TiposSkeleton.tsx
```

---

## C. CRUD Marcas (DataTable paginada)

### Columnas

| Columna           | Tipo                      | Filtro    |
| ----------------- | ------------------------- | --------- |
| Nombre            | texto                     | text      |
| Estado            | faceted (Activa/Inactiva) | faceted   |
| Fecha de creación | fecha                     | dateRange |

### Acciones (botones individuales, sin DropdownMenu)

- Editar (lápiz) → Dialog con campo nombre
- Activar/Desactivar (power) → AlertDialog confirmación

### Formulario (Dialog)

- Campo: `name` (string, min 1, max 100)
- Validación: duplicado `(name, company_id)` server-side

### Server Actions

- `getTireBrandsPaginated(searchParams)` — con Prisma, paginado
- `getTireBrandsForExport(searchParams)` — sin skip/take
- `getTireBrandSingleFacet(columnId, searchParams)` — lazy-load facets
- `createTireBrand(data)` — crear
- `updateTireBrand(id, data)` — editar nombre
- `toggleTireBrandActive(id, isActive)` — activar/desactivar

---

## D. CRUD Tipos de Cubierta (DataTable paginada)

### Columnas

| Columna           | Tipo                           | Filtro    |
| ----------------- | ------------------------------ | --------- |
| Nombre            | texto                          | text      |
| Medida            | texto                          | text      |
| Tipo de banda     | enum faceted (Lisa/Mixta/Taco) | faceted   |
| Estado            | faceted (Activo/Inactivo)      | faceted   |
| Fecha de creación | fecha                          | dateRange |

### Acciones (botones individuales, sin DropdownMenu)

- Editar (lápiz) → Dialog
- Activar/Desactivar (power) → AlertDialog confirmación

### Formulario (Dialog)

- `name` — string requerido
- `size` — string requerido (placeholder: "295/80R22.5")
- `tread_type` — select TireTreadType enum

### Server Actions

- `getTireTypesPaginated(searchParams)` — Prisma paginado
- `getTireTypesForExport(searchParams)` — sin skip/take
- `getTireTypeSingleFacet(columnId, searchParams)` — lazy-load facets
- `createTireType(data)` — crear
- `updateTireType(id, data)` — editar
- `toggleTireTypeActive(id, isActive)` — activar/desactivar
- `getTireTypesForSelect()` — para el select en TireForm

---

## E. Impacto en Componentes Existentes

### TireForm.tsx (Catálogo)

```diff
- brand_id    → Select de marcas (QUEDA)
- size        → Input texto libre (QUITAR)
- tread_type  → Select enum (QUITAR)
+ tire_type_id → Select de tipos (AGREGAR)
```

El select de tipos muestra: `"Medida - Tipo de banda"` (ej: `"295/80R22.5 - Lisa"`).
El select de marcas queda como está.

### TireBulkForm.tsx

Mismo cambio: reemplazar `size` + `tread_type` por `tire_type_id`.

### columns.tsx (Catálogo)

- Columna `brand` queda (resuelve desde `tire.brand.name`)
- Columna `size` → resolver desde `tire.tire_type.size`
- Columna `tread_type` → resolver desde `tire.tire_type.tread_type`
- Alternativa: columna unificada `tipo` que muestre `"Medida - Banda"`

### actions.server.ts (Catálogo)

- Queries de tires: `include: { tire_type: true, brand: true }` en vez de solo `brand`
- Facets de `size` y `tread_type`: resolver desde relación `tire_type`

### CatalogoTabContent.tsx

- QUITAR: `TireBrandManager` (se mueve a tab propia)

### GomeriaTabContent.tsx

- AGREGAR: 2 tabs nuevas (`marcas_cubiertas`, `tipos_cubiertas`)

### permissions-map.ts + BD

- Agregar tabs: `marcas_cubiertas`, `tipos_cubiertas`
- Asignar permisos `view`, `create`, `update` a roles admin/administrador/full-access-provisional

### Nota sobre tire_template_axles

`tire_template_axles.tire_size` es un campo de texto libre que define la medida esperada del eje en la plantilla. Este campo **no cambia** — sigue siendo texto libre independiente de `tire_types`.

---

## F. Permisos y BD

### Nuevas tabs

```sql
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES
  ('UUID_MARCAS', 'MODULE_MANTENIMIENTO', 'marcas_cubiertas', 'Marcas de Cubiertas', 'CRUD de marcas de cubiertas', ORDER, 'PARENT_GOMERIA'),
  ('UUID_TIPOS', 'MODULE_MANTENIMIENTO', 'tipos_cubiertas', 'Tipos de Cubierta', 'CRUD de tipos de cubierta', ORDER, 'PARENT_GOMERIA');
```

### Permisos a roles

Asignar `view`, `create`, `update` a: `admin`, `administrador`, `full-access-provisional`.

---

## G. No Incluido (fuera de alcance)

- Migración de `tire_template_axles.tire_size` a FK — queda como texto libre
- Cambios en el flujo del wizard de órdenes (usa posiciones, no tipos directamente)
- Cambios en TireDiagramRenderer
- Refactoring de otros módulos que no usan cubiertas
