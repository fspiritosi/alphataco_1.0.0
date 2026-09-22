'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId, NoActiveCompanyError } from '@/shared/lib/tenant';

/**
 * Centros de costo de la empresa activa para selectores (formularios de equipos y otros equipos).
 * El CRUD paginado vive en `../CostCenter/actions.server.ts`.
 */
const logger = new Logger('features/Empresa/General/cost-centers');

/** `{ id, name, is_active }` ordenados por nombre; [] sin empresa activa. */
export async function getCostCenterOptions() {
  try {
    const companyId = await getActiveCompanyId();
    return await prisma.cost_center.findMany({
      where: withCompany({}, companyId),
      select: { id: true, name: true, is_active: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    if (!(error instanceof NoActiveCompanyError)) {
      logger.error('Error al obtener centros de costo', { data: { error } });
    }
    return [];
  }
}

export type CostCenterOption = Awaited<ReturnType<typeof getCostCenterOptions>>[number];
