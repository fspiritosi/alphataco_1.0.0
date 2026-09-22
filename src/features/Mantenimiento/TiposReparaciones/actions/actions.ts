'use server';

import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('Mantenimiento/TiposReparaciones/actions');

/** Datos que el formulario manda para crear o editar un tipo de reparación. */
export interface TypeOfRepairInput {
  name: string;
  description: string;
  criticity?: string | null;
  is_active?: boolean;
  type_of_maintenance?: Prisma.types_of_repairsCreateInput['type_of_maintenance'];
  multi_equipment?: boolean;
  qr_close?: boolean;
  autorizable?: boolean;
}

/**
 * Tipos de reparación de la empresa activa.
 *
 * Perímetro: sin RLS, el listado se acota siempre por `company_id` (antes traía TODAS las
 * filas de la tabla: el filtro por empresa estaba comentado).
 */
export async function fetchAllTypesOfRepairs() {
  try {
    const companyId = await getActiveCompanyId();

    return await prisma.types_of_repairs.findMany({
      where: withCompany({}, companyId),
      orderBy: { created_at: 'desc' },
    });
  } catch (error) {
    logger.error('Error al obtener los tipos de reparación', { data: { error } });
    return [];
  }
}

export type TypesOfRepairsData = Awaited<ReturnType<typeof fetchAllTypesOfRepairs>>;
export type TypeOfRepairData = TypesOfRepairsData[number];

/**
 * Crea un tipo de reparación en la empresa activa.
 *
 * Guarda contra duplicados: sin esto, repetir el alta del mismo tipo (por doble click o
 * por volver a cargarlo más tarde) creaba una segunda fila idéntica sin ningún aviso
 * (ticket 616). La comparación ignora mayúsculas y espacios sobrantes, y es por empresa.
 */
export async function createTypeOfRepair(body: TypeOfRepairInput) {
  try {
    const companyId = await getActiveCompanyId();
    const name = body.name?.trim();

    if (name) {
      const existing = await prisma.types_of_repairs.findFirst({
        where: withCompany({ name: { equals: name, mode: Prisma.QueryMode.insensitive } }, companyId),
        select: { id: true, name: true },
      });

      if (existing) {
        return { ok: false as const, error: `Ya existe el tipo de reparación "${existing.name}".` };
      }
    }

    const created = await prisma.types_of_repairs.create({
      data: {
        name: name ?? body.name,
        description: body.description,
        criticity: body.criticity ?? null,
        is_active: body.is_active ?? true,
        type_of_maintenance: body.type_of_maintenance ?? null,
        multi_equipment: body.multi_equipment ?? false,
        qr_close: body.qr_close ?? false,
        autorizable: body.autorizable ?? false,
        company_id: companyId,
      },
    });

    return { ok: true as const, data: [created] };
  } catch (error) {
    logger.error('Error al crear tipo de reparacion', { data: { error } });
    return { ok: false as const, error: 'No se pudo crear el tipo de reparación. Intente nuevamente.' };
  }
}

/** Actualiza un tipo de reparación de la empresa activa. */
export async function updateTypeOfRepair(body: Partial<TypeOfRepairInput>, id: string) {
  try {
    const companyId = await getActiveCompanyId();

    // Perímetro: el tipo tiene que ser de la empresa activa.
    const { count } = await prisma.types_of_repairs.updateMany({
      where: withCompany({ id }, companyId),
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.criticity !== undefined ? { criticity: body.criticity } : {}),
        ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
        ...(body.type_of_maintenance !== undefined ? { type_of_maintenance: body.type_of_maintenance } : {}),
        ...(body.multi_equipment !== undefined ? { multi_equipment: body.multi_equipment } : {}),
        ...(body.qr_close !== undefined ? { qr_close: body.qr_close } : {}),
        ...(body.autorizable !== undefined ? { autorizable: body.autorizable } : {}),
      },
    });

    if (count === 0) {
      logger.warn('No se actualizó ningún tipo de reparación', { data: { id } });
    }

    return { ok: count > 0 } as const;
  } catch (error) {
    logger.error('Error al actualizar tipo de reparacion', { data: { error, id } });
    return { ok: false } as const;
  }
}

/** Elimina un tipo de reparación de la empresa activa. */
export async function deleteTypeOfRepair(id: string) {
  try {
    const companyId = await getActiveCompanyId();

    const { count } = await prisma.types_of_repairs.deleteMany({
      where: withCompany({ id }, companyId),
    });

    return { ok: count > 0 } as const;
  } catch (error) {
    logger.error('Error al eliminar tipo de reparacion', { data: { error, id } });
    return { ok: false } as const;
  }
}

/** Sectores activos de los talleres de la empresa activa, para la config del tipo. */
export async function fetchAllWorkshopSectorsForConfig() {
  try {
    const companyId = await getActiveCompanyId();

    return await prisma.workshop_sectors.findMany({
      where: withCompany({ is_active: true }, companyId),
      select: {
        id: true,
        name: true,
        workshop_id: true,
        workshops: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener los sectores de taller', { data: { error } });
    return [];
  }
}

/** Ids de los sectores asociados a un tipo de reparación de la empresa activa. */
export async function fetchSectorsForRepairType(repairTypeId: string) {
  try {
    const companyId = await getActiveCompanyId();

    const rows = await prisma.sector_repair_types.findMany({
      where: {
        repair_type_id: repairTypeId,
        types_of_repairs: { company_id: companyId },
      },
      select: { workshop_sector_id: true },
    });

    return rows.map((row) => row.workshop_sector_id);
  } catch (error) {
    logger.error('Error al obtener los sectores del tipo de reparación', { data: { error, repairTypeId } });
    return [];
  }
}

/**
 * Reemplaza los sectores asociados a un tipo de reparación.
 *
 * Es un formulario de UNA entidad renderizado con su estado real, así que el reemplazo
 * total es seguro (ver la regla de mutaciones M:M): igual se acota el alta a sectores de
 * la misma empresa para que un id ajeno no entre por el endpoint.
 */
export async function updateRepairTypeSectors(repairTypeId: string, sectorIds: string[]) {
  const companyId = await getActiveCompanyId();

  const repairType = await prisma.types_of_repairs.findFirst({
    where: withCompany({ id: repairTypeId }, companyId),
    select: { id: true },
  });
  if (!repairType) throw new Error('El tipo de reparación no pertenece a la empresa activa');

  const validSectors =
    sectorIds.length > 0
      ? await prisma.workshop_sectors.findMany({
          where: withCompany({ id: { in: sectorIds } }, companyId),
          select: { id: true },
        })
      : [];

  await prisma.$transaction(async (tx) => {
    await tx.sector_repair_types.deleteMany({ where: { repair_type_id: repairTypeId } });

    if (validSectors.length > 0) {
      await tx.sector_repair_types.createMany({
        data: validSectors.map((sector) => ({
          workshop_sector_id: sector.id,
          repair_type_id: repairTypeId,
        })),
        skipDuplicates: true,
      });
    }
  });
}
