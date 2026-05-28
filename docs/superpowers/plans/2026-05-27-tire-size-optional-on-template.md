# Medida de cubierta opcional en plantillas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Convenciones específicas de este proyecto:**
> - **NO ejecutar `git commit` ni `git push`** en ningún step. El usuario commitea al final cuando lo decida.
> - **NO ejecutar `npm run lint`, `npm run format`, ni Prettier**. Solo `npm run check-types` para verificación de tipos (regla `.claude/rules/no-format-commands.md`).
> - Sin unit tests. Verificación: `check-types` + checklist manual al final de cada tarea.

**Goal:** Hacer la medida (`tire_size`) opcional en las plantillas de cubiertas y permitir que cada vehículo la sobrescriba por eje en su tab Cubiertas. Bloquear creación de órdenes de gomería si faltan medidas resueltas.

**Architecture:** Capa de resolución `vehicle_override ?? template_axle.tire_size ?? null`. Override por `(vehicle_id, axle_number)` en tabla nueva `vehicle_axle_tire_sizes`. Helper centralizado de readiness check usado en wizard, server actions y defensiva final.

**Tech Stack:** Next.js 16 + React 19 (App Router + Server Components), Prisma + Supabase, shadcn/ui + Tailwind, React Hook Form + Zod, React Query, moment.js.

