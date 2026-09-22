'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Employees/EmpleadoID/catalog-actions');

/**
 * Catálogos geográficos globales (sin `company_id`). Los `id` son `bigint` en Postgres y
 * viajan al cliente como `number`.
 */
export async function fetchProvinces() {
  try {
    const rows = await prisma.provinces.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
    return rows.map((row) => ({ id: Number(row.id), name: row.name }));
  } catch (error) {
    logger.error('Error al obtener las provincias', { data: { error } });
    return [];
  }
}

export async function fetchCitiesByProvinceId(provinceId: number) {
  try {
    const rows = await prisma.cities.findMany({
      where: { province_id: BigInt(provinceId) },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({ id: Number(row.id), name: row.name }));
  } catch (error) {
    logger.error('Error al obtener las ciudades de la provincia', { data: { error, provinceId } });
    return [];
  }
}
