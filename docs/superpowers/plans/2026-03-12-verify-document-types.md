# Verificacion de Consistencia de Tipos de Documento — Plan de Implementacion

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boton "Verificar documentos" en el modal de edicion de tipos de documento que detecta y corrige inconsistencias entre condiciones y alertas en BD.

**Architecture:** Extraer helper `buildConditionsWhereClause()` del codigo existente, crear 2 server actions nuevas (`verifyDocumentTypeConsistency`, `fixDocumentTypeConsistency`), crear Dialog con skeleton loading + estados (vacio/inconsistencias/error), y threading de permisos desde el Server Component padre al modal.

**Tech Stack:** Next.js 16, React 19, Prisma, React Query, shadcn/ui, Lucide icons, moment.js

**Spec:** `docs/superpowers/specs/2026-03-12-verify-document-types-design.md`

---

## Mapa de Archivos

| Archivo                                                                              | Accion    | Responsabilidad                                                                                                   |
| ------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`               | MODIFICAR | Extraer `buildConditionsWhereClause()`, agregar `verifyDocumentTypeConsistency()`, `fixDocumentTypeConsistency()` |
| `src/features/Documentacion/TiposDocumentos/components/_VerifyDocumentsSkeleton.tsx` | CREAR     | Skeleton loading que simula la UI del Dialog de verificacion                                                      |
| `src/features/Documentacion/TiposDocumentos/components/_VerifyDocumentsDialog.tsx`   | CREAR     | Dialog principal con useQuery, estados, tabla de resultados, AlertDialog de confirmacion                          |
| `src/features/Documentacion/TiposDocumentos/components/_DocumentTypeFormModal.tsx`   | MODIFICAR | Agregar prop `permissionsMap`, boton "Verificar documentos" en footer                                             |
| `src/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent.tsx`           | MODIFICAR | Pasar `permissions` a `PersonasList` y `EquiposList`                                                              |
| `src/features/Documentacion/TiposDocumentos/PersonasList/PersonasList.tsx`           | MODIFICAR | Recibir y pasar `permissionsMap` a `_PersonasDataTable`                                                           |
| `src/features/Documentacion/TiposDocumentos/PersonasList/_PersonasDataTable.tsx`     | MODIFICAR | Recibir y pasar `permissionsMap` al modal                                                                         |
| `src/features/Documentacion/TiposDocumentos/EquiposList/EquiposList.tsx`             | MODIFICAR | Recibir y pasar `permissionsMap` a `_EquiposDataTable`                                                            |
| `src/features/Documentacion/TiposDocumentos/EquiposList/_EquiposDataTable.tsx`       | MODIFICAR | Recibir y pasar `permissionsMap` al modal                                                                         |

---

## Task 1: Extraer `buildConditionsWhereClause()` y refactorizar `countMatchingResources`

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts:700-783`

Este task extrae la logica de construccion de WHERE desde `countMatchingResources` a un helper reutilizable. `countMatchingResources` se refactoriza para usar el helper sin cambiar su comportamiento.

- [ ] **Step 1: Crear el helper `buildConditionsWhereClause` encima de `countMatchingResources`**

Agregar justo antes de la funcion `countMatchingResources` (linea ~721):

```typescript
/**
 * Construye SOLO la parte de condiciones del WHERE de Prisma.
 * NO incluye company_id ni is_active — eso lo agrega el llamador.
 * Retorna {} si no hay condiciones validas (para componer con AND).
 */
function buildConditionsWhereClause(
  applies: 'Persona' | 'Equipos',
  conditionsJson: string | Prisma.JsonValue[] | null
): Record<string, unknown> {
  const conditionsWhere: Record<string, unknown> = {};

  // Parse si es string
  let conditionsArray: unknown[];
  if (typeof conditionsJson === 'string') {
    try {
      conditionsArray = JSON.parse(conditionsJson);
    } catch {
      return {};
    }
  } else if (Array.isArray(conditionsJson)) {
    conditionsArray = conditionsJson;
  } else {
    return {};
  }

  if (!conditionsArray || conditionsArray.length === 0) return {};

  for (const raw of conditionsArray) {
    if (!raw || typeof raw !== 'object') continue;
    const condition = raw as unknown as ConditionJsonEntry;

    const { ids, relation_type, relation_table, filter_column } = condition;
    if (!ids || ids.length === 0) continue;

    if (relation_type === 'many_to_many' && relation_table) {
      conditionsWhere[relation_table] = { some: { [filter_column]: { in: ids } } };
    } else {
      const isBigIntEmployee = applies === 'Persona' && BIGINT_COLUMNS_EMPLOYEES.has(filter_column);
      const isBigIntVehicle = applies === 'Equipos' && BIGINT_COLUMNS_VEHICLES.has(filter_column);

      if (isBigIntEmployee || isBigIntVehicle) {
        const bigintIds = ids.map(Number).filter((n) => !isNaN(n));
        if (bigintIds.length > 0) {
          conditionsWhere[filter_column] = { in: bigintIds };
        }
      } else {
        conditionsWhere[filter_column] = ids.length === 1 ? ids[0] : { in: ids };
      }
    }
  }

  return conditionsWhere;
}
```

