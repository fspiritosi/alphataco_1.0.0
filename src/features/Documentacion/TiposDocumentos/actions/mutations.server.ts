'use server';

import type { Prisma } from '@/generated/prisma/client';
import { document_applies } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { callVoid } from '@/shared/lib/sql';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { findScopedDocumentType } from '../lib/document-type-scope';

const logger = new Logger('features/TiposDocumentos/mutations');

/**
 * Actor de la transacción: los triggers de `document_types` (reconciliación de alertas) y de
 * `documents_*` (logs) leen `app_current_user_id()`. Sin sesión no hay mutación posible.
 */
async function requireActor(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Sesión requerida');
  return userId;
}

// ============================================================================
// CRUD MUTATIONS
// ============================================================================

export interface CreateDocumentTypeInput {
  name: string;
  applies: document_applies;
  equipment_type?: string | null;
  mandatory: boolean;
  explired: boolean;
  special: boolean;
  multiresource: boolean;
  has_policy_number?: boolean;
  is_it_montlhy?: boolean;
  private?: boolean;
  down_document?: boolean;
  /** Ticket 505: habilita el tipo en el checklist de documentos de un pre legajo */
  available_for_pre_file?: boolean;
  description?: string;
  conditions?: Prisma.JsonValue[];
}

/**
 * Crea un nuevo tipo de documento.
 */
export async function createDocumentType(data: CreateDocumentTypeInput) {
  const companyId = await getActiveCompanyId();
  const actor = await requireActor();

  logger.debug('Creando tipo de documento', { data: { name: data.name, applies: data.applies } });

  try {
    // withActor: el trigger `document_types_after_insert` genera las alertas con el actor de sesión.
    const created = await withActor(actor, (tx) =>
      tx.document_types.create({
        data: {
          company_id: companyId,
          name: data.name,
          applies: data.applies,
          equipment_type: data.equipment_type ?? null,
          mandatory: data.mandatory,
          explired: data.explired,
          special: data.special,
          multiresource: data.multiresource,
          has_policy_number: data.has_policy_number ?? false,
          is_it_montlhy: data.is_it_montlhy ?? false,
          private: data.private ?? false,
          down_document: data.down_document ?? false,
          available_for_pre_file: data.available_for_pre_file ?? false,
          description: data.description ?? null,
          conditions: (data.conditions ?? []) as Prisma.InputJsonValue[],
        },
        select: { id: true },
      })
    );

    logger.info('Tipo de documento creado', { data: { id: created.id } });
    return created;
  } catch (error) {
    logger.error('Error al crear tipo de documento', { data: { error } });
    throw error;
  }
}

export interface UpdateDocumentTypeInput {
  name?: string;
  applies?: document_applies;
  equipment_type?: string | null;
  mandatory?: boolean;
  explired?: boolean;
  special?: boolean;
  multiresource?: boolean;
  has_policy_number?: boolean;
  is_it_montlhy?: boolean;
  private?: boolean;
  down_document?: boolean;
  /** Ticket 505: habilita el tipo en el checklist de documentos de un pre legajo */
  available_for_pre_file?: boolean;
  description?: string | null;
  conditions?: Prisma.JsonValue[];
}

/**
 * Actualiza un tipo de documento existente.
 */
