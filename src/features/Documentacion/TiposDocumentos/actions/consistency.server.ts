'use server';

import type { Prisma } from '@/generated/prisma/client';
import { document_applies } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { buildConditionsWhereClause, parseDocumentConditions } from '../lib/document-conditions';
import { findScopedDocumentType } from '../lib/document-type-scope';

const logger = new Logger('features/TiposDocumentos/consistency');

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

export async function verifyDocumentTypeConsistency(documentTypeId: string): Promise<VerifyResult> {
  const companyId = await getActiveCompanyId();

  logger.debug('Verificando consistencia de tipo de documento', {
    data: { documentTypeId },
  });

  try {
    // 1. Cargar el tipo de documento (perímetro: global o de la empresa activa)
    const docType = await findScopedDocumentType(prisma, documentTypeId, companyId, {
      id: true,
      applies: true,
      mandatory: true,
      is_it_montlhy: true,
      special: true,
      conditions: true,
    });

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

    // TODAS las condiciones del array (simples y M:M), no sólo conditions[0].
    const conditionsWhere = docType.special
      ? buildConditionsWhereClause(docType.applies, parseDocumentConditions(docType.conditions))
      : {};

    const resourceWhere = { ...baseWhere, ...conditionsWhere };

    if (docType.applies === 'Persona') {
      return await verifyForEmployees(documentTypeId, companyId, resourceWhere);
    } else {
      return await verifyForEquipment(documentTypeId, companyId, resourceWhere);
    }
  } catch (error) {
    logger.error('Error al verificar consistencia', {
      data: { error, documentTypeId },
    });
    throw error;
  }
}

