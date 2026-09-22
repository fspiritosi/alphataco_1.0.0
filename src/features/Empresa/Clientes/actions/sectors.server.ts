'use server';

import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { revalidatePath } from 'next/cache';
import { errorMessage, fail, ok, type ActionResult } from '../lib/action-result';
import { diffAssignments } from '../lib/assignment-diff';
import { sectorFormSchema, type SectorFormValues } from '../schemas/sector';

const logger = new Logger('features/Empresa/Clientes/sectors');

const COMERCIAL_PATH = '/dashboard/comercial';

/**
 * Sectores (`sectors`) no tienen `company_id`: pertenecen a la empresa a través de
 * `sector_customer → customers`. Un sector sin clientes no es visible para nadie.
 */

/** Filas sector ↔ cliente de la empresa activa (lo que lista la tabla de Sectores). */
export async function getSectorCustomers() {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.sector_customer.findMany({
      where: { customers: { company_id: companyId } },
      select: {
        id: true,
        sector_id: true,
        customer_id: true,
        created_at: true,
        sectors: { select: { id: true, name: true, descripcion_corta: true } },
        customers: { select: { id: true, name: true } },
      },
      orderBy: { sectors: { name: 'asc' } },
    });
  } catch (error) {
    logger.error('Error al obtener sectores por cliente', { data: { error, companyId } });
    throw error;
  }
}

export type SectorCustomerRow = Awaited<ReturnType<typeof getSectorCustomers>>[number];

async function assertCustomerOwned(customerId: string, companyId: string): Promise<void> {
  const customer = await prisma.customers.findFirst({ where: { id: customerId, company_id: companyId }, select: { id: true } });
  if (!customer) throw new Error('Cliente no encontrado');
}

export async function createSector(input: SectorFormValues): Promise<ActionResult<{ id: string }>> {
  const parsed = sectorFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');
  const values = parsed.data;

  const companyId = await getActiveCompanyId();
  try {
    await assertCustomerOwned(values.customer_id, companyId);
    const created = await prisma.$transaction(async (tx) => {
      const sector = await tx.sectors.create({
        data: { name: values.name, descripcion_corta: values.descripcion_corta },
        select: { id: true },
      });
      await tx.sector_customer.create({ data: { sector_id: sector.id, customer_id: values.customer_id } });
      return sector;
    });
    logger.info('Sector creado', { data: { sectorId: created.id } });
    revalidatePath(COMERCIAL_PATH);
    return ok({ id: created.id });
  } catch (error) {
    logger.error('Error al crear el sector', { data: { error } });
    return fail(errorMessage(error, 'Error al crear el sector'));
  }
}

/**
 * Edición de sector. El vínculo con clientes se reconcilia con altas y bajas explícitas
 * (`diffAssignments`) contra lo que hay en la base para ese sector.
 */
export async function updateSector(input: SectorFormValues & { id: string }): Promise<ActionResult<{ id: string }>> {
  const parsed = sectorFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');
  const values = parsed.data;
  const sectorId = input.id;

  const companyId = await getActiveCompanyId();
  try {
    const sector = await prisma.sectors.findFirst({
      where: { id: sectorId, sector_customer: { some: { customers: { company_id: companyId } } } },
      select: { id: true, sector_customer: { select: { customer_id: true } } },
    });
    if (!sector) return fail('Sector no encontrado');
    await assertCustomerOwned(values.customer_id, companyId);

    const { toAdd, toRemove } = diffAssignments(
      sector.sector_customer.map((sc) => sc.customer_id),
      [values.customer_id]
    );

    await prisma.$transaction(async (tx) => {
      await tx.sectors.update({
        where: { id: sectorId },
        data: { name: values.name, descripcion_corta: values.descripcion_corta },
      });
      if (toRemove.length > 0) {
        await tx.sector_customer.deleteMany({ where: { sector_id: sectorId, customer_id: { in: toRemove } } });
      }
      if (toAdd.length > 0) {
        await tx.sector_customer.createMany({
          data: toAdd.map((customer_id) => ({ sector_id: sectorId, customer_id })),
          skipDuplicates: true,
        });
      }
    });

    logger.info('Sector actualizado', { data: { sectorId, added: toAdd.length, removed: toRemove.length } });
    revalidatePath(COMERCIAL_PATH);
    return ok({ id: sectorId });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return fail('No se puede cambiar el cliente del sector porque está siendo utilizado en contratos o partes diarios');
    }
    logger.error('Error al actualizar el sector', { data: { error, sectorId } });
    return fail(errorMessage(error, 'Error al actualizar el sector'));
  }
}
