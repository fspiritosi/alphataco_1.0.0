# Medida de cubierta opcional en plantillas (override por vehículo y eje)

**Fecha**: 2026-05-27
**Módulo**: Mantenimiento / Gomería
**Branch sugerido**: `feat/optional-tire-size-on-template`

## Contexto y problema

Hoy, al crear o editar una plantilla de cubiertas (`tire_templates`), la **medida** (`tire_size`) por eje es obligatoria (`NOT NULL` en `tire_template_axles`). Esto fuerza a duplicar plantillas cuando varios vehículos comparten la misma geometría (cantidad de ejes, tractores, auxiliares, simple/dual) pero usan distintas medidas de cubierta.

Caso de uso real: 50 pickups con la misma geometría (eje delantero simple, eje trasero simple, sin tractor, sin auxilio) pero usando 5 medidas distintas → hoy obliga a crear 5 plantillas idénticas excepto en la medida.

## Objetivo

Permitir que la medida sea **opcional** en la plantilla y configurable **por vehículo y eje**. Mantener compatibilidad total con las plantillas existentes que ya tienen medida cargada.

**Principio**: cambios mínimos. La plantilla puede seguir teniendo medidas (cuando todos los vehículos de ese subtipo usan las mismas); cuando no, el vehículo las define en su tab Cubiertas.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Granularidad del override | Por eje (igual que la granularidad de la plantilla) |
| Validación de medidas completas | Bloqueo duro al iniciar orden de gomería |
| Migración de datos legacy | No incluir — plantillas existentes siguen funcionando |
| Resolución del override | `vehicle_override ?? template_axle.tire_size ?? null` |
| Llave del override | `(vehicle_id, axle_number)` — estable ante cambio de plantilla efectiva |

## Modelo de datos

### Cambios al schema

```prisma
model tire_template_axles {
  // ...
  tire_size      String?   // antes: String NOT NULL
}

model vehicle_axle_tire_sizes {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vehicle_id  String   @db.Uuid
  axle_number Int
  tire_size   String                    // siempre que existe la fila, hay medida
  created_at  DateTime @default(now())  @db.Timestamptz(6)
  updated_at  DateTime @updatedAt       @db.Timestamptz(6)

  vehicle vehicles @relation(fields: [vehicle_id], references: [id], onDelete: Cascade)

  @@unique([vehicle_id, axle_number])
  @@index([vehicle_id])
  @@schema("public")
}
```

Relación inversa en `vehicles`:
```prisma
vehicle_axle_tire_sizes vehicle_axle_tire_sizes[]
```

### Migración Prisma manual

Siguiendo `.claude/rules/migrations.md`:

1. Editar `prisma/schema.prisma` con los cambios de arriba
2. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
3. Crear `prisma/migrations/YYYYMMDDHHMMSS_make_template_tire_size_optional_and_add_vehicle_overrides/migration.sql`
4. Contenido del SQL (extraído del diff, solo lo relevante):
   ```sql
   ALTER TABLE tire_template_axles ALTER COLUMN tire_size DROP NOT NULL;

   CREATE TABLE vehicle_axle_tire_sizes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
     axle_number INTEGER NOT NULL,
     tire_size TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     CONSTRAINT vehicle_axle_tire_sizes_unique UNIQUE (vehicle_id, axle_number)
   );
   CREATE INDEX idx_vehicle_axle_tire_sizes_vehicle ON vehicle_axle_tire_sizes(vehicle_id);
   ```
5. `npx prisma db execute --file prisma/migrations/.../migration.sql`
6. `npx prisma migrate resolve --applied YYYYMMDDHHMMSS_make_template_tire_size_optional_and_add_vehicle_overrides`
7. `npx prisma generate`
8. Verificar con MCP supabase-LOCAL que los cambios se aplicaron

## Helpers nuevos

### `src/features/Mantenimiento/Gomeria/shared/resolve-tire-size.ts`

```typescript
export function resolveAxleTireSize(
  templateAxleSize: string | null,
  vehicleOverride: string | null | undefined
): string | null {
  return vehicleOverride ?? templateAxleSize ?? null;
}

export function getAxlesMissingSize(
  axles: Array<{ axle_number: number; tire_size: string | null }>,
  overrides: Map<number, string>
): number[] {
  return axles
    .filter((a) => !resolveAxleTireSize(a.tire_size, overrides.get(a.axle_number)))
    .map((a) => a.axle_number);
}
```

### `src/features/Mantenimiento/Gomeria/shared/check-vehicle-tire-readiness.ts`

