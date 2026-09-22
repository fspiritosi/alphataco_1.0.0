import 'server-only';

import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';

/**
 * Guardas de FK para las server actions de los catálogos de RRHH.
 *
 * Sin RLS, cada `'use server'` exportado es un endpoint público: los ids que llegan del cliente
 * (aptitudes, puestos, jerarquías) se escriben en pivotes o en columnas array y, si no se
 * validan, permiten referenciar filas de otra empresa. Los tres catálogos tienen `company_id`
 * NOT NULL, así que no hay filas globales: `withCompany` a secas.
 *
 * NO son server actions (módulo `server-only` sin `'use server'`): se llaman desde las actions.
 */

function unique(ids: readonly string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

/** Las aptitudes técnicas referenciadas tienen que ser de la empresa activa. */
export async function assertAptitudesOwned(companyId: string, ids: readonly string[]): Promise<void> {
  const wanted = unique(ids);
  if (wanted.length === 0) return;
  const found = await prisma.aptitudes_tecnicas.count({ where: withCompany({ id: { in: wanted } }, companyId) });
  if (found !== wanted.length) throw new Error('Aptitud técnica no encontrada');
}

/** Los puestos referenciados tienen que ser de la empresa activa. */
export async function assertPositionsOwned(companyId: string, ids: readonly string[]): Promise<void> {
  const wanted = unique(ids);
  if (wanted.length === 0) return;
  const found = await prisma.company_positions.count({ where: withCompany({ id: { in: wanted } }, companyId) });
  if (found !== wanted.length) throw new Error('Puesto no encontrado');
}

/** Las jerarquías referenciadas (columna array `hierarchical_position_id`) tienen que ser propias. */
export async function assertHierarchiesOwned(companyId: string, ids: readonly string[]): Promise<void> {
  const wanted = unique(ids);
  if (wanted.length === 0) return;
  const found = await prisma.hierarchy.count({ where: withCompany({ id: { in: wanted } }, companyId) });
  if (found !== wanted.length) throw new Error('Jerarquía no encontrada');
}
