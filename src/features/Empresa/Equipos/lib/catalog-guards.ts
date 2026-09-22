import 'server-only';

import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { catalogReadScope } from './catalog-scope';
import type { CompatibleItem } from './hitch-compatibility';

/**
 * Guardas de FK para las server actions de los catálogos de Equipos.
 *
 * Sin RLS, cada `'use server'` exportado es un endpoint público: los ids que llegan del cliente
 * (checklists, tipos de enganche, marcas, items compatibles) se escriben en tablas pivote y, si
 * no se validan, permiten colgar filas de otra empresa. Estas funciones NO son server actions
 * (módulo `server-only` sin `'use server'`): se llaman desde las actions, no desde el navegador.
 *
 * Criterio: los catálogos con `company_id` nullable se validan con el scope de lectura
 * (propios + globales, porque elegir una marca o un tipo global es legítimo); los que tienen
 * `company_id` NOT NULL, con `withCompany`.
 */

/** Ids únicos y no vacíos. */
function unique(ids: readonly string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

/** Los `type` referenciados tienen que ser legibles por la empresa (propios o globales). */
export async function assertTypesReadable(companyId: string, ids: readonly string[]): Promise<void> {
  const wanted = unique(ids);
  if (wanted.length === 0) return;
  const found = await prisma.type.count({ where: { id: { in: wanted }, ...catalogReadScope(companyId) } });
  if (found !== wanted.length) throw new Error('Tipo de unidad no encontrado');
}

/** Los `sub_type` referenciados tienen que ser legibles por la empresa (propios o globales). */
export async function assertSubTypesReadable(companyId: string, ids: readonly string[]): Promise<void> {
  const wanted = unique(ids);
  if (wanted.length === 0) return;
  const found = await prisma.sub_type.count({ where: { id: { in: wanted }, ...catalogReadScope(companyId) } });
  if (found !== wanted.length) throw new Error('Subtipo de unidad no encontrado');
}

/** `checklist_templates.company_id` es NOT NULL: las plantillas tienen que ser propias. */
export async function assertChecklistTemplatesOwned(companyId: string, ids: readonly string[]): Promise<void> {
  const wanted = unique(ids);
  if (wanted.length === 0) return;
  const found = await prisma.checklist_templates.count({ where: withCompany({ id: { in: wanted } }, companyId) });
  if (found !== wanted.length) throw new Error('Checklist no encontrado');
}

/** La marca elegida tiene que ser legible por la empresa (propia o global). */
export async function assertBrandReadable(companyId: string, brandId: number): Promise<void> {
  const found = await prisma.brand_vehicles.findFirst({
    where: { id: brandId, ...catalogReadScope(companyId) },
    select: { id: true },
  });
  if (!found) throw new Error('La marca no existe');
}

/** El titular elegido tiene que ser legible por la empresa (propio o global). */
export async function assertEquipmentOwnerReadable(companyId: string, ownerId: string): Promise<void> {
  const found = await prisma.equipment_owners.findFirst({
    where: { id: ownerId, ...catalogReadScope(companyId) },
    select: { id: true },
  });
  if (!found) throw new Error('El titular no existe');
}

/**
 * Los items compatibles de un subtipo apuntan a `sub_type` o a `type` según su `item_type`
 * (la pivote `sub_type_compatible_items` no tiene FK declarada: guarda un uuid suelto), así que
 * cada grupo se valida contra su propia tabla.
 */
export async function assertCompatibleItemsReadable(
  companyId: string,
  items: readonly CompatibleItem[]
): Promise<void> {
  await Promise.all([
    assertSubTypesReadable(
      companyId,
      items.filter((item) => item.type === 'sub_type').map((item) => item.id)
    ),
    assertTypesReadable(
      companyId,
      items.filter((item) => item.type === 'type').map((item) => item.id)
    ),
  ]);
}
