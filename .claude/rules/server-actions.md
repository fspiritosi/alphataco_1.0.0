# Server Actions, NO API Routes

**SIEMPRE** usar Server Actions (`'use server'`) en lugar de rutas API (`/api/*`).

## Ubicacion de Server Actions

**Las Server Actions deben ubicarse SIEMPRE dentro de la carpeta de la feature correspondiente.**
Cada feature debe tener su propia logica y acciones en:

```
src/features/{FeatureName}/
├── actions.ts                  # Server actions de la feature ('use server')
├── actionsClient.ts            # (opcional) Acciones especificas del lado cliente si es necesario
```

> **Importante:** Aunque actualmente existen algunas Server Actions en `src/app/server/`, si al modificar una feature encuentras ahi funciones que pertenecen a esa feature, debes moverlas **tal cual** (sin cambios en la logica) a `src/features/{FeatureName}/actions.ts` y usar ese nuevo path para todos los imports en el proyecto. Asi se garantiza la correcta organizacion y mantenimiento.

**Resumen de ubicaciones correctas:**

- `src/features/{FeatureName}/actions.ts` → Server Actions ('use server') para esa feature (SIEMPRE aqui)
- `src/features/{FeatureName}/actionsClient.ts` → Acciones del lado del cliente si son necesarias para la feature

**NO usar `src/app/server/` para nuevas Server Actions ni modificaciones; migrar a features cuando corresponda.**

## Nomenclatura de Server Actions

Usar formato `metodoFiltroEntidad`:

```typescript
// ✅ CORRECTO
getAllEmployees();
getActivesEmployees();
createNewFormAnswer();
updateVehicle();
deleteDocument();

// ❌ INCORRECTO
getEmployees(); // Falta especificidad
getActive(); // Falta entidad
createForm(); // Falta especificidad
```

## Formato de Server Action

**Nuevo estándar — Prisma + Logger + Tipos exportados:**

```typescript
'use server';

import { prisma } from '@/shared/lib/prisma';
import { Logger } from '@/lib/logger';

const logger = new Logger('features/Employees');

/**
 * Descripcion de lo que hace la funcion
 */
export async function getAllEmployees() {
  logger.debug('Obteniendo empleados');

  try {
    const data = await prisma.employees.findMany({
      select: { id: true, firstname: true, lastname: true, file_number: true },
      orderBy: { lastname: 'asc' },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener empleados', { data: { error } });
    throw error;
  }
}

// Tipos inferidos del retorno — NUNCA definir manualmente
export type EmployeesData = Awaited<ReturnType<typeof getAllEmployees>>;
export type EmployeeItem = EmployeesData[number];
```

**Legacy — Supabase (solo en código existente no migrado aún):**

```typescript
'use server';

import { supabaseServer } from '@/lib/supabase/server';

export async function getAllEmployees() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('employees').select('*');
  if (error) throw error;
  return data || [];
}
```

> Al encontrar una server action que use Supabase para fetching, **preguntar al usuario si desea migrarla a Prisma** antes de continuar con la tarea principal. El cambio es solo en el mecanismo de fetch, sin alterar la lógica ni los datos retornados.

## Reglas de Server Actions

```typescript
// ✅ CORRECTO
'use server';
export async function getAllEmployees() { ... }

// ❌ INCORRECTO - NO crear rutas API
// app/api/employees/route.ts
export async function GET() { ... }

// ❌ INCORRECTO - NO olvidar validar permisos
export async function createEmployee(data) {
  await prisma.employees.create({ data }); // Falta validacion de permisos
}

// ❌ INCORRECTO - NO usar 'use server' en archivos de cliente
'use client';
'use server'; // Esto no funciona
```
