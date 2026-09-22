'use server';

import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { errorMessage, fail, ok, type ActionResult } from '../lib/action-result';
import { serviceItemFormSchema, type ServiceItemFormValues } from '../schemas/service-item';

const logger = new Logger('features/Empresa/Clientes/service-items');

const itemInclude = {
  measure_units: { select: { id: true, unit: true, simbol: true, tipo: true } },
  customer_services: {
    select: { id: true, service_name: true, customer_id: true, customers: { select: { id: true, name: true } } },
  },
} satisfies Prisma.service_itemsInclude;

type ItemWithRelations = Prisma.service_itemsGetPayload<{ include: typeof itemInclude }>;

/** `item_price` es `Decimal`: hacia el cliente viaja como number. */
function serializeItem({ item_price, ...rest }: ItemWithRelations) {
  return { ...rest, item_price: Number(item_price) };
}

export type ServiceItemRow = ReturnType<typeof serializeItem>;

async function findItems(customerServiceId: string, companyId: string, onlyActive: boolean) {
  const rows = await prisma.service_items.findMany({
    where: {
      customer_service_id: customerServiceId,
      company_id: companyId,
      ...(onlyActive ? { is_active: true } : {}),
    },
    include: itemInclude,
    orderBy: { item_name: 'asc' },
  });
  return rows.map(serializeItem);
}

/** Todos los items (activos e inactivos) de un contrato de la empresa activa. */
export async function getServiceItemsByContract(customerServiceId: string): Promise<ServiceItemRow[]> {
  if (!customerServiceId) return [];
  const companyId = await getActiveCompanyId();
  try {
    return await findItems(customerServiceId, companyId, false);
  } catch (error) {
    logger.error('Error al obtener items del contrato', { data: { error, customerServiceId } });
    throw error;
  }
}

/** Sólo los items activos de un contrato (selectores de partes diarios / prepartes). */
export async function getActiveServiceItems(customerServiceId: string): Promise<ServiceItemRow[]> {
  if (!customerServiceId) return [];
  const companyId = await getActiveCompanyId();
  try {
    return await findItems(customerServiceId, companyId, true);
  } catch (error) {
    logger.error('Error al obtener items activos del contrato', { data: { error, customerServiceId } });
    return [];
  }
}

function toItemData(values: ServiceItemFormValues) {
  return {
    item_name: values.item_name,
    item_description: values.item_description ?? '',
    code_item: values.code_item || null,
    item_number: values.item_number || null,
    item_measure_units: Number(values.item_measure_units),
    item_price: new Prisma.Decimal(values.item_price),
    is_active: values.is_active,
    needs_personnel: values.needs_personnel,
    needs_equipment: values.needs_equipment,
  };
}

async function assertMeasureUnitExists(id: number): Promise<void> {
  const unit = await prisma.measure_units.findUnique({ where: { id }, select: { id: true } });
  if (!unit) throw new Error('Unidad de medida inválida');
}

/** Alta de item en un contrato de la empresa activa. */
export async function createServiceItem(
  customerServiceId: string,
  input: ServiceItemFormValues
): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceItemFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const companyId = await getActiveCompanyId();
  try {
    const service = await prisma.customer_services.findFirst({
      where: { id: customerServiceId, company_id: companyId },
      select: { id: true },
    });
    if (!service) return fail('Contrato no encontrado');
    const data = toItemData(parsed.data);
    await assertMeasureUnitExists(data.item_measure_units);

    const created = await prisma.service_items.create({
      data: { ...data, customer_service_id: customerServiceId, company_id: companyId },
      select: { id: true },
    });
    logger.info('Item de contrato creado', { data: { itemId: created.id, customerServiceId } });
    return ok({ id: created.id });
  } catch (error) {
    logger.error('Error al crear el item', { data: { error, customerServiceId } });
    return fail(errorMessage(error, 'Error al crear el item'));
  }
}

/** Edición de un item de la empresa activa. */
export async function updateServiceItem(
  itemId: string,
  input: ServiceItemFormValues
): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceItemFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const companyId = await getActiveCompanyId();
  try {
    const data = toItemData(parsed.data);
    await assertMeasureUnitExists(data.item_measure_units);
    const updated = await prisma.service_items.updateMany({ where: { id: itemId, company_id: companyId }, data });
    if (updated.count === 0) return fail('Item no encontrado');
    logger.info('Item de contrato actualizado', { data: { itemId } });
    return ok({ id: itemId });
  } catch (error) {
    logger.error('Error al actualizar el item', { data: { error, itemId } });
    return fail(errorMessage(error, 'Error al actualizar el item'));
  }
}