export async function updateDocumentType(id: string, data: UpdateDocumentTypeInput) {
  const companyId = await getActiveCompanyId();
  const actor = await requireActor();

  logger.debug('Actualizando tipo de documento', { data: { id } });

  try {
    // Perímetro de escritura: sólo tipos propios (un global lanza GLOBAL_DOCUMENT_TYPE_READ_ONLY).
    await findScopedDocumentType(prisma, id, companyId, { id: true }, {}, 'write');

    // Build update payload explicitly so Prisma can type-check it
    const updatePayload: Prisma.document_typesUpdateInput = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.applies !== undefined) updatePayload.applies = data.applies;
    if (data.equipment_type !== undefined) updatePayload.equipment_type = data.equipment_type;
    if (data.mandatory !== undefined) updatePayload.mandatory = data.mandatory;
    if (data.explired !== undefined) updatePayload.explired = data.explired;
    if (data.special !== undefined) updatePayload.special = data.special;
    if (data.multiresource !== undefined) updatePayload.multiresource = data.multiresource;
    if (data.has_policy_number !== undefined) updatePayload.has_policy_number = data.has_policy_number;
    if (data.is_it_montlhy !== undefined) updatePayload.is_it_montlhy = data.is_it_montlhy;
    if (data.private !== undefined) updatePayload.private = data.private;
    if (data.down_document !== undefined) updatePayload.down_document = data.down_document;
    if (data.available_for_pre_file !== undefined) updatePayload.available_for_pre_file = data.available_for_pre_file;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.conditions !== undefined) updatePayload.conditions = data.conditions as Prisma.InputJsonValue[];

    // withActor: el trigger `document_types_after_update` reconcilia alertas con el actor de sesión.
    const updated = await withActor(actor, (tx) =>
      tx.document_types.update({
        where: { id },
        data: updatePayload,
        select: { id: true },
      })
    );

    logger.info('Tipo de documento actualizado', { data: { id: updated.id } });
    return updated;
  } catch (error) {
    logger.error('Error al actualizar tipo de documento', { data: { error, id } });
    throw error;
  }
}

// ============================================================================
// STATUS DE RECURSOS
// ============================================================================

/**
 * Recalcula el status de un conjunto de recursos (empleados o equipos) dentro de una transacción.
 * Helper interno — no exportado.
 *
 * Ticket 712: delega en la función SQL `recalcular_status_documentacion`, que es la
 * única definición del status de documentación (la misma que usan el trigger de
 * documentos y las funciones de reconciliación por recurso). Antes esta función
 * tenía su propia copia de la fórmula, que contaba como faltantes los tipos
 * especiales que no le corresponden al recurso y no filtraba los archivados, por
 * lo que nunca podía dar 'Completo'.
 *
 * Retorna void en SQL, por lo que se invoca con `callVoid` (`$executeRaw`) y NO con `$queryRaw*`.
 */
async function recalculateResourceStatus(
  tx: Prisma.TransactionClient,
  resourceIds: string[],
  resourceType: 'Persona' | 'Equipos'
) {
  if (resourceIds.length === 0) return;
  await callVoid('recalcular_status_documentacion', [{ uuidArray: resourceIds }, resourceType], tx);
}

// ============================================================================
// IS_ACTIVE FLOW — deactivate / hard-delete / reactivate
// ============================================================================

/**
 * Desactiva un tipo de documento (soft delete via is_active = false).
 * Opcionalmente elimina las alertas vacías (sin documento subido) del tipo.
 */
