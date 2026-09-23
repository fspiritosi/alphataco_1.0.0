import type { PrismaClient } from '@/generated/prisma/client';

/**
 * Datos mínimos que los tests de integración necesitan y que NO vienen en las migraciones.
 *
 * `cities` y `provinces` son catálogos que en el entorno de trabajo llegan con el clon de
 * producción (`scripts/sync-prod-to-dev.sh`), pero en CI la base se crea desde `0_init` y está
 * vacía. Un `findFirstOrThrow` sobre `cities` hacía que los tests pasaran en la máquina del
 * desarrollador y fallaran en CI — el peor modo de falla para una suite que existe justamente
 * para atajar regresiones.
 */

/** Una ciudad cualquiera, creándola con su provincia si el catálogo está vacío. */
export async function ensureCity(prisma: PrismaClient): Promise<{ id: bigint; province_id: bigint }> {
  const existing = await prisma.cities.findFirst({ select: { id: true, province_id: true } });
  if (existing) return existing;

  const province =
    (await prisma.provinces.findFirst({ select: { id: true } })) ??
    (await prisma.provinces.create({ data: { name: 'Provincia de prueba' }, select: { id: true } }));

  return prisma.cities.create({
    data: { name: 'Ciudad de prueba', province_id: province.id },
    select: { id: true, province_id: true },
  });
}

/** Un país cualquiera (FK de `employees.birthplace`), creándolo si no hay ninguno. */
export async function ensureCountry(prisma: PrismaClient): Promise<{ id: string }> {
  const existing = await prisma.countries.findFirst({ select: { id: true } });
  if (existing) return existing;
  return prisma.countries.create({ data: { name: 'Argentina' }, select: { id: true } });
}