async function verifyForEmployees(
  documentTypeId: string,
  companyId: string,
  resourceWhere: Record<string, unknown>
): Promise<EmployeeVerifyResult> {
  // IDs de empleados que DEBERIAN tener alerta
  const matchingEmployees = await prisma.employees.findMany({
    where: resourceWhere as Prisma.employeesWhereInput,
    select: { id: true },
  });
  const matchingIds = new Set(matchingEmployees.map((e) => e.id));

  // Registros existentes para este tipo (sólo de empleados de la empresa activa)
  const existingAlerts = await prisma.documents_employees.findMany({
    where: { id_document_types: documentTypeId, employees: { company_id: companyId } },
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
  const orphanAlerts = emptyAlerts.filter((a) => a.applies == null || !matchingIds.has(a.applies));
  const orphanResourceIds = orphanAlerts.map((a) => a.applies);

  const orphanEmployees =
    orphanResourceIds.length > 0
      ? await prisma.employees.findMany({
          where: { id: { in: orphanResourceIds.filter((id): id is string => id !== null) } },
          select: { id: true, firstname: true, lastname: true, file: true },
        })
      : [];

  const orphanMap = new Map(orphanEmployees.map((e) => [e.id, e]));

  const orphan = orphanAlerts
    .map((alert) => {
      const emp = orphanMap.get(alert.applies ?? '');
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
  companyId: string,
  resourceWhere: Record<string, unknown>
): Promise<EquipmentVerifyResult> {
  // IDs de equipos que DEBERIAN tener alerta
  const matchingVehicles = await prisma.vehicles.findMany({
    where: resourceWhere as Prisma.vehiclesWhereInput,
    select: { id: true },
  });
  const matchingIds = new Set(matchingVehicles.map((v) => v.id));

  // Registros existentes (sólo de equipos de la empresa activa)
  const existingAlerts = await prisma.documents_equipment.findMany({
    where: { id_document_types: documentTypeId, vehicles: { company_id: companyId } },
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
  const orphanAlerts = emptyAlerts.filter((a) => a.applies == null || !matchingIds.has(a.applies));
  const orphanResourceIds = orphanAlerts.map((a) => a.applies);

  const orphanVehicles =
    orphanResourceIds.length > 0
      ? await prisma.vehicles.findMany({
          where: { id: { in: orphanResourceIds.filter((id): id is string => id !== null) } },
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
      const veh = orphanMap.get(alert.applies ?? '');
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
  const companyId = await getActiveCompanyId();
  const actor = await getSessionUserId();
  if (!actor) throw new Error('Sesión requerida');

  logger.debug('Corrigiendo inconsistencias de tipo de documento', {
    data: {
      documentTypeId,
      toCreate: actions.createAlerts.length,
      toRemove: actions.removeAlerts.length,
    },
  });

  try {
    // Cargar tipo para saber applies (perímetro: global o de la empresa activa)
    const docType = await findScopedDocumentType(prisma, documentTypeId, companyId, { applies: true });

    const isPersona = docType.applies === 'Persona';

    // withActor: los triggers de documents_* recalculan status y registran el actor.
    return await withActor(actor, async (tx) => {
      let created = 0;
      let removed = 0;

      // === CREAR ALERTAS FALTANTES ===
      if (actions.createAlerts.length > 0) {
        // Perímetro: sólo recursos de la empresa activa (un id ajeno se ignora).
        const owned = isPersona
          ? await tx.employees.findMany({
              where: { id: { in: actions.createAlerts }, company_id: companyId },
              select: { id: true },
            })
          : await tx.vehicles.findMany({
              where: { id: { in: actions.createAlerts }, company_id: companyId },
              select: { id: true },
            });
        const ownedIds = owned.map((r) => r.id);

        // Re-verificar: filtrar IDs que ya tienen registro
        const existing = isPersona
          ? await tx.documents_employees.findMany({
              where: {
                id_document_types: documentTypeId,
                applies: { in: ownedIds },
              },
              select: { applies: true },
            })
          : await tx.documents_equipment.findMany({
              where: {
                id_document_types: documentTypeId,
                applies: { in: ownedIds },
              },
              select: { applies: true },
            });

        const existingSet = new Set(existing.map((r) => r.applies));
        const toCreate = ownedIds.filter((id) => !existingSet.has(id));

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
              employees: { company_id: companyId },
            },
          });
          removed = result.count;
        } else {
          const result = await tx.documents_equipment.deleteMany({
            where: {
              id: { in: actions.removeAlerts },
              document_path: null,
              id_document_types: documentTypeId,
              vehicles: { company_id: companyId },
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

// ============================================================================
// IMPACTO (activar / desactivar / eliminar)
// ============================================================================

/**
 * Analiza el impacto de activar/desactivar/eliminar un tipo de documento.
 * Retorna conteos de documentos subidos, alertas vacías y recursos sin alerta.
 */
export async function analyzeDocumentTypeImpact(docTypeId: string) {
  const companyId = await getActiveCompanyId();

  logger.debug('Analizando impacto de tipo de documento', { data: { docTypeId } });

  try {
    const docType = await findScopedDocumentType(prisma, docTypeId, companyId, {
      id: true,
      name: true,
      applies: true,
      is_active: true,
      mandatory: true,
      special: true,
      company_id: true,
    });

    let uploadedCount = 0;
    // 358: documentos con archivo INCLUYENDO archivados — solo para canHardDelete (borrar el tipo
    // borraria esos archivos via cascade). El display al usuario usa uploadedCount (solo vigentes).
    let uploadedWithFileTotal = 0;
    let emptyAlertCount = 0;
    let missingAlertCount = 0;

    if (docType.applies === document_applies.Persona) {
      const [uploadedVigente, uploadedWithFile, empty, totalActive] = await Promise.all([
        // Vigentes con archivo (display): excluye archivados (358)
        prisma.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: { not: null }, archived_at: null },
        }),
        // Todos los que tienen archivo, incl. archivados (para canHardDelete)
        prisma.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        }),
        prisma.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: null, archived_at: null },
        }),
        prisma.employees.count({
          where: { company_id: companyId },
        }),
      ]);
      uploadedCount = uploadedVigente;
      uploadedWithFileTotal = uploadedWithFile;
      emptyAlertCount = empty;
      const withAlert = await prisma.documents_employees.count({
        where: { id_document_types: docTypeId, archived_at: null },
      });
      missingAlertCount = Math.max(0, totalActive - withAlert);
    } else if (docType.applies === document_applies.Equipos) {
      const [uploadedVigente, uploadedWithFile, empty, totalActive] = await Promise.all([
        prisma.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: { not: null }, archived_at: null },
        }),
        prisma.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        }),
        prisma.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: null, archived_at: null },
        }),
        prisma.vehicles.count({
          where: { company_id: companyId },
        }),
      ]);
      uploadedCount = uploadedVigente;
      uploadedWithFileTotal = uploadedWithFile;
      emptyAlertCount = empty;
      const withAlert = await prisma.documents_equipment.count({
        where: { id_document_types: docTypeId, archived_at: null },
      });
      missingAlertCount = Math.max(0, totalActive - withAlert);
    } else {
      // Empresa: max 1 registro
      const doc = await prisma.documents_company.findFirst({
        where: { id_document_types: docTypeId, applies: companyId },
        select: { document_path: true },
      });
      if (doc) {
        if (doc.document_path) {
          uploadedCount = 1;
          uploadedWithFileTotal = 1;
        } else {
          emptyAlertCount = 1;
        }
      } else {
        missingAlertCount = 1;
      }
    }

    return {
      docType: {
        id: docType.id,
        name: docType.name,
        applies: docType.applies,
        is_active: docType.is_active,
        mandatory: docType.mandatory,
        special: docType.special,
      },
      uploadedCount,
      emptyAlertCount,
      totalResources: uploadedCount + emptyAlertCount,
      missingAlertCount,
      canHardDelete: uploadedWithFileTotal === 0,
    };
  } catch (error) {
    logger.error('Error al analizar impacto de tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}

export type DocumentTypeImpact = Awaited<ReturnType<typeof analyzeDocumentTypeImpact>>;