export async function deactivateDocumentType(docTypeId: string, options: { deleteEmptyAlerts: boolean }) {
  const companyId = await getActiveCompanyId();
  const actor = await requireActor();

  logger.info('Desactivando tipo de documento', { data: { docTypeId, options } });

  try {
    return await withActor(actor, async (tx) => {
      // Perímetro de escritura: sólo tipos propios (un global lanza GLOBAL_DOCUMENT_TYPE_READ_ONLY).
      const docType = await findScopedDocumentType(
        tx,
        docTypeId,
        companyId,
        { id: true, applies: true, mandatory: true, is_active: true },
        {},
        'write'
      );
      if (!docType.is_active) throw new Error('Tipo de documento no encontrado o ya esta inactivo');

      await tx.document_types.update({
        where: { id: docTypeId },
        data: { is_active: false },
      });

      // Defensa en profundidad: aunque el tipo sea propio, sólo se tocan documentos de recursos
      // de la empresa activa (relación employees/vehicles).
      const employeeDocs = { id_document_types: docTypeId, employees: { company_id: companyId } };
      const equipmentDocs = { id_document_types: docTypeId, vehicles: { company_id: companyId } };

      let affectedResourceIds: string[] = [];

      if (options.deleteEmptyAlerts && docType.mandatory) {
        if (docType.applies === document_applies.Persona) {
          const affected = await tx.documents_employees.findMany({
            where: { ...employeeDocs, document_path: null },
            select: { applies: true },
          });
          affectedResourceIds = affected.map((a) => a.applies).filter((id): id is string => id !== null);

          await tx.documents_employees.deleteMany({
            where: { ...employeeDocs, document_path: null },
          });
        } else if (docType.applies === document_applies.Equipos) {
          const affected = await tx.documents_equipment.findMany({
            where: { ...equipmentDocs, document_path: null },
            select: { applies: true },
          });
          affectedResourceIds = affected.map((a) => a.applies).filter((id): id is string => id !== null);

          await tx.documents_equipment.deleteMany({
            where: { ...equipmentDocs, document_path: null },
          });
        } else {
          await tx.documents_company.deleteMany({
            where: { id_document_types: docTypeId, applies: companyId, document_path: null },
          });
        }
      }

      if (docType.applies !== document_applies.Empresa) {
        if (!options.deleteEmptyAlerts || affectedResourceIds.length === 0) {
          const resources =
            docType.applies === document_applies.Persona
              ? await tx.documents_employees.findMany({
                  where: employeeDocs,
                  select: { applies: true },
                  distinct: ['applies'],
                })
              : await tx.documents_equipment.findMany({
                  where: equipmentDocs,
                  select: { applies: true },
                  distinct: ['applies'],
                });
          affectedResourceIds = resources.map((r) => r.applies).filter((id): id is string => id !== null);
        }

        await recalculateResourceStatus(tx, affectedResourceIds, docType.applies as 'Persona' | 'Equipos');
      }

      return { success: true };
    });
  } catch (error) {
    logger.error('Error al desactivar tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}

/**
 * Elimina permanentemente un tipo de documento.
 * Solo permitido si NO hay documentos subidos (document_path IS NOT NULL) asociados.
 * Elimina todas las alertas vacías y recalcula el status de los recursos afectados.
 */
export async function hardDeleteDocumentType(docTypeId: string) {
  const companyId = await getActiveCompanyId();
  const actor = await requireActor();

  logger.info('Eliminando permanentemente tipo de documento', { data: { docTypeId } });

  try {
    return await withActor(actor, async (tx) => {
      // Perímetro de escritura: sólo tipos propios (un global lanza GLOBAL_DOCUMENT_TYPE_READ_ONLY).
      const docType = await findScopedDocumentType(
        tx,
        docTypeId,
        companyId,
        { id: true, applies: true, mandatory: true },
        {},
        'write'
      );

      // El conteo de subidos es GLOBAL a propósito: `delete` del tipo cascadea todas sus filas.
      let uploadedCount = 0;
      if (docType.applies === document_applies.Persona) {
        uploadedCount = await tx.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        });
      } else if (docType.applies === document_applies.Equipos) {
        uploadedCount = await tx.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        });
      } else {
        uploadedCount = await tx.documents_company.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        });
      }

      if (uploadedCount > 0) {
        throw new Error(
          `No se puede eliminar: hay ${uploadedCount} documento(s) subido(s). Desactive el tipo en su lugar.`
        );
      }

      // Defensa en profundidad: las alertas se borran sólo para recursos de la empresa activa.
      let affectedResourceIds: string[] = [];

      if (docType.applies === document_applies.Persona) {
        const where = { id_document_types: docTypeId, employees: { company_id: companyId } };
        const affected = await tx.documents_employees.findMany({ where, select: { applies: true } });
        affectedResourceIds = affected.map((a) => a.applies).filter((id): id is string => id !== null);
        await tx.documents_employees.deleteMany({ where });
      } else if (docType.applies === document_applies.Equipos) {
        const where = { id_document_types: docTypeId, vehicles: { company_id: companyId } };
        const affected = await tx.documents_equipment.findMany({ where, select: { applies: true } });
        affectedResourceIds = affected.map((a) => a.applies).filter((id): id is string => id !== null);
        await tx.documents_equipment.deleteMany({ where });
      } else {
        await tx.documents_company.deleteMany({ where: { id_document_types: docTypeId, applies: companyId } });
      }

      await tx.document_types.delete({ where: { id: docTypeId } });

      if (docType.applies !== document_applies.Empresa && affectedResourceIds.length > 0) {
        await recalculateResourceStatus(tx, affectedResourceIds, docType.applies as 'Persona' | 'Equipos');
      }

      return { success: true };
    });
  } catch (error) {
    logger.error('Error al eliminar tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}

/**
 * Reactiva un tipo de documento (is_active = true).
 * Opcionalmente recrea alertas pendientes para los recursos que no las tienen.
 */
export async function reactivateDocumentType(docTypeId: string, options: { recreateAlerts: boolean }) {
  const companyId = await getActiveCompanyId();
  const actor = await requireActor();

  logger.info('Reactivando tipo de documento', { data: { docTypeId, options } });

  try {
    return await withActor(actor, async (tx) => {
      // Perímetro de escritura: sólo tipos propios (un global lanza GLOBAL_DOCUMENT_TYPE_READ_ONLY).
      const docType = await findScopedDocumentType(
        tx,
        docTypeId,
        companyId,
        { id: true, applies: true, mandatory: true, special: true, conditions: true, down_document: true, is_active: true },
        {},
        'write'
      );
      if (docType.is_active) throw new Error('Tipo de documento no encontrado o ya esta activo');

      // Los tipos "Documento de baja" generan alertas tambien para recursos dados de
      // baja; el resto solo para recursos activos.
      const onlyActive = !docType.down_document;

      await tx.document_types.update({
        where: { id: docTypeId },
        data: { is_active: true },
      });

      const newAlertResourceIds: string[] = [];

      if (options.recreateAlerts && docType.mandatory) {
        if (docType.applies === document_applies.Persona) {
          const missing = await tx.employees.findMany({
            where: {
              company_id: companyId,
              ...(onlyActive ? { is_active: true } : {}),
              documents_employees: { none: { id_document_types: docTypeId } },
            },
            select: { id: true },
          });

          if (missing.length > 0) {
            await tx.documents_employees.createMany({
              data: missing.map((emp) => ({
                id_document_types: docTypeId,
                applies: emp.id,
                state: 'pendiente' as const,
                is_active: true,
              })),
            });
            newAlertResourceIds.push(...missing.map((emp) => emp.id));
          }
        } else if (docType.applies === document_applies.Equipos) {
          const missing = await tx.vehicles.findMany({
            where: {
              company_id: companyId,
              ...(onlyActive ? { is_active: true } : {}),
              documents_equipment: { none: { id_document_types: docTypeId } },
            },
            select: { id: true },
          });

          if (missing.length > 0) {
            await tx.documents_equipment.createMany({
              data: missing.map((veh) => ({
                id_document_types: docTypeId,
                applies: veh.id,
                state: 'pendiente' as const,
                is_active: true,
              })),
            });
            newAlertResourceIds.push(...missing.map((veh) => veh.id));
          }
        } else {
          const existing = await tx.documents_company.findFirst({
            where: { id_document_types: docTypeId, applies: companyId },
            select: { id: true },
          });
          if (!existing) {
            await tx.documents_company.create({
              data: {
                id_document_types: docTypeId,
                applies: companyId,
                state: 'pendiente',
                is_active: true,
              },
            });
          }
        }
      }

      if (docType.applies !== document_applies.Empresa && newAlertResourceIds.length > 0) {
        await recalculateResourceStatus(tx, newAlertResourceIds, docType.applies as 'Persona' | 'Equipos');
      }

      return { success: true };
    });
  } catch (error) {
    logger.error('Error al reactivar tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}
