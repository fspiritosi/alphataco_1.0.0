'use server';

import {
  assertClothingBrandInCompany,
  assertClothingItemInCompany,
  assertClothingSizeInCompany,
  assertEmployeeInCompany,
  requireClothingOperator,
} from '@/features/Clothing/actions/perimeter';
import { isDeliveryType, normalizeDeliveryItems, type RawDeliveryItem } from '@/features/Clothing/lib/delivery-items';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Clothing/Delivery/mutations');

/**
 * Entrada del asistente de entrega.
 *
 * Ya NO lleva `companyId` ni `deliveredById`: la empresa y el entregador salen del operario
 * de la sesión. Antes los tres venían del cliente, con lo que se podían crear entregas en
 * cualquier empresa, a nombre de cualquier empleado.
 */
export type CreateDeliveryInput = {
  employeeId: string;
  deliveryType: string;
  signatureUrl?: string;
  notes?: string;
  deliveredAt: string;
  items: RawDeliveryItem[];
};

/** Valida contra la empresa del operario cada artículo, marca y talle que llega del cliente. */
async function assertItemsInCompany(
  items: ReturnType<typeof normalizeDeliveryItems>,
  companyId: string
): Promise<void> {
  const itemIds = [...new Set(items.map((item) => item.clothingItemId))];
  const brandIds = [...new Set(items.map((item) => item.clothingBrandId).filter((id): id is string => id != null))];
  const sizeIds = [...new Set(items.map((item) => item.clothingSizeId).filter((id): id is string => id != null))];

  await Promise.all([
    ...itemIds.map((id) => assertClothingItemInCompany(id, companyId)),
    ...brandIds.map((id) => assertClothingBrandInCompany(id, companyId)),
    ...sizeIds.map((id) => assertClothingSizeInCompany(id, companyId)),
  ]);
}

/**
 * Registra una entrega de ropa con sus artículos en una sola transacción.
 *
 * Perímetro: empresa y entregador salen del operario de la sesión; el empleado receptor y
 * cada artículo/marca/talle tienen que ser de esa misma empresa.
 */
export async function createClothingDelivery(data: CreateDeliveryInput) {
  const operator = await requireClothingOperator();
  logger.debug('Creating clothing delivery', {
    data: { employeeId: data.employeeId, itemCount: data.items.length },
  });

  if (!isDeliveryType(data.deliveryType)) {
    throw new Error('Tipo de entrega inválido');
  }

  const items = normalizeDeliveryItems(data.items);
  if (items.length === 0) {
    throw new Error('La entrega no tiene artículos válidos');
  }

  const deliveredAt = new Date(data.deliveredAt);
  if (Number.isNaN(deliveredAt.getTime())) {
    throw new Error('Fecha de entrega inválida');
  }

  try {
    await assertEmployeeInCompany(data.employeeId, operator.companyId);
    await assertItemsInCompany(items, operator.companyId);

    const delivery = await prisma.clothing_deliveries.create({
      data: {
        employee_id: data.employeeId,
        delivered_by_id: operator.employeeId,
        delivery_type: data.deliveryType,
        signature_url: data.signatureUrl ?? null,
        notes: data.notes ?? null,
        delivered_at: deliveredAt,
        company_id: operator.companyId,
        clothing_delivery_items: {
          createMany: {
            data: items.map((item) => ({
              clothing_item_id: item.clothingItemId,
              clothing_brand_id: item.clothingBrandId,
              clothing_size_id: item.clothingSizeId,
              quantity: item.quantity,
              has_certificate: item.hasCertificate,
            })),
          },
        },
      },
      include: { clothing_delivery_items: true },
    });

    logger.info('Clothing delivery created', { data: { deliveryId: delivery.id } });
    return delivery;
  } catch (error) {
    logger.error('Error creating clothing delivery', { data: { error } });
    throw error;
  }
}

export type ClothingDeliveryCreated = Awaited<ReturnType<typeof createClothingDelivery>>;