```typescript
'use server';

import { prisma } from '@/shared/lib/prisma';
import { resolveVehicleTireTemplateId } from './resolve-template';
import { getAxlesMissingSize } from './resolve-tire-size';

export type TireReadinessResult =
  | { ready: true }
  | { ready: false; reason: 'no_template' }
  | { ready: false; reason: 'missing_sizes'; missingAxles: number[] };

export async function checkVehicleTireReadiness(vehicleId: string): Promise<TireReadinessResult> {
  const vehicle = await prisma.vehicles.findUnique({
    where: { id: vehicleId },
    select: {
      tire_template_id: true,
      sub_type: { select: { tire_template_id: true } },
      vehicle_axle_tire_sizes: { select: { axle_number: true, tire_size: true } },
    },
  });

  if (!vehicle) return { ready: false, reason: 'no_template' };

  const templateId = resolveVehicleTireTemplateId(vehicle);
  if (!templateId) return { ready: false, reason: 'no_template' };

  const axles = await prisma.tire_template_axles.findMany({
    where: { template_id: templateId },
    select: { axle_number: true, tire_size: true },
  });

  const overrides = new Map(vehicle.vehicle_axle_tire_sizes.map((o) => [o.axle_number, o.tire_size]));
  const missingAxles = getAxlesMissingSize(axles, overrides);

  if (missingAxles.length > 0) return { ready: false, reason: 'missing_sizes', missingAxles };
  return { ready: true };
}
```

### `src/features/Mantenimiento/Gomeria/shared/tire-readiness-messages.ts`

```typescript
export const TIRE_READINESS_MESSAGES = {
  no_template: (domain: string) =>
    `El equipo ${domain} no tiene plantilla de cubiertas asignada.`,
  missing_sizes: (domain: string, axles: number[]) =>
    `El equipo ${domain} no tiene medidas configuradas para los ejes: ${axles.join(', ')}. ` +
    `Configurelas en la tab Cubiertas del equipo.`,
};
```

## Backend — cambios en server actions

### `Plantillas/actions/actions.server.ts`

- `AxleInput.tire_size`: cambia a `string | null`.
- `createTemplate`/`updateTemplate`: aceptan medida null sin validación.

### `vehicle-tires/actions.server.ts`

**Cambios al tipo y a actions existentes:**
- `AxleInput.tire_size`: cambia a `string | null`.
- `createVehicleCustomTemplate`/`updateVehicleCustomAxles`: aceptan medida null.
- `rebuildPositionsPreservingTires`: agregar paso de **cleanup en cascada** después de calcular las nuevas positions (paso 5.5):
   ```typescript
   const newAxleNumbers = new Set(newAxles.map((a) => a.axle_number));
   await tx.vehicle_axle_tire_sizes.deleteMany({
     where: {
       vehicle_id: vehicleId,
       axle_number: { notIn: [...newAxleNumbers] },
     },
   });
   ```
- `getVehicleTemplateInfo`: incluir en el retorno los axles con `tire_size` de plantilla + overrides del vehículo, para que la tab Cubiertas tenga todo lo necesario en una sola query.
- `getVehicleTirePositionsWithDetails`: cargar overrides en paralelo y agregar `effective_tire_size: string | null` al shape devuelto en cada posición.
- `resetVehicleToSubTypeTemplate`: NO borrar overrides de medida; el cleanup en cascada se ocupa de huérfanos.

**Server actions nuevas:**

```typescript
export async function getVehicleAxleSizeOverrides(vehicleId: string):
  Promise<Array<{ axle_number: number; tire_size: string }>>;

export async function setVehicleAxleSize(vehicleId: string, axleNumber: number, tireSize: string):
  Promise<void>;   // upsert

export async function removeVehicleAxleSize(vehicleId: string, axleNumber: number):
  Promise<void>;   // delete

export async function bulkUpdateVehicleAxleSizes(
  vehicleId: string,
  updates: Array<{ axle_number: number; tire_size: string | null }>  // null = eliminar override
): Promise<void>;
```

`bulkUpdateVehicleAxleSizes` ejecuta upsert/delete en una sola `$transaction` para el submit del form unificado.

### `Ordenes/actions/actions.server.ts`

- **`searchVehicleByDomain`**: agregar a cada resultado `has_all_axle_sizes: boolean` y `missing_axles_count: number`. Resolver en **batch con un solo query agregado** después del findMany inicial: por cada vehículo del resultado, cargar sus axles de plantilla + overrides en una sola query JOIN/agregada, y computar el flag en código. Evita N+1.
- **`searchCompatibleHitchVehicles`**: mismo cambio.
- **`createServiceOrder`**: antes de cualquier `ensureVehicleTirePositions`, llamar a `checkVehicleTireReadiness` para vehículo y trailer; si alguno retorna `ready: false`, throw `Error` con el mensaje correspondiente de `TIRE_READINESS_MESSAGES`.
- **`ensureVehicleTirePositions`**: ya valida template; agregar defensiva final con `checkVehicleTireReadiness` (mismo error). Esto cubre cualquier camino que llame directamente a la función sin pasar por `createServiceOrder`.
- **`getAvailableTiresForAxle`**: si `tireSize === ''` o falsy → retornar `[]` en lugar de hacer query (defensivo).

