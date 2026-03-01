# NO `:any` - SIEMPRE Inferir Tipos

**NUNCA** tipar datos como `:any` o `:Any`. SIEMPRE inferir el tipado usando el tipo de retorno de las funciones.

## Patrón Canónico de Server Action con Prisma + Logger + Tipado

Este es el formato completo obligatorio para toda server action de fetching:

```typescript
'use server';

import { prisma } from '@/shared/lib/prisma';
import { Logger } from '@/lib/logger';

const logger = new Logger('features/MyFeature');

/**
 * Descripcion de lo que hace la funcion
 */
export async function getMyEntityById(id: string) {
  logger.debug('Obteniendo entidad', { data: { id } });

  try {
    const data = await prisma.myEntity.findMany({
      where: { parent_id: id },
      include: {
        related: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener entidad', { data: { error, id } });
    throw error;
  }
}

// Tipos inferidos del retorno — NUNCA definir manualmente
export type MyEntityData = Awaited<ReturnType<typeof getMyEntityById>>;
export type MyEntityEntry = MyEntityData[number];
```

## Reglas de Tipado

```typescript
// ❌ INCORRECTO - NUNCA hacer esto
const data: any = await fetchData();
function handleData(data: any) { ... }
type MyType = { id: string; name: string }; // manual, se desincroniza

// ✅ CORRECTO - Inferir del retorno de la funcion
export type MyEntityData = Awaited<ReturnType<typeof getMyEntityById>>;
export type MyEntityEntry = MyEntityData[number];

// Usar el tipo en componentes
const entries: MyEntityData = await getMyEntityById(id);
```

## Tipado en Formularios — desde el Schema Zod

Para formularios, el tipo se infiere del schema Zod, **no** de la server action:

```typescript
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  employeeId: z.string().uuid(),
  date: z.date(),
});

// ✅ CORRECTO — tipo inferido del schema
type FormValues = z.infer<typeof formSchema>;

// ❌ INCORRECTO — tipo manual
type FormValues = {
  name: string;
  employeeId: string;
  date: Date;
};
```

## Resumen de Patrones de Inferencia

| Contexto                       | Como inferir el tipo                       |
| ------------------------------ | ------------------------------------------ |
| Dato de server action (Prisma) | `Awaited<ReturnType<typeof myFn>>`         |
| Item individual de un array    | `Awaited<ReturnType<typeof myFn>>[number]` |
| Valores de formulario          | `z.infer<typeof formSchema>`               |
| Props de componente            | Inferir desde el tipo del dato que recibe  |