- [ ] **Step 2: Refactorizar `countMatchingResources` para usar el helper**

Reemplazar el cuerpo del `try` de `countMatchingResources` (lineas ~734-776):

```typescript
export async function countMatchingResources(applies: string, conditionsJson: Prisma.JsonValue[]): Promise<number> {
  const companyId = await getServerCompanyId();

  logger.debug('Contando recursos para condiciones', { data: { applies } });

  try {
    const baseWhere: Record<string, unknown> = {
      company_id: companyId,
      is_active: true,
    };

    const conditionsWhere = buildConditionsWhereClause(applies as 'Persona' | 'Equipos', conditionsJson);

    const where = { ...baseWhere, ...conditionsWhere };

    if (applies === 'Persona') {
      return await prisma.employees.count({
        where: where as Prisma.employeesWhereInput,
      });
    } else if (applies === 'Equipos') {
      return await prisma.vehicles.count({
        where: where as Prisma.vehiclesWhereInput,
      });
    }

    return 0;
  } catch (error) {
    logger.error('Error al contar recursos para condiciones', { data: { error, applies } });
    return 0;
  }
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS sin errores nuevos

---

## Task 2: Server action `verifyDocumentTypeConsistency`

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts` (agregar al final, antes de EXPORTED TYPES)

- [ ] **Step 1: Agregar interfaces de tipos de retorno**

Agregar antes de la seccion EXPORTED TYPES:

```typescript
// ============================================================================
// VERIFY DOCUMENT TYPE CONSISTENCY
// ============================================================================

interface VerifyStats {
  totalResources: number;
  totalWithAlert: number;
  totalMissing: number;
  totalOrphan: number;
}

interface EmployeeResource {
  id: string;
  firstname: string;
  lastname: string;
  file_number: string | null;
}

interface EquipmentResource {
  id: string;
  domain: string | null;
  intern_number: string | null;
  brand: string | null;
  type: string | null;
}

interface EmployeeVerifyResult {
  applies: 'Persona';
  missing: EmployeeResource[];
  orphan: (EmployeeResource & { alertId: string })[];
  stats: VerifyStats;
}

interface EquipmentVerifyResult {
  applies: 'Equipos';
  missing: EquipmentResource[];
  orphan: (EquipmentResource & { alertId: string })[];
  stats: VerifyStats;
}

export type VerifyResult = EmployeeVerifyResult | EquipmentVerifyResult;
```

- [ ] **Step 2: Implementar `verifyDocumentTypeConsistency` para empleados**

```typescript
export async function verifyDocumentTypeConsistency(documentTypeId: string): Promise<VerifyResult> {
  const companyId = await getServerCompanyId();

  logger.debug('Verificando consistencia de tipo de documento', {
    data: { documentTypeId },
  });

  try {
    // 1. Cargar el tipo de documento
    const docType = await prisma.document_types.findFirst({
      where: { id: documentTypeId, company_id: companyId },
    });

    if (!docType) throw new Error('Tipo de documento no encontrado');

    // Validar precondiciones
    if (!docType.mandatory) {
      throw new Error('Solo se verifican tipos de documento obligatorios');
    }
    if (docType.is_it_montlhy) {
      throw new Error('Los tipos de documento mensuales no se verifican');
    }
    if (docType.applies === 'Empresa') {
      throw new Error('Los tipos de documento de empresa no se verifican');
    }

    // 2. Construir WHERE de condiciones
    const baseWhere: Record<string, unknown> = {
      company_id: companyId,
      is_active: true,
    };

    const conditionsWhere = docType.special
      ? buildConditionsWhereClause(docType.applies as 'Persona' | 'Equipos', docType.conditions as Prisma.JsonValue[])
      : {};

    const resourceWhere = { ...baseWhere, ...conditionsWhere };

    if (docType.applies === 'Persona') {
      return await verifyForEmployees(documentTypeId, resourceWhere);
    } else {
      return await verifyForEquipment(documentTypeId, resourceWhere);
    }
  } catch (error) {
    logger.error('Error al verificar consistencia', {
      data: { error, documentTypeId },
    });
    throw error;
  }
}
```

