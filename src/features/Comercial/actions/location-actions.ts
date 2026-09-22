'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Comercial/location');

/**
 * Provincias del catálogo global (la tabla no tiene `company_id`: es compartida por todas
 * las empresas). `id` es `bigint` en Postgres: se devuelve como `number` para que el valor
 * sea serializable a través del límite Server → Client.
 */
export async function fetchAllProvinces(): Promise<{ id: number; name: string }[]> {
  try {
    const provinces = await prisma.provinces.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return provinces.map((province) => ({ id: Number(province.id), name: province.name }));
  } catch (error) {
    logger.error('Error al obtener las provincias', { data: { error } });
    return [];
  }
}

/**
 * Ciudades de una provincia (catálogo global, sin `company_id`).
 */
export async function fetchCitiesByProvince(provinceId: number): Promise<{ id: number; name: string }[]> {
  try {
    const cities = await prisma.cities.findMany({
      where: { province_id: BigInt(provinceId) },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return cities.map((city) => ({ id: Number(city.id), name: city.name }));
  } catch (error) {
    logger.error('Error al obtener las ciudades', { data: { error, provinceId } });
    return [];
  }
}
