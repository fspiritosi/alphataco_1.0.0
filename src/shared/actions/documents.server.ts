'use server';

import type { Prisma, state } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getSessionUserId } from '@/shared/lib/session';
import { assertCompanyAccess, getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('shared/documents');

export type DocumentTableName = 'documents_equipment' | 'documents_employees';

export type UploadDocumentInput = {
  /** ISO string (el form lo genera con `toISOString()`). */
  created_at: string;
  /** Un id de recurso, o varios si `multipleResources` es true. */
  applies: string | string[];
  document_path: string;
  id_document_types: string;
  state: state;
  user_id?: string | null;
  period?: string;
  /** ISO string del date picker. */
  validity?: string;
  /** Sólo `documents_equipment`. */
  policy_number?: string;
};

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * Persiste el registro de un documento ya subido al storage (una fila por recurso).
 *
 * - `mandatory`: el tipo ya generó la alerta `pendiente` → se ACTUALIZA la fila existente
 *   (multirecurso: se actualizan las que existen y se crean las que faltan).
 * - no obligatorio: se crean filas nuevas con `state = 'presentado'`.
 *
 * Antes de escribir verifica que TODOS los recursos (`applies`) pertenezcan a la empresa
 * activa; si alguno no, lanza sin escribir. Corre dentro de `withActor` (si hay sesión) por
 * los triggers de `documents_*`.
 */
export const uploadDocument = async (
  dataToUpdate: UploadDocumentInput,
  mandatory: boolean,
  tableName: DocumentTableName,
  multipleResources: boolean
) => {
  const { applies, user_id, created_at, validity, policy_number, period, document_path, id_document_types, state } =
    dataToUpdate;
  const ids = Array.isArray(applies) ? applies : [applies];
  const targets = multipleResources ? ids : [ids[0]];

  const companyId = await getActiveCompanyId();
  const owned =
    tableName === 'documents_employees'
      ? await prisma.employees.count({ where: withCompany({ id: { in: targets } }, companyId) })
      : await prisma.vehicles.count({ where: withCompany({ id: { in: targets } }, companyId) });
  if (owned !== new Set(targets).size) {
    logger.warn('Intento de subir documento a recursos de otra empresa', {
      data: { tableName, companyId, targets: targets.length, owned },
    });
    throw new Error('Alguno de los recursos no pertenece a la empresa activa');
  }

  // `user_id` es uuid nullable: un '' rompe en Postgres, así que sólo se manda si viene.
  const common = {
    created_at: new Date(created_at),
    validity: validity ? new Date(validity) : undefined,
    period,
    document_path,
    id_document_types,
    state,
    ...(user_id ? { user_id } : {}),
  };

  const run = async (client: Client) => {
    const where = { applies: { in: targets }, id_document_types };

    if (tableName === 'documents_employees') {
      const model = client.documents_employees;
      const data = common;
      if (mandatory) {
        const existing = new Set((await model.findMany({ where, select: { applies: true } })).map((r) => r.applies));
        const toUpdate = targets.filter((id) => existing.has(id));
        const toInsert = multipleResources ? targets.filter((id) => !existing.has(id)) : [];
        if (toUpdate.length > 0) {
          await model.updateMany({ where: { applies: { in: toUpdate }, id_document_types }, data });
        }
        if (toInsert.length > 0) {
          await model.createMany({ data: toInsert.map((id) => ({ ...data, applies: id })) });
        }
        return;
      }
      if (multipleResources) {
        await model.createMany({ data: ids.map((id) => ({ ...data, applies: id })) });
        return;
      }
      await model.create({ data: { ...data, applies: ids[0], state: 'presentado' } });
      return;
    }

    const model = client.documents_equipment;
    const data = { ...common, policy_number };
    if (mandatory) {
      const existing = new Set((await model.findMany({ where, select: { applies: true } })).map((r) => r.applies));
      const toUpdate = targets.filter((id) => existing.has(id));
      const toInsert = multipleResources ? targets.filter((id) => !existing.has(id)) : [];
      if (toUpdate.length > 0) {
        await model.updateMany({ where: { applies: { in: toUpdate }, id_document_types }, data });
      }
      if (toInsert.length > 0) {
        await model.createMany({ data: toInsert.map((id) => ({ ...data, applies: id })) });
      }
      return;
    }
    if (multipleResources) {
      await model.createMany({ data: ids.map((id) => ({ ...data, applies: id })) });
      return;
    }
    await model.create({ data: { ...data, applies: ids[0], state: 'presentado' } });
  };

  try {
    const actor = await getSessionUserId();
    if (actor) {
      await withActor(actor, run);
    } else {
      await run(prisma);
    }
  } catch (error) {
    logger.error('Error al persistir el documento', {
      data: { error, tableName, id_document_types, mandatory, multipleResources },
    });
    throw new Error(error instanceof Error ? error.message : 'No se pudo guardar el documento');
  }
};

/**
 * `applies` de los documentos ya presentados (con archivo, no archivados) de un tipo,
 * para deshabilitar en el combobox los recursos que ya lo tienen.
 */
export const getAllDocumentsByIdDocumentTypeCientSide = async (
  selectedValue: string,
  company_id: string,
  tableName: DocumentTableName = 'documents_employees'
): Promise<{ applies: string | null }[]> => {
  if (!company_id) return [];
  await assertCompanyAccess(company_id);
  try {
    const where = { id_document_types: selectedValue, document_path: { not: null }, archived_at: null };
    if (tableName === 'documents_employees') {
      return await prisma.documents_employees.findMany({
        where: { ...where, employees: { company_id } },
        select: { applies: true },
      });
    }
    return await prisma.documents_equipment.findMany({
      where: { ...where, vehicles: { company_id } },
      select: { applies: true },
    });
  } catch (error) {
    logger.error('Error al obtener documentos por tipo de documento', { data: { error, tableName } });
    return [];
  }
};