## Frontend — cambios

### Plantillas

**`AxleConfigurator.tsx`** (línea 80, 115):
- Header columna: `"Medida"` (sin cambios).
- Placeholder: `"Ej: 295/80R22.5 (opcional)"`.

**`TemplateForm.tsx`** (líneas 128-140):
- Eliminar el bloque `missingSize` del `onSubmit`.
- Después del bloque `AxleConfigurator`, agregar nota tipográfica discreta:
  ```tsx
  <p className="text-xs text-muted-foreground italic">
    Si no cargás la medida acá, deberás configurarla por vehículo en la tab Cubiertas del equipo.
  </p>
  ```

**`Plantillas/components/columns.tsx`**:
- Agregar columna virtual nueva "Medidas" después de "Posiciones":
  - `"Todas"` (badge success) si todos los axles tienen `tire_size`
  - `"Parciales"` (badge yellow) si algunos
  - `"Por vehículo"` (badge outline) si ninguno
- Sin filtro (derivada).

### Tab Cubiertas del vehículo

**Nuevo componente**: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-sizes-form.tsx`

Estructura:
- Card con header "Medidas de cubierta" + subtítulo explicativo
- Banner condicional (variant destructive suave) si hay axles sin resolver: "Faltan N medidas. No podrás iniciar órdenes de gomería para este equipo hasta completarlas."
- Form único con `react-hook-form` + `zod`:
  ```typescript
  const schema = z.object({
    axles: z.array(z.object({
      axle_number: z.number(),
      tire_size: z.string().optional(),  // vacío = eliminar override
    })),
  });
  ```
- Por cada axle muestra: número, chips semánticos (`Tractor` si is_drive_axle, `Auxilio` si is_spare), medida de plantilla en gris, input para medida del vehículo.
- Estados visuales por fila:
  - Override activo: input con valor, botón ✕ inline para limpiar
  - Sin override + plantilla con medida: input vacío con placeholder = medida de plantilla, etiqueta `(heredando)`
  - Sin override + plantilla sin medida: input vacío + chip `⚠ Sin configurar`
- Chip informativo junto al título si el vehículo tiene override geométrico: `Plantilla personalizada del equipo` (variant outline).
- Solo el botón submit dispara cambios (no on-blur). Submit deshabilitado si no hay cambios respecto al estado cargado.
- Submit llama a `bulkUpdateVehicleAxleSizes(vehicleId, updates)`. Toast success/error.

**`vehicle-tire-diagram-section.tsx`**:
- Insertar el nuevo `<VehicleAxleSizesForm />` **debajo del diagrama y arriba del editor geométrico existente**, como Card hermana separada.

**`vehicle-axle-editor.tsx`** (override geométrico existente):
- Eliminar validación de tire_size requerido (líneas 99-106).
- Sin otros cambios — el `AxleConfigurator` compartido ya queda alineado.

### Wizard de órdenes de gomería

**`ServiceOrderWizard.tsx`**:

`VehicleRow` (línea 432):
- Reemplazar el badge único por la siguiente lógica:
  - `!has_template` → `<Badge variant="destructive">Sin plantilla</Badge>` (igual que hoy)
  - `has_template && !has_all_axle_sizes` → `<Badge variant="yellow">Faltan medidas</Badge>`
  - `has_template && has_all_axle_sizes` → `<Badge variant="success">Listo</Badge>`

`VehicleSearchSection` (selected box, líneas 337-364):
- Mantener el mensaje actual de "Sin plantilla".
- Agregar caso paralelo: si `has_template && !has_all_axle_sizes`, mostrar mensaje destructivo: *"Configurá las medidas de cubierta en la tab Cubiertas del equipo antes de iniciar la orden."* con link inline a `/maintenance/equipment/{id}?tab=tires` (abre en nueva pestaña).

`TrailerSearchSection` (selected box, líneas 414-419):
- Mismo cambio análogo para trailers.

`canProceed` (línea 135):
```typescript
const canProceed =
  !!activeVehicleId &&
  (skipVehicleSearch ||
    (!!selectedVehicle?.tire_template_id && selectedVehicle?.has_all_axle_sizes)) &&
  (!hasTrailer ||
    (!!selectedTrailer?.tire_template_id && selectedTrailer?.has_all_axle_sizes));