- [ ] **Step 3: Implementar helpers `verifyForEmployees` y `verifyForEquipment`**

> **NOTA**: Verificar nombres de relaciones Prisma para vehiculos (`brand_vehicles`, `types_of_vehicles`) contra el schema real antes de escribir el query. Pueden diferir de los nombres de columna en `BIGINT_COLUMNS_VEHICLES`.

```typescript
async function verifyForEmployees(
  documentTypeId: string,
  resourceWhere: Record<string, unknown>
): Promise<EmployeeVerifyResult> {
  // IDs de empleados que DEBERIAN tener alerta
  const matchingEmployees = await prisma.employees.findMany({
    where: resourceWhere as Prisma.employeesWhereInput,
    select: { id: true },
  });
  const matchingIds = new Set(matchingEmployees.map((e) => e.id));

  // Registros existentes para este tipo
  const existingAlerts = await prisma.documents_employees.findMany({
    where: { id_document_types: documentTypeId },
    select: { id: true, applies: true, document_path: true },
  });

  const existingResourceIds = new Set(existingAlerts.map((a) => a.applies));

  // FALTANTES: matchean condiciones pero no tienen registro
  const missingIds = [...matchingIds].filter((id) => !existingResourceIds.has(id));

  const missingEmployees =
    missingIds.length > 0
      ? await prisma.employees.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, firstname: true, lastname: true, file: true },
        })
      : [];

  const missing: EmployeeResource[] = missingEmployees.map((e) => ({
    id: e.id,
    firstname: e.firstname ?? '',
    lastname: e.lastname ?? '',
    file_number: e.file ?? null,
  }));

  // SOBRANTES: alerta vacia (document_path IS NULL) + NO matchean condiciones
  const emptyAlerts = existingAlerts.filter((a) => a.document_path === null);
  const orphanAlerts = emptyAlerts.filter((a) => !matchingIds.has(a.applies));
  const orphanResourceIds = orphanAlerts.map((a) => a.applies);

  const orphanEmployees =
    orphanResourceIds.length > 0
      ? await prisma.employees.findMany({
          where: { id: { in: orphanResourceIds } },
          select: { id: true, firstname: true, lastname: true, file: true },
        })
      : [];

  const orphanMap = new Map(orphanEmployees.map((e) => [e.id, e]));

  const orphan = orphanAlerts
    .map((alert) => {
      const emp = orphanMap.get(alert.applies);
      if (!emp) return null;
      return {
        id: emp.id,
        firstname: emp.firstname ?? '',
        lastname: emp.lastname ?? '',
        file_number: emp.file ?? null,
        alertId: alert.id,
      };
    })
    .filter(Boolean) as (EmployeeResource & { alertId: string })[];

  return {
    applies: 'Persona',
    missing,
    orphan,
    stats: {
      totalResources: matchingIds.size,
      totalWithAlert: existingResourceIds.size,
      totalMissing: missing.length,
      totalOrphan: orphan.length,
    },
  };
}

async function verifyForEquipment(
  documentTypeId: string,
  resourceWhere: Record<string, unknown>
): Promise<EquipmentVerifyResult> {
  // IDs de equipos que DEBERIAN tener alerta
  const matchingVehicles = await prisma.vehicles.findMany({
    where: resourceWhere as Prisma.vehiclesWhereInput,
    select: { id: true },
  });
  const matchingIds = new Set(matchingVehicles.map((v) => v.id));

  // Registros existentes
  const existingAlerts = await prisma.documents_equipment.findMany({
    where: { id_document_types: documentTypeId },
    select: { id: true, applies: true, document_path: true },
  });

  const existingResourceIds = new Set(existingAlerts.map((a) => a.applies));

  // FALTANTES
  const missingIds = [...matchingIds].filter((id) => !existingResourceIds.has(id));

  const missingVehicles =
    missingIds.length > 0
      ? await prisma.vehicles.findMany({
          where: { id: { in: missingIds } },
          select: {
            id: true,
            domain: true,
            intern_number: true,
            brand_vehicles: { select: { name: true } },
            types_of_vehicles: { select: { name: true } },
          },
        })
      : [];

  const missing: EquipmentResource[] = missingVehicles.map((v) => ({
    id: v.id,
    domain: v.domain ?? null,
    intern_number: v.intern_number ?? null,
    brand: v.brand_vehicles?.name ?? null,
    type: v.types_of_vehicles?.name ?? null,
  }));

  // SOBRANTES
  const emptyAlerts = existingAlerts.filter((a) => a.document_path === null);
  const orphanAlerts = emptyAlerts.filter((a) => !matchingIds.has(a.applies));
  const orphanResourceIds = orphanAlerts.map((a) => a.applies);

  const orphanVehicles =
    orphanResourceIds.length > 0
      ? await prisma.vehicles.findMany({
          where: { id: { in: orphanResourceIds } },
          select: {
            id: true,
            domain: true,
            intern_number: true,
            brand_vehicles: { select: { name: true } },
            types_of_vehicles: { select: { name: true } },
          },
        })
      : [];

  const orphanMap = new Map(orphanVehicles.map((v) => [v.id, v]));

  const orphan = orphanAlerts
    .map((alert) => {
      const veh = orphanMap.get(alert.applies);
      if (!veh) return null;
      return {
        id: veh.id,
        domain: veh.domain ?? null,
        intern_number: veh.intern_number ?? null,
        brand: veh.brand_vehicles?.name ?? null,
        type: veh.types_of_vehicles?.name ?? null,
        alertId: alert.id,
      };
    })
    .filter(Boolean) as (EquipmentResource & { alertId: string })[];

  return {
    applies: 'Equipos',
    missing,
    orphan,
    stats: {
      totalResources: matchingIds.size,
      totalWithAlert: existingResourceIds.size,
      totalMissing: missing.length,
      totalOrphan: orphan.length,
    },
  };
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

---

## Task 3: Server action `fixDocumentTypeConsistency`

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts` (agregar despues de `verifyDocumentTypeConsistency`)

