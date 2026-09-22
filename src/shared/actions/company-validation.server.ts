'use server';

import { prisma } from '@/shared/lib/prisma';

/**
 * true si ningún registro de `company` usa ese CUIT (validación de unicidad del formulario
 * de alta/edición de empresa). El CUIT es único a nivel global (`company_compay_cuit_key`),
 * por eso no se filtra por empresa.
 */
export async function isCompanyCuitAvailable(cuit: string): Promise<boolean> {
  const count = await prisma.company.count({ where: { company_cuit: cuit } });
  return count === 0;
}