**Spec:** `docs/superpowers/specs/2026-05-27-tire-size-optional-on-template-design.md`

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `prisma/schema.prisma` | Modificar | `tire_size` nullable + modelo `vehicle_axle_tire_sizes` + relación inversa en `vehicles` |
| `prisma/migrations/<TS>_make_template_tire_size_optional_and_add_vehicle_overrides/migration.sql` | Crear | DDL |
| `src/features/Mantenimiento/Gomeria/shared/resolve-tire-size.ts` | Crear | Helpers puros |
| `src/features/Mantenimiento/Gomeria/shared/check-vehicle-tire-readiness.ts` | Crear | Validación readiness (server) |
| `src/features/Mantenimiento/Gomeria/shared/tire-readiness-messages.ts` | Crear | Mensajes consistentes |
| `src/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server.ts` | Modificar | Tipo `AxleInput.tire_size` nullable |
| `src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts` | Modificar | Nuevas actions + cleanup en cascada + `effective_tire_size` en positions |
| `src/features/Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts` | Modificar | Validación + `has_all_axle_sizes` + defensiva |
| `src/features/Mantenimiento/Gomeria/Plantillas/components/AxleConfigurator.tsx` | Modificar | Placeholder |
| `src/features/Mantenimiento/Gomeria/Plantillas/components/TemplateForm.tsx` | Modificar | Quitar validación + nota |
| `src/features/Mantenimiento/Gomeria/Plantillas/components/columns.tsx` | Modificar | Columna "Medidas" |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-sizes-form.tsx` | Crear | Form de medidas por eje |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-diagram-section.tsx` | Modificar | Insertar `VehicleAxleSizesForm` |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-editor.tsx` | Modificar | Quitar validación tire_size |
| `src/features/Mantenimiento/Gomeria/Ordenes/components/ServiceOrderWizard.tsx` | Modificar | Badges + canProceed + mensajes |
| `src/features/Mantenimiento/Gomeria/Ordenes/components/TirePositionCard.tsx` | Modificar | Usar `effective_tire_size` |
| `src/features/Mantenimiento/Gomeria/Ordenes/components/TireReplacePicker.tsx` | Modificar | Defensiva si vacío |
| `src/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer.tsx` | Modificar | Tooltip usa effective_size |

---

## Task 1: Migración DB

**Archivos:**
- Modificar: `prisma/schema.prisma`
- Crear: `prisma/migrations/<TIMESTAMP>_make_template_tire_size_optional_and_add_vehicle_overrides/migration.sql`

- [ ] **Step 1: Modificar `tire_template_axles.tire_size` a nullable**

Editar `prisma/schema.prisma`, en el modelo `tire_template_axles`:

```prisma
model tire_template_axles {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  template_id    String   @db.Uuid
  axle_number    Int
  tires_per_side Int
  tire_size      String?                     // antes: String — ahora nullable
  is_drive_axle  Boolean  @default(false)
  is_spare       Boolean  @default(false)
  created_at     DateTime @default(now()) @db.Timestamptz(6)

  template               tire_templates           @relation(fields: [template_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  vehicle_tire_positions vehicle_tire_positions[]

  @@unique([template_id, axle_number])
  @@schema("public")
}
```

- [ ] **Step 2: Agregar modelo `vehicle_axle_tire_sizes`**

En `prisma/schema.prisma`, agregar después del modelo `vehicle_tire_positions`:

```prisma
model vehicle_axle_tire_sizes {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vehicle_id  String   @db.Uuid
  axle_number Int
  tire_size   String
  created_at  DateTime @default(now()) @db.Timestamptz(6)
  updated_at  DateTime @updatedAt @db.Timestamptz(6)

  vehicle vehicles @relation(fields: [vehicle_id], references: [id], onDelete: Cascade)

  @@unique([vehicle_id, axle_number])
  @@index([vehicle_id])
  @@schema("public")
}
```

- [ ] **Step 3: Agregar relación inversa en `vehicles`**

En `prisma/schema.prisma`, dentro del modelo `vehicles`, agregar:

```prisma
vehicle_axle_tire_sizes vehicle_axle_tire_sizes[]
```

(Ubicar la línea junto a las otras relaciones inversas del modelo, ej. cerca de `vehicle_tire_positions`).

- [ ] **Step 4: Generar diff SQL**

Ejecutar:

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Revisar el output. Esperado: `ALTER TABLE "tire_template_axles" ALTER COLUMN "tire_size" DROP NOT NULL;` + `CREATE TABLE "vehicle_axle_tire_sizes" ...` + índices.

Si aparecen cambios colaterales por drift (`ALTER` de columnas no relacionadas), ignorarlos — solo tomamos el SQL del cambio nuestro.

- [ ] **Step 5: Crear carpeta y archivo de migración**

```bash
mkdir -p prisma/migrations/$(date -u +%Y%m%d%H%M%S)_make_template_tire_size_optional_and_add_vehicle_overrides
```

Crear `prisma/migrations/<TIMESTAMP>_make_template_tire_size_optional_and_add_vehicle_overrides/migration.sql` con:

```sql
-- Make template tire_size optional
ALTER TABLE "public"."tire_template_axles" ALTER COLUMN "tire_size" DROP NOT NULL;

-- Vehicle-level per-axle tire size override
CREATE TABLE "public"."vehicle_axle_tire_sizes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL,
    "axle_number" INTEGER NOT NULL,
    "tire_size" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_axle_tire_sizes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vehicle_axle_tire_sizes_vehicle_id_axle_number_key"
    ON "public"."vehicle_axle_tire_sizes"("vehicle_id", "axle_number");

CREATE INDEX "idx_vehicle_axle_tire_sizes_vehicle"
    ON "public"."vehicle_axle_tire_sizes"("vehicle_id");

ALTER TABLE "public"."vehicle_axle_tire_sizes"
    ADD CONSTRAINT "vehicle_axle_tire_sizes_vehicle_id_fkey"
    FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
```

- [ ] **Step 6: Aplicar la migración**

```bash
npx prisma db execute --file prisma/migrations/<TIMESTAMP>_make_template_tire_size_optional_and_add_vehicle_overrides/migration.sql
```

Esperado: éxito sin errores.

- [ ] **Step 7: Registrar migración como aplicada**

```bash
npx prisma migrate resolve --applied <TIMESTAMP>_make_template_tire_size_optional_and_add_vehicle_overrides
```

- [ ] **Step 8: Regenerar Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 9: Verificar en BD local con MCP supabase-LOCAL**

Ejecutar la siguiente query con el MCP `supabase-LOCAL`:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tire_template_axles' AND column_name = 'tire_size';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicle_axle_tire_sizes'
ORDER BY ordinal_position;
```

Esperado:
- `tire_template_axles.tire_size` → `is_nullable = YES`
- `vehicle_axle_tire_sizes` con 6 columnas: id, vehicle_id, axle_number, tire_size, created_at, updated_at

- [ ] **Step 10: Verificar tipos**

```bash
npm run check-types
```

Esperado: pueden aparecer errores en archivos que usan `AxleInput.tire_size: string` o consultan `tire_template_axles.tire_size` asumiendo string no-null. Esos errores se resuelven en las siguientes tareas. Si no hay errores nuevos en archivos no relacionados, OK.

---

## Task 2: Helpers compartidos

**Archivos:**
- Crear: `src/features/Mantenimiento/Gomeria/shared/resolve-tire-size.ts`
- Crear: `src/features/Mantenimiento/Gomeria/shared/check-vehicle-tire-readiness.ts`
- Crear: `src/features/Mantenimiento/Gomeria/shared/tire-readiness-messages.ts`

- [ ] **Step 1: Crear `resolve-tire-size.ts`**

Crear el archivo con:

```typescript
/**
 * Resuelve la medida efectiva de un eje aplicando el override de vehículo
 * sobre la medida de plantilla.
 *
 * Precedencia: vehicle_override > template_axle.tire_size > null
 */
export function resolveAxleTireSize(
  templateAxleSize: string | null,
  vehicleOverride: string | null | undefined
): string | null {
  return vehicleOverride ?? templateAxleSize ?? null;
}

/**
 * Dada una lista de axles de plantilla y un map de overrides por axle_number,
 * devuelve los axle_number cuya medida efectiva es null.
 */
export function getAxlesMissingSize(
  axles: Array<{ axle_number: number; tire_size: string | null }>,
  overrides: Map<number, string>
): number[] {
  return axles
    .filter((a) => !resolveAxleTireSize(a.tire_size, overrides.get(a.axle_number)))
    .map((a) => a.axle_number);
}
```

- [ ] **Step 2: Crear `tire-readiness-messages.ts`**

Crear el archivo con:

```typescript
export const TIRE_READINESS_MESSAGES = {
  no_template: (domain: string) =>
    `El equipo ${domain} no tiene plantilla de cubiertas asignada.`,
  missing_sizes: (domain: string, axles: number[]) =>
    `El equipo ${domain} no tiene medidas configuradas para los ejes: ${axles.join(', ')}. ` +
    `Configurelas en la tab Cubiertas del equipo.`,
};
```

- [ ] **Step 3: Crear `check-vehicle-tire-readiness.ts`**

Crear el archivo con:

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { resolveVehicleTireTemplateId } from './resolve-template';
import { getAxlesMissingSize } from './resolve-tire-size';

const logger = new Logger('features/Mantenimiento/Gomeria/shared/checkVehicleTireReadiness');

export type TireReadinessResult =
  | { ready: true }
  | { ready: false; reason: 'no_template' }
  | { ready: false; reason: 'missing_sizes'; missingAxles: number[] };

/**
 * Verifica que un vehículo tenga plantilla efectiva Y medidas resueltas
 * para todos sus ejes (template o override de vehículo).
 */
export async function checkVehicleTireReadiness(vehicleId: string): Promise<TireReadinessResult> {
  logger.debug('Checking vehicle tire readiness', { data: { vehicleId } });

  try {
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

    const overrides = new Map(
      vehicle.vehicle_axle_tire_sizes.map((o) => [o.axle_number, o.tire_size])
    );
    const missingAxles = getAxlesMissingSize(axles, overrides);

    if (missingAxles.length > 0) {
      return { ready: false, reason: 'missing_sizes', missingAxles };
    }
    return { ready: true };
  } catch (error) {
    logger.error('Error checking vehicle tire readiness', { data: { error, vehicleId } });
    throw error;
  }
}
```

- [ ] **Step 4: Verificar tipos**

```bash
npm run check-types
```

Esperado: sin errores en los 3 archivos nuevos. Pueden persistir errores de la Task 1 que se resuelven más adelante.

---

## Task 3: Server actions de Plantillas — tipos nullables

**Archivos:**
- Modificar: `src/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server.ts`

- [ ] **Step 1: Cambiar tipo `AxleInput.tire_size`**

En `src/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server.ts`, modificar:

```typescript
export interface AxleInput {
  axle_number: number;
  tires_per_side: number;
  tire_size: string | null;       // antes: string
  is_drive_axle: boolean;
  is_spare: boolean;
}
```

- [ ] **Step 2: Verificar que `createTemplate`/`updateTemplate` aceptan null**

En las mismas funciones, las llamadas a `createMany({ data: ... })` ya pasan el valor tal cual. Confirmar que el insert mantiene:

```typescript
data: data.axles.map((axle) => ({
  template_id: created.id,
  axle_number: axle.axle_number,
  tires_per_side: axle.tires_per_side,
  tire_size: axle.tire_size,             // ahora puede ser null
  is_drive_axle: axle.is_drive_axle,
  is_spare: axle.is_spare,
})),
```

No requiere cambios — Prisma acepta null en columnas nullable. Solo verificar que no haya transformación intermedia que asuma string.

- [ ] **Step 3: Verificar tipos**

```bash
npm run check-types
```

Esperado: el cambio puede generar errores nuevos en consumidores que pasan `tire_size` como string no-null. Esos consumidores son `vehicle-axle-editor.tsx` (Task 8) y `TemplateForm.tsx` (Task 6). Si los únicos errores nuevos son en esos archivos, OK.

---

## Task 4: Server actions de vehicle-tires — cleanup + nuevas actions

**Archivos:**
- Modificar: `src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts`

- [ ] **Step 1: Cambiar tipo `AxleInput.tire_size` local**

Al inicio del archivo:

```typescript
export type AxleInput = {
  axle_number: number;
  tires_per_side: number;
  tire_size: string | null;       // antes: string
  is_drive_axle: boolean;
  is_spare: boolean;
};
```

- [ ] **Step 2: Cleanup en cascada en `rebuildPositionsPreservingTires`**

Localizar la función `rebuildPositionsPreservingTires` (alrededor de la línea 146). Después del paso donde se crean las nuevas positions (step 6) y antes del paso de displaced tires (step 7), insertar:

```typescript
// 6.5 Cleanup: borrar overrides de medida cuyo axle_number ya no existe
const newAxleNumbers = new Set(newAxles.map((a) => a.axle_number));
await tx.vehicle_axle_tire_sizes.deleteMany({
  where: {
    vehicle_id: vehicleId,
    axle_number: { notIn: [...newAxleNumbers] },
  },
});
```

- [ ] **Step 3: Agregar `effective_tire_size` en `getVehicleTirePositionsWithDetails`**

Reemplazar el cuerpo de la función por:

```typescript
export async function getVehicleTirePositionsWithDetails(vehicleId: string) {
  logger.debug('Getting vehicle tire positions with details', { data: { vehicleId } });

  try {
    const [positions, overrides] = await Promise.all([
      prisma.vehicle_tire_positions.findMany({
        where: { vehicle_id: vehicleId },
        include: {
          tire: {
            select: {
              id: true,
              serial_number: true,
              status: true,
              tread_depth: true,
              is_new: true,
              retread_level: true,
              brand: { select: { id: true, name: true } },
              tire_type: { select: { id: true, size: true, tread_type: true } },
            },
          },
          template_axle: {
            select: {
              id: true,
              axle_number: true,
              tires_per_side: true,
              tire_size: true,
              is_drive_axle: true,
              is_spare: true,
            },
          },
        },
        orderBy: { position_number: 'asc' },
      }),
      prisma.vehicle_axle_tire_sizes.findMany({
        where: { vehicle_id: vehicleId },
        select: { axle_number: true, tire_size: true },
      }),
    ]);

    const overrideMap = new Map(overrides.map((o) => [o.axle_number, o.tire_size]));

    return positions.map((pos) => ({
      ...pos,
      effective_tire_size:
        overrideMap.get(pos.axle_number) ?? pos.template_axle?.tire_size ?? null,
    }));
  } catch (error) {
    logger.error('Error getting vehicle tire positions', { data: { error, vehicleId } });
    throw error;
  }
}

export type VehicleTirePositionWithDetails = Awaited<
  ReturnType<typeof getVehicleTirePositionsWithDetails>
>[number];
```

- [ ] **Step 4: Agregar action `getVehicleAxleSizeOverrides`**

Al final del archivo (antes de los `export type ...`), agregar:

```typescript
// ============================================================================
// VEHICLE AXLE SIZE OVERRIDES
// ============================================================================

export async function getVehicleAxleSizeOverrides(vehicleId: string) {
  logger.debug('Getting vehicle axle size overrides', { data: { vehicleId } });

  try {
    const overrides = await prisma.vehicle_axle_tire_sizes.findMany({
      where: { vehicle_id: vehicleId },
      select: { axle_number: true, tire_size: true },
      orderBy: { axle_number: 'asc' },
    });
    return overrides;
  } catch (error) {
    logger.error('Error getting vehicle axle size overrides', { data: { error, vehicleId } });
    throw error;
  }
}
```

- [ ] **Step 5: Agregar action `bulkUpdateVehicleAxleSizes`**

Justo después de `getVehicleAxleSizeOverrides`:

```typescript
/**
 * Upsert/delete bulk de overrides de medida por vehículo.
 * - tire_size string no vacío → upsert
 * - tire_size null o '' → delete
 */
export async function bulkUpdateVehicleAxleSizes(
  vehicleId: string,
  updates: Array<{ axle_number: number; tire_size: string | null }>
) {
  logger.debug('Bulk updating vehicle axle sizes', {
    data: { vehicleId, count: updates.length },
  });

  try {
    await prisma.$transaction(async (tx) => {
      for (const { axle_number, tire_size } of updates) {
        const cleaned = tire_size?.trim() ?? '';
        if (cleaned === '') {
          await tx.vehicle_axle_tire_sizes.deleteMany({
            where: { vehicle_id: vehicleId, axle_number },
          });
        } else {
          await tx.vehicle_axle_tire_sizes.upsert({
            where: {
              vehicle_id_axle_number: { vehicle_id: vehicleId, axle_number },
            },
            update: { tire_size: cleaned },
            create: { vehicle_id: vehicleId, axle_number, tire_size: cleaned },
          });
        }
      }
    });
    logger.info('Bulk updated vehicle axle sizes', { data: { vehicleId } });
  } catch (error) {
    logger.error('Error bulk updating vehicle axle sizes', { data: { error, vehicleId } });
    throw error;
  }
}
```

- [ ] **Step 6: Verificar tipos**

```bash
npm run check-types
```

Esperado: el archivo de actions debe compilar. Pueden quedar errores en consumidores que aún esperan el shape viejo (`vehicle-axle-editor.tsx` que pasa `tire_size: string`). Se corrigen en Task 8.

---

## Task 5: Server actions de Órdenes — validación + has_all_axle_sizes

**Archivos:**
- Modificar: `src/features/Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts`

- [ ] **Step 1: Importar el helper de readiness**

Al inicio del archivo, agregar import:

```typescript
import { checkVehicleTireReadiness } from '@/features/Mantenimiento/Gomeria/shared/check-vehicle-tire-readiness';
import { TIRE_READINESS_MESSAGES } from '@/features/Mantenimiento/Gomeria/shared/tire-readiness-messages';
```

- [ ] **Step 2: Validación en `createServiceOrder`**

Localizar la función `createServiceOrder`. Antes de la creación del registro (después de validar inputs), agregar:

```typescript
// Validar readiness del vehículo
const vehicleData = await prisma.vehicles.findUnique({
  where: { id: input.vehicle_id },
  select: { domain: true },
});
const vehicleDomain = vehicleData?.domain ?? input.vehicle_id;

const vehicleReadiness = await checkVehicleTireReadiness(input.vehicle_id);
if (!vehicleReadiness.ready) {
  if (vehicleReadiness.reason === 'no_template') {
    throw new Error(TIRE_READINESS_MESSAGES.no_template(vehicleDomain));
  }
  throw new Error(
    TIRE_READINESS_MESSAGES.missing_sizes(vehicleDomain, vehicleReadiness.missingAxles)
  );
}

// Validar readiness del trailer si aplica
if (input.trailer_vehicle_id) {
  const trailerData = await prisma.vehicles.findUnique({
    where: { id: input.trailer_vehicle_id },
    select: { domain: true },
  });
  const trailerDomain = trailerData?.domain ?? input.trailer_vehicle_id;

  const trailerReadiness = await checkVehicleTireReadiness(input.trailer_vehicle_id);
  if (!trailerReadiness.ready) {
    if (trailerReadiness.reason === 'no_template') {
      throw new Error(TIRE_READINESS_MESSAGES.no_template(trailerDomain));
    }
    throw new Error(
      TIRE_READINESS_MESSAGES.missing_sizes(trailerDomain, trailerReadiness.missingAxles)
    );
  }
}
```

- [ ] **Step 3: Defensiva en `ensureVehicleTirePositions`**

Al inicio de la función, después del log y antes de cualquier query:

```typescript
const readiness = await checkVehicleTireReadiness(vehicleId);
if (!readiness.ready) {
  const vehicleData = await prisma.vehicles.findUnique({
    where: { id: vehicleId },
    select: { domain: true },
  });
  const domain = vehicleData?.domain ?? vehicleId;
  if (readiness.reason === 'no_template') {
    throw new Error(TIRE_READINESS_MESSAGES.no_template(domain));
  }
  throw new Error(TIRE_READINESS_MESSAGES.missing_sizes(domain, readiness.missingAxles));
}
```

- [ ] **Step 4: Agregar `has_all_axle_sizes` en `searchVehicleByDomain`**

Localizar `searchVehicleByDomain`. Después del `findMany` inicial, computar el flag en batch para todos los resultados:

```typescript
// Resolver has_all_axle_sizes por vehículo (batch, sin N+1)
const vehicleIds = results.map((v) => v.id);

const [allAxles, allOverrides] = await Promise.all([
  prisma.tire_template_axles.findMany({
    where: {
      template: {
        OR: [
          { vehicles_override: { some: { id: { in: vehicleIds } } } },
          { sub_types: { some: { vehicles: { some: { id: { in: vehicleIds } } } } } },
        ],
      },
    },
    select: { template_id: true, axle_number: true, tire_size: true },
  }),
  prisma.vehicle_axle_tire_sizes.findMany({
    where: { vehicle_id: { in: vehicleIds } },
    select: { vehicle_id: true, axle_number: true, tire_size: true },
  }),
]);

// Construir map: vehicle_id → has_all_axle_sizes
const overridesByVehicle = new Map<string, Map<number, string>>();
for (const o of allOverrides) {
  if (!overridesByVehicle.has(o.vehicle_id)) overridesByVehicle.set(o.vehicle_id, new Map());
  overridesByVehicle.get(o.vehicle_id)!.set(o.axle_number, o.tire_size);
}

const axlesByTemplate = new Map<string, Array<{ axle_number: number; tire_size: string | null }>>();
for (const a of allAxles) {
  if (!axlesByTemplate.has(a.template_id)) axlesByTemplate.set(a.template_id, []);
  axlesByTemplate.get(a.template_id)!.push({ axle_number: a.axle_number, tire_size: a.tire_size });
}

const enriched = results.map((v) => {
  const effectiveTemplateId = v.tire_template_id ?? v.sub_type?.tire_template_id ?? null;
  if (!effectiveTemplateId) {
    return { ...v, has_all_axle_sizes: false, missing_axles_count: 0 };
  }
  const axles = axlesByTemplate.get(effectiveTemplateId) ?? [];
  const overrides = overridesByVehicle.get(v.id) ?? new Map<number, string>();
  const missing = axles.filter(
    (a) => !(overrides.get(a.axle_number) ?? a.tire_size)
  );
  return {
    ...v,
    has_all_axle_sizes: missing.length === 0,
    missing_axles_count: missing.length,
  };
});

return enriched;
```

**Nota**: agregar `tire_template_id` y `sub_type: { select: { tire_template_id: true } }` al `select` del `findMany` inicial si no estaban ya presentes (verificar antes de editar).

- [ ] **Step 5: Mismo enriquecimiento en `searchCompatibleHitchVehicles`**

Aplicar la misma lógica de batch en `searchCompatibleHitchVehicles` (después del findMany inicial). El bloque es idéntico al del Step 4 — copiar y adaptar al nombre de la variable de resultados.

- [ ] **Step 6: Defensiva en `getAvailableTiresForAxle`**

Localizar la función (alrededor de la línea 623). Al inicio del try, agregar:

```typescript
if (!tireSize || tireSize.trim() === '') {
  logger.warn('getAvailableTiresForAxle called with empty tireSize, returning empty array');
  return [];
}
```

- [ ] **Step 7: Verificar tipos**

```bash
npm run check-types
```

Esperado: sin errores nuevos en el archivo. Pueden quedar errores en `ServiceOrderWizard.tsx` que consume `VehicleSearchResult` (se corrige en Task 9).

---

## Task 6: UI Plantillas — input opcional + columna nueva

**Archivos:**
- Modificar: `src/features/Mantenimiento/Gomeria/Plantillas/components/AxleConfigurator.tsx`
- Modificar: `src/features/Mantenimiento/Gomeria/Plantillas/components/TemplateForm.tsx`
- Modificar: `src/features/Mantenimiento/Gomeria/Plantillas/components/columns.tsx`

- [ ] **Step 1: `AxleConfigurator` — actualizar placeholder**

En `AxleConfigurator.tsx`, en el `<Input>` de `tire_size` (línea ~114), cambiar el placeholder:

```tsx
<Input
  placeholder="Ej: 295/80R22.5 (opcional)"
  value={axle.tire_size ?? ''}
  onChange={(e) => updateAxle(index, { tire_size: e.target.value })}
  className="h-8 text-xs"
/>
```

Nota: `value={axle.tire_size ?? ''}` para manejar el nuevo tipo `string | null`.

- [ ] **Step 2: `AxleConfigurator` — ajustar el default de fila nueva**

En `createDefaultAxle`, cambiar:

```typescript
function createDefaultAxle(axleNumber: number, isSpare = false): AxleInput {
  return {
    axle_number: axleNumber,
    tires_per_side: isSpare ? 1 : 1,
    tire_size: null,                     // antes: ''
    is_drive_axle: false,
    is_spare: isSpare,
  };
}
```

Y dentro de `updateAxle`, donde el código asignaría `''`, mantener `null` cuando el input esté vacío:

```typescript
// En el onChange del input tire_size, en el componente:
onChange={(e) => {
  const val = e.target.value;
  updateAxle(index, { tire_size: val.trim() === '' ? null : val });
}}
```

- [ ] **Step 3: `TemplateForm` — eliminar validación de tire_size requerido**

En `TemplateForm.tsx`, en `onSubmit` (líneas 128-140), eliminar el bloque `missingSize`:

```typescript
function onSubmit(values: TemplateFormValues) {
  if (axles.length === 0) {
    toast.error('Debe configurar al menos un eje');
    return;
  }
  // (BLOQUE missingSize ELIMINADO)
  mutation.mutate(values);
}
```

- [ ] **Step 4: `TemplateForm` — agregar nota explicativa**

Inmediatamente después del bloque `<AxleConfigurator value={axles} onChange={setAxles} />` (alrededor de la línea 206):

```tsx
<p className="text-xs text-muted-foreground italic">
  Si no cargás la medida de un eje, se podrá configurar por vehículo en la tab Cubiertas del equipo.
</p>
```

- [ ] **Step 5: `columns.tsx` — columna "Medidas"**

Agregar la columna después de la columna "Posiciones" (línea ~122). Ajustar el header del bloque `// --- Created At ---` agregando antes:

```tsx
// --- Sizes Status (virtual) ---
{
  id: 'sizes_status',
  accessorFn: (row) => {
    const axles = row.axles ?? [];
    if (axles.length === 0) return 'empty';
    const withSize = axles.filter((a) => a.tire_size && a.tire_size.trim() !== '').length;
    if (withSize === 0) return 'none';
    if (withSize === axles.length) return 'all';
    return 'partial';
  },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Medidas" />,
  cell: ({ row }) => {
    const axles = row.original.axles ?? [];
    if (axles.length === 0) {
      return <Badge variant="outline">—</Badge>;
    }
    const withSize = axles.filter((a) => a.tire_size && a.tire_size.trim() !== '').length;
    if (withSize === axles.length) {
      return <Badge variant="success">Todas</Badge>;
    }
    if (withSize === 0) {
      return <Badge variant="outline">Por vehículo</Badge>;
    }
    return <Badge variant="yellow">Parciales</Badge>;
  },
  enableSorting: false,
  meta: { title: 'Medidas' },
},
```

- [ ] **Step 6: Verificar tipos**

```bash
npm run check-types
```

Esperado: sin errores en los 3 archivos modificados.

- [ ] **Step 7: Verificación manual**

Levantar dev server (`npm run dev`), ir a `/dashboard/maintenance/gomeria` → tab Plantillas:
- Crear plantilla nueva sin medida en algún eje → guarda OK
- Crear plantilla con todas las medidas → guarda OK (compat)
- Ver la columna "Medidas" mostrando "Todas" / "Parciales" / "Por vehículo" según corresponda
- Editar plantilla existente, vaciar una medida → guarda OK

---

## Task 7: Nuevo componente `VehicleAxleSizesForm`

**Archivos:**
- Crear: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-sizes-form.tsx`

- [ ] **Step 1: Crear el componente**

Crear el archivo con:

```tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logger } from '@/lib/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  bulkUpdateVehicleAxleSizes,
  getVehicleAxleSizeOverrides,
} from './actions.server';