- [ ] **Step 1: Implementar la funcion**

```typescript
/**
 * Corrige inconsistencias: crea alertas faltantes y elimina alertas vacias sobrantes.
 * Todo dentro de una transaccion Prisma.
 *
 * @param createAlerts — IDs de recursos (employees/vehicles) que necesitan alerta
 * @param removeAlerts — alertId (PKs de documents_employees/equipment), NO IDs de recursos
 */
export async function fixDocumentTypeConsistency(
  documentTypeId: string,
  actions: { createAlerts: string[]; removeAlerts: string[] }
): Promise<{ created: number; removed: number }> {
  const companyId = await getServerCompanyId();

  logger.debug('Corrigiendo inconsistencias de tipo de documento', {
    data: {
      documentTypeId,
      toCreate: actions.createAlerts.length,
      toRemove: actions.removeAlerts.length,
    },
  });

  try {
    // Cargar tipo para saber applies
    const docType = await prisma.document_types.findFirst({
      where: { id: documentTypeId, company_id: companyId },
      select: { applies: true },
    });

    if (!docType) throw new Error('Tipo de documento no encontrado');

    const isPersona = docType.applies === 'Persona';
    const table = isPersona ? 'documents_employees' : 'documents_equipment';

    return await prisma.$transaction(async (tx) => {
      let created = 0;
      let removed = 0;

      // === CREAR ALERTAS FALTANTES ===
      if (actions.createAlerts.length > 0) {
        // Re-verificar: filtrar IDs que ya tienen registro
        const existing = isPersona
          ? await tx.documents_employees.findMany({
              where: {
                id_document_types: documentTypeId,
                applies: { in: actions.createAlerts },
              },
              select: { applies: true },
            })
          : await tx.documents_equipment.findMany({
              where: {
                id_document_types: documentTypeId,
                applies: { in: actions.createAlerts },
              },
              select: { applies: true },
            });

        const existingSet = new Set(existing.map((r) => r.applies));
        const toCreate = actions.createAlerts.filter((id) => !existingSet.has(id));

        if (toCreate.length > 0) {
          const payload = toCreate.map((resourceId) => ({
            id_document_types: documentTypeId,
            applies: resourceId,
          }));

          if (isPersona) {
            const result = await tx.documents_employees.createMany({ data: payload });
            created = result.count;
          } else {
            const result = await tx.documents_equipment.createMany({ data: payload });
            created = result.count;
          }
        }
      }

      // === ELIMINAR ALERTAS SOBRANTES ===
      if (actions.removeAlerts.length > 0) {
        if (isPersona) {
          const result = await tx.documents_employees.deleteMany({
            where: {
              id: { in: actions.removeAlerts },
              document_path: null,
              id_document_types: documentTypeId,
            },
          });
          removed = result.count;
        } else {
          const result = await tx.documents_equipment.deleteMany({
            where: {
              id: { in: actions.removeAlerts },
              document_path: null,
              id_document_types: documentTypeId,
            },
          });
          removed = result.count;
        }
      }

      logger.info('Inconsistencias corregidas', {
        data: { documentTypeId, created, removed },
      });

      return { created, removed };
    });
  } catch (error) {
    logger.error('Error al corregir inconsistencias', {
      data: { error, documentTypeId },
    });
    throw error;
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

---

## Task 4: Skeleton de verificacion

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/components/_VerifyDocumentsSkeleton.tsx`