```

### TireReplacePicker y TirePositionCard

**`TireReplacePicker.tsx`**:
- Si `tireSize === ''` o null al renderizar: early return con mensaje *"Configurá la medida de este eje en la tab Cubiertas del equipo antes de asignar una cubierta."* (no debería ocurrir por los bloqueos previos, pero defensiva).

**`TirePositionCard.tsx`** (línea 52 y consumidores):
- Cambiar `tireSize = position.template_axle?.tire_size ?? ''` a usar `position.effective_tire_size ?? ''` que ahora viene resuelto desde el server.
- Labels "(medida {tireSize})" en tabs Reparar / Reemplazar / EmptyAssign: si vacío mostrar `(medida no configurada)` en italics + color muted.

### Diagrama

**`TireDiagramRenderer.tsx`** (línea 70):
- Tooltip "Medida: {tire_size}" → omitir la línea cuando `effective_tire_size` es null, en vez de mostrar "Medida: —". Si la cubierta instalada tiene su propio `tire_type.size`, ese se sigue mostrando — son datos distintos.

## Flujo de validación end-to-end

```
Usuario abre Wizard de órdenes
  └─ searchVehicleByDomain devuelve has_all_axle_sizes por cada resultado
     ├─ Badge visible en cada VehicleRow
     ├─ Mensaje en selected box si faltan medidas
     └─ Botón "Iniciar Operación" deshabilitado

Si el usuario igual intenta crear orden:
  └─ createServiceOrder → checkVehicleTireReadiness
     ├─ ready: true → continúa
     └─ ready: false → throw Error con mensaje accionable

Si llegan a ensureVehicleTirePositions sin readiness:
  └─ Defensiva final con checkVehicleTireReadiness → mismo error

Al asignar una cubierta a una posición:
  └─ TireReplacePicker recibe tireSize ya resuelto (effective_tire_size)
     └─ getAvailableTiresForAxle filtra por size → lista de candidatas
```

## Coexistencia con override geométrico existente

Reglas:
1. El override de medidas (`vehicle_axle_tire_sizes`) es **ortogonal** al override geométrico (`is_vehicle_override=true`). Aplica siempre, sin importar de qué plantilla viene la geometría del vehículo.
2. `vehicle-axle-editor.tsx` queda alineado con la regla de medida opcional (mismo `AxleConfigurator`).
3. Cleanup en cascada en `rebuildPositionsPreservingTires`: borra overrides cuyo `axle_number` ya no existe en la nueva geometría.
4. `resetVehicleToSubTypeTemplate` NO borra overrides — el cleanup en cascada se ocupa de huérfanos si aplica.
5. `createVehicleCustomTemplate` NO migra automáticamente medidas — los overrides existentes sobreviven; los huérfanos se limpian.
6. UI: chip informativo "Plantilla personalizada del equipo" en la sección Medidas cuando aplica.

## Archivos afectados — resumen

| Capa | Archivo | Tipo |
|---|---|---|
| DB | `prisma/schema.prisma` | Modificar |
| DB | `prisma/migrations/YYYYMMDDHHMMSS_.../migration.sql` | Crear |
| Backend | `src/features/Mantenimiento/Gomeria/shared/resolve-tire-size.ts` | Crear |
| Backend | `src/features/Mantenimiento/Gomeria/shared/check-vehicle-tire-readiness.ts` | Crear |
| Backend | `src/features/Mantenimiento/Gomeria/shared/tire-readiness-messages.ts` | Crear |
| Backend | `src/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server.ts` | Modificar |
| Backend | `src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts` | Modificar (+ nuevas actions) |
| Backend | `src/features/Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts` | Modificar |
| Frontend | `src/features/Mantenimiento/Gomeria/Plantillas/components/AxleConfigurator.tsx` | Modificar |
| Frontend | `src/features/Mantenimiento/Gomeria/Plantillas/components/TemplateForm.tsx` | Modificar |
| Frontend | `src/features/Mantenimiento/Gomeria/Plantillas/components/columns.tsx` | Modificar (columna nueva) |
| Frontend | `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-sizes-form.tsx` | Crear |
| Frontend | `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-diagram-section.tsx` | Modificar (insertar nueva sección) |
| Frontend | `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-editor.tsx` | Modificar (quitar validación) |
| Frontend | `src/features/Mantenimiento/Gomeria/Ordenes/components/ServiceOrderWizard.tsx` | Modificar (badges + canProceed + mensajes) |
| Frontend | `src/features/Mantenimiento/Gomeria/Ordenes/components/TirePositionCard.tsx` | Modificar |
| Frontend | `src/features/Mantenimiento/Gomeria/Ordenes/components/TireReplacePicker.tsx` | Modificar (defensiva) |
| Frontend | `src/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer.tsx` | Modificar (tooltip) |

## Fuera de alcance

- Migración de datos legacy (consolidación de plantillas duplicadas) — diferida.
- Cambios en permisos — los CRUD nuevos usan los permisos existentes de la tab Cubiertas del vehículo y de Plantillas de cubiertas.
- Tabla `tires` y `tire_types` — sin cambios.