const logger = new Logger('VehicleAxleSizesForm');

// ─── Props ─────────────────────────────────────────────────────────────────

interface VehicleAxleSizesFormProps {
  vehicleId: string;
  /** Axles del template efectivo del vehículo */
  axles: Array<{
    axle_number: number;
    tire_size: string | null;
    is_drive_axle: boolean;
    is_spare: boolean;
  }>;
  /** Indica si la plantilla efectiva del vehículo es un override geométrico propio */
  hasGeometricOverride: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function VehicleAxleSizesForm({
  vehicleId,
  axles,
  hasGeometricOverride,
}: VehicleAxleSizesFormProps) {
  const queryClient = useQueryClient();

  // Cargar overrides actuales
  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ['vehicle-axle-size-overrides', vehicleId],
    queryFn: () => getVehicleAxleSizeOverrides(vehicleId),
    staleTime: 30 * 1000,
  });

  // Estado local por axle_number
  const [values, setValues] = useState<Record<number, string>>({});

  // Sincronizar con los overrides cargados (initial + updates)
  useEffect(() => {
    const initial: Record<number, string> = {};
    for (const o of overrides) {
      initial[o.axle_number] = o.tire_size;
    }
    setValues(initial);
  }, [overrides]);

  // Detectar cambios respecto al estado inicial
  const initialMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of overrides) m[o.axle_number] = o.tire_size;
    return m;
  }, [overrides]);

  const hasChanges = useMemo(() => {
    const allKeys = new Set([
      ...Object.keys(initialMap).map(Number),
      ...Object.keys(values).map(Number),
    ]);
    for (const k of allKeys) {
      const a = (initialMap[k] ?? '').trim();
      const b = (values[k] ?? '').trim();
      if (a !== b) return true;
    }
    return false;
  }, [initialMap, values]);

  // Mutation
  const mutation = useMutation({
    mutationFn: () => {
      const updates = axles.map((axle) => ({
        axle_number: axle.axle_number,
        tire_size: values[axle.axle_number]?.trim() ? values[axle.axle_number].trim() : null,
      }));
      return bulkUpdateVehicleAxleSizes(vehicleId, updates);
    },
    onSuccess: () => {
      toast.success('Medidas actualizadas correctamente');
      queryClient.invalidateQueries({ queryKey: ['vehicle-axle-size-overrides', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-tire-positions', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-template-info', vehicleId] });
    },
    onError: (error) => {
      logger.error('Error updating vehicle axle sizes', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al actualizar las medidas');
    },
  });

  function handleChange(axleNumber: number, value: string) {
    setValues((prev) => ({ ...prev, [axleNumber]: value }));
  }

  function handleClear(axleNumber: number) {
    setValues((prev) => {
      const next = { ...prev };
      delete next[axleNumber];
      return next;
    });
  }

  function getEffectiveSize(axleNumber: number, templateSize: string | null): string | null {
    const override = values[axleNumber]?.trim();
    if (override) return override;
    return templateSize ?? null;
  }

  // Contar axles sin medida resuelta
  const missingCount = axles.filter(
    (a) => !getEffectiveSize(a.axle_number, a.tire_size)
  ).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medidas de cubierta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted/30 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (axles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Medidas de cubierta</CardTitle>
            <CardDescription>
              Configurá la medida específica para cada eje. Si dejás un eje vacío, hereda de la
              plantilla.
            </CardDescription>
          </div>
          {hasGeometricOverride && (
            <Badge variant="outline" className="shrink-0">
              Plantilla personalizada del equipo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingCount > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              {missingCount === 1
                ? 'Falta 1 medida.'
                : `Faltan ${missingCount} medidas.`}{' '}
              No podrás iniciar órdenes de gomería para este equipo hasta completarlas.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {axles.map((axle) => {
            const overrideValue = values[axle.axle_number] ?? '';
            const hasOverride = overrideValue.trim() !== '';
            const effectiveSize = getEffectiveSize(axle.axle_number, axle.tire_size);
            const isPending = !effectiveSize;

            return (
              <div
                key={axle.axle_number}
                className="grid grid-cols-[3rem_1fr] gap-3 items-start py-2 border-b last:border-b-0"
              >
                <div className="flex flex-col items-center gap-1 pt-1">
                  <span className="font-mono text-sm font-semibold">{axle.axle_number}</span>
                  {axle.is_drive_axle && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      Tractor
                    </Badge>
                  )}
                  {axle.is_spare && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      Auxilio
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Label className="text-xs">Plantilla:</Label>
                    <span className="font-mono">{axle.tire_size ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={
                        axle.tire_size ? `Override (heredando: ${axle.tire_size})` : 'Ej: 295/80R22.5'
                      }
                      value={overrideValue}
                      onChange={(e) => handleChange(axle.axle_number, e.target.value)}
                      className="h-8 text-sm"
                    />
                    {hasOverride && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleClear(axle.axle_number)}
                        title="Limpiar override (volver a heredar)"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isPending && (
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        Sin configurar
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => mutation.mutate()} disabled={!hasChanges || mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar medidas'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

Esperado: el archivo nuevo compila. Pueden persistir errores en el archivo padre que aún no consume el componente (Task 8).

---

## Task 8: Integrar `VehicleAxleSizesForm` + ajustar editor geométrico

**Archivos:**
- Modificar: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-diagram-section.tsx`
- Modificar: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-editor.tsx`

- [ ] **Step 1: Importar y renderizar `VehicleAxleSizesForm`**

En `vehicle-tire-diagram-section.tsx`, agregar el import:

```typescript
import { VehicleAxleSizesForm } from './vehicle-axle-sizes-form';
```

Localizar la parte del JSX donde se renderiza el diagrama del vehículo y el editor geométrico (la sección con el `TireDiagramRenderer` y el botón "Editar configuración"). **Debajo del diagrama** y **arriba** de la zona del editor geométrico, agregar:

```tsx
<VehicleAxleSizesForm
  vehicleId={vehicleId}
  axles={axles.map((a) => ({
    axle_number: a.axle_number,
    tire_size: a.tire_size,
    is_drive_axle: a.is_drive_axle,
    is_spare: a.is_spare,
  }))}
  hasGeometricOverride={templateInfo?.sourceType === 'vehicle'}
/>
```

**Nota**: Verificar los nombres de las variables disponibles en el componente (`axles`, `templateInfo`, etc.) — si difieren, ajustar el mapeo. Si el archivo es Server Component, este componente debe ir renderizado dentro de un Client Component padre o el archivo debe convertirse a Client Component (revisar al implementar).

- [ ] **Step 2: Quitar validación de tire_size en `vehicle-axle-editor.tsx`**

En `vehicle-axle-editor.tsx`, en la función `validate` (líneas 99-106), eliminar el bloque de missing sizes:

```typescript
function validate(): string | null {
  if (axles.length === 0) return 'Debe configurar al menos un eje.';
  return null;
}
```

- [ ] **Step 3: Ajustar shape de axles defaults en `vehicle-axle-editor.tsx`**

En las dos ocurrencias del default (líneas 76 y 88):

```typescript
[{ axle_number: 1, tires_per_side: 1, tire_size: null, is_drive_axle: false, is_spare: false }]
```

(Cambiar `tire_size: ''` por `tire_size: null`.)

- [ ] **Step 4: Manejar `value` del input en `AxleConfigurator` cuando viene de este editor**

El `AxleConfigurator` ya fue ajustado en Task 6 para aceptar `tire_size: string | null`. Sin cambios adicionales acá.

- [ ] **Step 5: Verificar tipos**

```bash
npm run check-types
```

Esperado: sin errores en los archivos modificados.

- [ ] **Step 6: Verificación manual**

En el dev server:
- Ir a `/maintenance/equipment/<vehicleId>?tab=tires` para un vehículo con plantilla.
- Confirmar que aparece la nueva sección "Medidas de cubierta" debajo del diagrama.
- Caso A — plantilla con medidas: cargar overrides en algunos ejes, guardar, recargar y ver que persistieron.
- Caso B — plantilla sin medidas: ver el banner rojo de "Faltan N medidas"; cargar overrides; guardar; ver que el banner desaparece.
- Botón "Guardar medidas" debe deshabilitarse cuando no hay cambios.
- Botón ✕ debe limpiar el override y volver a heredar de la plantilla.
- Verificar que editar el override geométrico desde el editor existente NO requiere tire_size (queda vacío en el `AxleConfigurator`).

---

## Task 9: UI Wizard de órdenes — badges + canProceed + mensajes

**Archivos:**
- Modificar: `src/features/Mantenimiento/Gomeria/Ordenes/components/ServiceOrderWizard.tsx`
- Modificar: `src/features/Mantenimiento/Gomeria/Ordenes/components/TirePositionCard.tsx`
- Modificar: `src/features/Mantenimiento/Gomeria/Ordenes/components/TireReplacePicker.tsx`

- [ ] **Step 1: Actualizar `VehicleRow` con triple badge**

En `ServiceOrderWizard.tsx`, en el componente `VehicleRow` (línea ~432), reemplazar el bloque de badges:

```tsx
<div className="flex items-center gap-2">
  {!vehicle.tire_template_id ? (
    <Badge variant="destructive" className="text-[10px]">
      Sin plantilla
    </Badge>
  ) : !vehicle.has_all_axle_sizes ? (
    <Badge variant="yellow" className="text-[10px]">
      Faltan medidas
    </Badge>
  ) : (
    <Badge variant="success" className="text-[10px]">
      Listo
    </Badge>
  )}
  {selected && <Check className="h-4 w-4 text-primary" />}
</div>
```

- [ ] **Step 2: Agregar mensaje "Faltan medidas" en selected box**

En `VehicleSearchSection` (líneas ~349-364), después del bloque existente de "Sin plantilla", agregar caso paralelo:

```tsx
{selectedVehicle && selectedVehicle.tire_template_id && !selectedVehicle.has_all_axle_sizes && (
  <p className="text-xs text-destructive">
    Este vehículo tiene la plantilla asignada pero faltan medidas de cubierta.{' '}
    <a
      href={`/maintenance/equipment/${selectedVehicle.id}?tab=tires`}
      target="_blank"
      rel="noopener noreferrer"
      className="underline font-medium"
    >
      Configurar en la tab Cubiertas
    </a>{' '}
    antes de iniciar la orden.
  </p>
)}
```

Y el chip "Sin plantilla" del header de la selected card (líneas ~349-354) reemplazar por:

```tsx
{!selectedVehicle.tire_template_id ? (
  <div className="flex items-center gap-1 text-destructive text-xs">
    <AlertTriangle className="h-3.5 w-3.5" />
    Sin plantilla
  </div>
) : !selectedVehicle.has_all_axle_sizes ? (
  <div className="flex items-center gap-1 text-yellow-600 text-xs">
    <AlertTriangle className="h-3.5 w-3.5" />
    Faltan medidas
  </div>
) : null}
```

- [ ] **Step 3: Mismo cambio en `TrailerSearchSection`**

En el bloque condicional del selected trailer (línea ~414-419), reemplazar:

```tsx
{selectedTrailer && !selectedTrailer.tire_template_id && (
  <div className="flex items-center gap-1.5 text-destructive text-xs rounded-md border border-destructive/30 bg-destructive/5 p-2">
    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
    El enganche no tiene plantilla de cubiertas asignada
  </div>
)}
{selectedTrailer && selectedTrailer.tire_template_id && !selectedTrailer.has_all_axle_sizes && (
  <div className="flex items-start gap-1.5 text-destructive text-xs rounded-md border border-destructive/30 bg-destructive/5 p-2">
    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
    <span>
      El enganche tiene plantilla pero faltan medidas.{' '}
      <a
        href={`/maintenance/equipment/${selectedTrailer.id}?tab=tires`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Configurar en la tab Cubiertas
      </a>
      .
    </span>
  </div>
)}
```

- [ ] **Step 4: Actualizar `canProceed`**

En `ServiceOrderWizard.tsx` (línea ~135-138), reemplazar:

```typescript
const canProceed =
  !!activeVehicleId &&
  (skipVehicleSearch ||
    (!!selectedVehicle?.tire_template_id && selectedVehicle?.has_all_axle_sizes === true)) &&
  (!hasTrailer ||
    (!!selectedTrailer?.tire_template_id && selectedTrailer?.has_all_axle_sizes === true));
```

- [ ] **Step 5: `TirePositionCard` — usar `effective_tire_size`**

En `TirePositionCard.tsx` (línea ~52), reemplazar:

```typescript
const tireSize = position.effective_tire_size ?? '';
```

(El campo `effective_tire_size` viene resuelto por el cambio del Task 4.)

Buscar todas las ocurrencias de `({tireSize})` en el JSX (líneas ~377, ~402, ~609) y donde diga `medida {tireSize}` o `Cubierta nueva ({tireSize})` etc., envolver con manejo de vacío. Reemplazar la línea del `EmptyPositionAssign` (~609):

```tsx
<p className="text-sm text-muted-foreground">
  {tireSize ? (
    <>Seleccione la cubierta a instalar en esta posición (medida {tireSize}):</>
  ) : (
    <span className="italic">
      Medida no configurada para este eje. Configurelas en la tab Cubiertas del equipo.
    </span>
  )}
</p>
```

Y los labels de "Reparar" (~377) y "Reemplazar" (~402):

```tsx
<Label className="text-xs mb-1 block">
  {tireSize ? `Cubierta de reemplazo (${tireSize})` : 'Cubierta de reemplazo (medida no configurada)'}
</Label>
```

- [ ] **Step 6: `TireReplacePicker` — early return defensiva**

En `TireReplacePicker.tsx`, después del destructuring de props (línea ~40), agregar:

```typescript
if (!tireSize || tireSize.trim() === '') {
  return (
    <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground italic">
      Configurá la medida de este eje en la tab Cubiertas del equipo antes de asignar una cubierta.
    </div>
  );
}
```

- [ ] **Step 7: Verificar tipos**

```bash
npm run check-types
```

Esperado: sin errores nuevos.

- [ ] **Step 8: Verificación manual**

En dev:
- Wizard de gomería → buscar un vehículo con plantilla pero sin medidas resueltas → badge "Faltan medidas" + mensaje con link.
- Botón "Iniciar Operación" deshabilitado.
- Configurar las medidas desde el link en nueva pestaña → volver al wizard, refrescar la búsqueda → badge ahora "Listo", botón habilitado.
- Iniciar la orden → todo funciona como antes.

---

## Task 10: UI Diagrama — tooltip usa effective_size

**Archivos:**
- Modificar: `src/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer.tsx`

- [ ] **Step 1: Ajustar tooltip**

En `TireDiagramRenderer.tsx` (línea ~70), el bloque actual:

```typescript
const tooltipLines: string[] = [];
if (position.tire_brand) tooltipLines.push(`Marca: ${position.tire_brand}`);
if (position.tire_size) tooltipLines.push(`Medida: ${position.tire_size}`);
if (position.tire_serial) tooltipLines.push(`Serie: ${position.tire_serial}`);
```

Queda igual (ya tiene el guard `if (position.tire_size)`). El campo `tire_size` en el shape de `DiagramPosition` ya se llena con el `effective_tire_size` del server (Task 4) cuando el consumidor del renderer pasa los positions. Verificar que el componente padre que arma `positions` pase `tire_size: position.effective_tire_size ?? position.tire?.tire_type?.size ?? undefined` en lugar de solo `position.tire?.tire_type?.size`.

- [ ] **Step 2: Localizar consumidores del renderer y ajustar mapping**

Buscar usages en `TireDiagram.tsx` y en `vehicle-tire-diagram-section.tsx`:

```bash
grep -n "tire_size:" src/features/Mantenimiento/Gomeria/Ordenes/components/TireDiagram.tsx
grep -n "tire_size:" src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-diagram-section.tsx
```

En cada uno, donde se construye el `positions` array, cambiar de:

```typescript
tire_size: pos.tire?.tire_type?.size ?? undefined,
```

a:

```typescript
tire_size: pos.effective_tire_size ?? pos.tire?.tire_type?.size ?? undefined,
```

(El `effective_tire_size` viene del server desde Task 4. Si la cubierta instalada tiene su propio `tire_type.size`, ese se sigue mostrando como fallback.)

- [ ] **Step 3: Verificar tipos**

```bash
npm run check-types
```

Esperado: sin errores.

- [ ] **Step 4: Verificación manual**

En dev: abrir un vehículo con cubiertas instaladas → tooltip del diagrama muestra "Medida: XXX" cuando hay medida resuelta; no muestra esa línea cuando no hay medida resuelta ni cubierta instalada.

---

## Task 11: Verificación end-to-end manual

**Archivos:** ninguno (solo verificación)

- [ ] **Step 1: Type check global**

```bash
npm run check-types
```

Esperado: 0 errores.

- [ ] **Step 2: Plantillas**

Levantar dev (`npm run dev`):
- [ ] Crear plantilla nueva SIN medidas → guarda OK
- [ ] Crear plantilla nueva CON medidas → guarda OK (compat)
- [ ] Editar plantilla existente, vaciar una medida → guarda OK
- [ ] Columna "Medidas" muestra el badge correcto (Todas / Parciales / Por vehículo)

- [ ] **Step 3: Vehículo**

- [ ] Vehículo con sub_type que tiene plantilla SIN medidas → la sección "Medidas de cubierta" muestra banner rojo + axles con "Sin configurar"
- [ ] Cargar overrides → guarda OK
- [ ] Limpiar override con ✕ → vuelve a heredar de plantilla
- [ ] Vehículo con override geométrico (is_vehicle_override=true) → chip "Plantilla personalizada del equipo" visible
- [ ] Cambiar geometría (vehicle-axle-editor) removiendo un eje que tenía override de medida → el override del axle eliminado se borra automáticamente

- [ ] **Step 4: Wizard de órdenes**

- [ ] Buscar vehículo sin plantilla → badge "Sin plantilla", botón deshabilitado
- [ ] Buscar vehículo con plantilla pero sin medidas → badge "Faltan medidas", botón deshabilitado, link a tab Cubiertas
- [ ] Buscar vehículo con todo OK → badge "Listo", botón habilitado
- [ ] Iniciar orden → posiciones se generan; abrir posición vacía → picker filtra por medida correcta
- [ ] Asignar cubierta → OK

- [ ] **Step 5: Trailer (si hay enganche)**

- [ ] Repetir Step 4 con un trailer agregado (vehículo tractor + enganche)

- [ ] **Step 6: Cypress E2E (opcional, si el tiempo lo permite)**

Si el proyecto agrega tests E2E para gomería en el futuro, este es el momento de cubrir:
- Flujo de creación de plantilla sin medidas
- Configuración de medidas por vehículo
- Bloqueo de wizard si faltan medidas

---

## Notas finales

- **Sin commits durante la implementación**: cuando todas las tareas estén verificadas, el usuario decidirá qué commit estructura quiere (uno solo, o por tarea).
- **Migración legacy**: fuera de alcance. Las plantillas existentes siguen funcionando porque tienen `tire_size` cargado y el resolver hace `vehicle_override ?? template_size ?? null`.
- **Permisos**: las nuevas acciones (`getVehicleAxleSizeOverrides`, `bulkUpdateVehicleAxleSizes`) usan los permisos existentes de la tab Cubiertas del vehículo. No requieren entradas nuevas en `permissions-map.ts`.