- [ ] **Step 1: Crear el componente skeleton**

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function _VerifyDocumentsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Badges de resumen */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      {/* Texto descriptivo */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Card con tabla simulada */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header de tabla */}
            <div className="flex gap-4 border-b pb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Filas */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Boton al pie */}
      <div className="flex justify-end">
        <Skeleton className="h-9 w-48" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

---

## Task 5: Dialog de verificacion

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/components/_VerifyDocumentsDialog.tsx`

Este es el componente mas complejo. Maneja 4 estados: loading (skeleton), sin inconsistencias, con inconsistencias, error. Incluye tabla de resultados y AlertDialog de confirmacion.

- [ ] **Step 1: Crear el componente con imports y tipos**

```typescript
'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Minus, Plus, UserMinus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { VerifyResult } from '../actions/actions.server';
import { fixDocumentTypeConsistency, verifyDocumentTypeConsistency } from '../actions/actions.server';
import { _VerifyDocumentsSkeleton } from './_VerifyDocumentsSkeleton';
```

- [ ] **Step 2: Definir props e implementar el componente principal**

```typescript
const MAX_DISPLAY_ROWS = 20;

interface VerifyDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTypeId: string;
  documentTypeName: string;
  applies: 'Persona' | 'Equipos';
  isSpecial: boolean;
}

export function _VerifyDocumentsDialog({
  open,
  onOpenChange,
  documentTypeId,
  documentTypeName,
  applies,
  isSpecial,
}: VerifyDocumentsDialogProps) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);

  // === Query de verificacion ===
  const {
    data: result,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['verify-document-consistency', documentTypeId],
    queryFn: () => verifyDocumentTypeConsistency(documentTypeId),
    enabled: open && !!documentTypeId,
    staleTime: 0,
    retry: false,
  });

  // === Mutacion de correccion ===
  const fixMutation = useMutation({
    mutationFn: () => {
      if (!result) throw new Error('No hay datos de verificacion');
      return fixDocumentTypeConsistency(documentTypeId, {
        createAlerts: result.missing.map((r) => r.id),
        removeAlerts: result.orphan.map((r) => r.alertId),
      });
    },
    onSuccess: (data) => {
      toast.success(
        `Se corrigieron ${data.created + data.removed} inconsistencias (${data.created} creadas, ${data.removed} eliminadas)`
      );
      queryClient.invalidateQueries({ queryKey: ['doc-types'] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Error al corregir inconsistencias'
      );
    },
  });

  const handleFix = useCallback(() => {
    setShowConfirm(false);
    fixMutation.mutate();
  }, [fixMutation]);

  const hasInconsistencies =
    result && (result.stats.totalMissing > 0 || result.stats.totalOrphan > 0);

  const resourceLabel = applies === 'Persona' ? 'empleados' : 'equipos';
  const MissingIcon = applies === 'Persona' ? UserPlus : Plus;
  const OrphanIcon = applies === 'Persona' ? UserMinus : Minus;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Verificacion de Documentos</DialogTitle>
            <DialogDescription>
              Verificando consistencia para &ldquo;{documentTypeName}&rdquo;
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Loading */}
            {isLoading && <_VerifyDocumentsSkeleton />}

            {/* Error */}
            {error && !isLoading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <h3 className="text-lg font-semibold">Error al verificar</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {error instanceof Error ? error.message : 'Error desconocido'}
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </div>
            )}

            {/* Sin inconsistencias */}
            {result && !hasInconsistencies && !isLoading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <h3 className="text-lg font-semibold">Todo en orden</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {isSpecial
                    ? `Los ${result.stats.totalResources} ${resourceLabel} que cumplen las condiciones tienen su alerta asignada correctamente.`
                    : `Los ${result.stats.totalResources} ${resourceLabel} activos tienen su alerta asignada correctamente.`}
                </p>
              </div>
            )}

            {/* Con inconsistencias */}
            {result && hasInconsistencies && !isLoading && (
              <div className="space-y-4">
                {/* Badges de resumen */}
                <div className="flex flex-wrap gap-2">
                  {result.stats.totalMissing > 0 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-700 gap-1">
                      <MissingIcon className="h-3.5 w-3.5" />
                      {result.stats.totalMissing} faltantes
                    </Badge>
                  )}
                  {result.stats.totalOrphan > 0 && (
                    <Badge variant="outline" className="border-red-500 text-red-700 gap-1">
                      <OrphanIcon className="h-3.5 w-3.5" />
                      {result.stats.totalOrphan} sobrantes
                    </Badge>
                  )}
                </div>

                {/* Descripcion */}
                <p className="text-sm text-muted-foreground">
                  Se encontraron inconsistencias entre las condiciones configuradas y las alertas
                  existentes en la base de datos.
                </p>

                {/* Card Faltantes */}
                {result.stats.totalMissing > 0 && (
                  <Card className="border-l-4 border-l-amber-500 border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Alertas faltantes</CardTitle>
                      <CardDescription>
                        Estos {resourceLabel} cumplen las condiciones pero no tienen la alerta de
                        documento asignada.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {applies === 'Persona' && result.applies === 'Persona' && (
                        <EmployeeTable
                          data={result.missing}
                          maxRows={MAX_DISPLAY_ROWS}
                          total={result.stats.totalMissing}
                        />
                      )}
                      {applies === 'Equipos' && result.applies === 'Equipos' && (
                        <EquipmentTable
                          data={result.missing}
                          maxRows={MAX_DISPLAY_ROWS}
                          total={result.stats.totalMissing}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Card Sobrantes */}
                {result.stats.totalOrphan > 0 && (
                  <Card className="border-l-4 border-l-red-500 border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Alertas sobrantes</CardTitle>
                      <CardDescription>
                        Estos {resourceLabel} ya no cumplen las condiciones y tienen una alerta
                        vacia (sin documento subido) que puede eliminarse de forma segura.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {applies === 'Persona' && result.applies === 'Persona' && (
                        <EmployeeTable
                          data={result.orphan}
                          maxRows={MAX_DISPLAY_ROWS}
                          total={result.stats.totalOrphan}
                        />
                      )}
                      {applies === 'Equipos' && result.applies === 'Equipos' && (
                        <EquipmentTable
                          data={result.orphan}
                          maxRows={MAX_DISPLAY_ROWS}
                          total={result.stats.totalOrphan}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {hasInconsistencies && (
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={fixMutation.isPending}
              >
                {fixMutation.isPending ? 'Corrigiendo...' : 'Corregir inconsistencias'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmacion */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar correccion</AlertDialogTitle>
            <AlertDialogDescription>
              Se crearan {result?.stats.totalMissing ?? 0} alertas nuevas y se eliminaran{' '}
              {result?.stats.totalOrphan ?? 0} alertas vacias. Esta accion no elimina documentos
              ya subidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFix}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 3: Agregar las tablas simples al final del archivo**

```typescript
// ============================================================================
// TABLAS SIMPLES
// ============================================================================

function EmployeeTable({
  data,
  maxRows,
  total,
}: {
  data: { id: string; file_number: string | null; lastname: string; firstname: string }[];
  maxRows: number;
  total: number;
}) {
  const displayed = data.slice(0, maxRows);
  const remaining = total - displayed.length;

  return (
    <div className="text-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Legajo</th>
            <th className="pb-2 pr-4 font-medium">Apellido</th>
            <th className="pb-2 font-medium">Nombre</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((emp) => (
            <tr key={emp.id} className="border-b last:border-0">
              <td className="py-1.5 pr-4 tabular-nums">{emp.file_number ?? '-'}</td>
              <td className="py-1.5 pr-4">{emp.lastname}</td>
              <td className="py-1.5">{emp.firstname}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">y {remaining} mas...</p>
      )}
    </div>
  );
}

function EquipmentTable({
  data,
  maxRows,
  total,
}: {
  data: { id: string; domain: string | null; intern_number: string | null; brand: string | null; type: string | null }[];
  maxRows: number;
  total: number;
}) {
  const displayed = data.slice(0, maxRows);
  const remaining = total - displayed.length;

  return (
    <div className="text-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Dominio</th>
            <th className="pb-2 pr-4 font-medium">N. Interno</th>
            <th className="pb-2 pr-4 font-medium">Marca</th>
            <th className="pb-2 font-medium">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((veh) => (
            <tr key={veh.id} className="border-b last:border-0">
              <td className="py-1.5 pr-4">{veh.domain ?? '-'}</td>
              <td className="py-1.5 pr-4">{veh.intern_number ?? '-'}</td>
              <td className="py-1.5 pr-4">{veh.brand ?? '-'}</td>
              <td className="py-1.5">{veh.type ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">y {remaining} mas...</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

---

## Task 6: Modificar modal + threading de permisos

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/components/_DocumentTypeFormModal.tsx`
- Modify: `src/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent.tsx`
- Modify: `src/features/Documentacion/TiposDocumentos/PersonasList/PersonasList.tsx`
- Modify: `src/features/Documentacion/TiposDocumentos/PersonasList/_PersonasDataTable.tsx`
- Modify: `src/features/Documentacion/TiposDocumentos/EquiposList/EquiposList.tsx`
- Modify: `src/features/Documentacion/TiposDocumentos/EquiposList/_EquiposDataTable.tsx`

- [ ] **Step 1: Agregar prop `permissionsMap` y boton al modal**

En `_DocumentTypeFormModal.tsx`:

1. Agregar import de `_VerifyDocumentsDialog`:

```typescript
import { _VerifyDocumentsDialog } from './_VerifyDocumentsDialog';
```

2. Agregar `permissionsMap` a la interface:

```typescript
interface DocumentTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType?: DocumentTypeListItem | null;
  defaultApplies?: document_applies;
  permissionsMap?: Record<string, boolean>;
}
```

3. Agregar desestructuracion en el componente:

```typescript
export function _DocumentTypeFormModal({
  open,
  onOpenChange,
  documentType,
  defaultApplies = document_applies.Persona,
  permissionsMap,
}: DocumentTypeFormModalProps) {
```

4. Agregar estado y logica de verificacion.

**IMPORTANTE**: `applies` ya existe en el componente (~linea 147 como `const applies = form.watch('applies')`). NO redeclararlo. Solo agregar las lineas nuevas. Colocar `verifyOpen` junto a los otros estados, y `canVerify` despues de `isPending`:

```typescript
// Agregar junto a otros useState (no redeclarar applies)
const [verifyOpen, setVerifyOpen] = useState(false);

// Agregar despues de const isPending (applies ya existe mas arriba)
const mandatory = form.watch('mandatory');
const isMonthly = form.watch('is_it_montlhy');
const canVerify =
  isEditing &&
  mandatory &&
  !isMonthly &&
  applies !== 'Empresa' &&
  permissionsMap?.[`documentacion:${applies === 'Persona' ? 'tipos-docs-personas' : 'tipos-docs-equipos'}:update`] ===
    true;
```

5. Modificar `DialogFooter` para agregar el boton de verificar a la izquierda:

```typescript
<DialogFooter className="flex-shrink-0 pt-4 sm:justify-between">
  <div>
    {canVerify && documentType && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setVerifyOpen(true)}
      >
        Verificar documentos
      </Button>
    )}
  </div>
  <div className="flex gap-2">
    <Button
      type="button"
      variant="outline"
      onClick={handleClose}
      disabled={isPending}
    >
      Cancelar
    </Button>
    <Button
      type="submit"
      disabled={isPending || form.formState.isSubmitting || isLoadingEdit}
    >
      {isPending
        ? 'Guardando...'
        : isEditing
          ? 'Actualizar'
          : 'Crear'}
    </Button>
  </div>
</DialogFooter>
```

6. Agregar el Dialog de verificacion despues de `</Dialog>` (antes del cierre del componente):

```typescript
{canVerify && documentType && (
  <_VerifyDocumentsDialog
    open={verifyOpen}
    onOpenChange={setVerifyOpen}
    documentTypeId={documentType.id}
    documentTypeName={documentType.name}
    applies={applies as 'Persona' | 'Equipos'}
    isSpecial={isSpecial}
  />
)}
```

- [ ] **Step 2: Pasar permissions de `TiposDocumentosTabContent` a `PersonasList` y `EquiposList`**

En `TiposDocumentosTabContent.tsx`, modificar los `<PersonasList>` y `<EquiposList>`:

```typescript
<PersonasList searchParams={searchParams} permissionsMap={permissions} />
```

```typescript
<EquiposList searchParams={searchParams} permissionsMap={permissions} />
```

**Nota**: `EmpresaList` NO recibe permisos porque los tipos de empresa no tienen boton de verificar.

- [ ] **Step 3: Threading en PersonasList → \_PersonasDataTable**

En `PersonasList.tsx`:

1. Agregar prop `permissionsMap`:

```typescript
interface PersonasListProps {
  searchParams: DataTableSearchParams;
  permissionsMap?: Record<string, boolean>;
}
```

2. Pasarlo a `_PersonasDataTable`:

```typescript
<_PersonasDataTable
  ...
  permissionsMap={permissionsMap}
/>
```

En `_PersonasDataTable.tsx`:

1. Agregar prop:

```typescript
interface PersonasDataTableProps {
  ...
  permissionsMap?: Record<string, boolean>;
}
```

2. Pasarlo al modal:

```typescript
<_DocumentTypeFormModal
  ...
  permissionsMap={permissionsMap}
/>
```

- [ ] **Step 4: Threading en EquiposList → \_EquiposDataTable** (mismo patron que Personas)

Replicar exactamente el mismo patron de Step 3 para:

- `EquiposList.tsx`: agregar prop `permissionsMap` y pasarlo a `_EquiposDataTable`
- `_EquiposDataTable.tsx`: agregar prop `permissionsMap` y pasarlo al modal

- [ ] **Step 5: Verificar tipos y que compile**

Run: `npm run check-types`
Expected: PASS

---

## Task 7: Verificacion manual via chrome-devtools

**No modifica archivos.** Verificar que la UI funciona correctamente.

- [ ] **Step 1: Navegar a la pagina de documentacion**

Abrir Chrome DevTools MCP, navegar a la pagina de Documentacion > Tipos de Documentos > Personas.

- [ ] **Step 2: Abrir modal de edicion de un tipo obligatorio existente**

Hacer clic en "Editar" de un tipo de documento que sea `mandatory=true` y `special=true`. Verificar que el boton "Verificar documentos" aparece en el footer del modal (izquierda).

- [ ] **Step 3: Abrir el Dialog de verificacion**

Hacer clic en "Verificar documentos". Verificar:

- El skeleton se muestra durante la carga
- Los resultados se muestran correctamente (faltantes y/o sobrantes)
- Las tablas muestran legajo, apellido, nombre para empleados
- El boton "Corregir inconsistencias" aparece si hay inconsistencias

- [ ] **Step 4: Verificar el boton NO aparece para tipos no elegibles**

- Abrir modal de un tipo con `mandatory=false` → boton NO visible
- Abrir modal de un tipo con `is_it_montlhy=true` → boton NO visible
- Cambiar a subtab Empresa → boton NO visible en ningun tipo

- [ ] **Step 5: Probar la correccion**

Si hay inconsistencias: hacer clic en "Corregir inconsistencias" → confirmar. Verificar:

- Toast de exito muestra conteos correctos
- Dialog se cierra
- Volver a abrir verificacion muestra "Todo en orden"

- [ ] **Step 6: Verificar en BD via MCP Supabase LOCAL**

Consultar `documents_employees` para confirmar que las alertas se crearon/eliminaron correctamente.
