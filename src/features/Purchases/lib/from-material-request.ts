import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { DESTINATION_SELECT, destinationLabel } from '@/features/Warehouses/lib/labels';
import { deliveredByLines } from '@/features/Warehouses/lib/requests';
import type { DestinationInput } from '@/features/Warehouses/schemas/stock-movement';
import { PurchaseError } from './purchase-errors';

/**
 * Solicitud de compra a partir de un pedido de materiales de Almacenes (spec Compras etapa 1
 * §3.1): lo que falta = pendiente de entrega - stock disponible en TODA la empresa. Solo se
 * propone lo que tiene faltante; el destino es el del pedido.
 */

type Tx = Prisma.TransactionClient;
type Reader = Pick<Tx, 'material_requests' | 'stock_balances' | '$queryRaw'>;

/** Estados en los que el pedido todavia espera entregas. */
const OPEN_FOR_DELIVERY = ['APPROVED', 'PARTIALLY_DELIVERED'] as const;

export interface ShortfallLine {
  materialId: string;
  code: string;
  name: string;
  unitId: string;
  unit: string;
  pending: string;
  available: string;
  shortfall: string;
}

export interface MaterialRequestShortfall {
  id: string;
  number: string;
  destination: DestinationInput;
  /** "Perez, Juan (123)", "AB123CD"…: para mostrar en el formulario. */
  destinationLabel: string | null;
  lines: ShortfallLine[];
}

const dec = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value);

/**
 * Lee el pedido y calcula el faltante por material. Lanza si el pedido no es de la empresa, si
 * no esta aprobado (o parcialmente entregado) o si no le falta nada.
 */
export async function materialRequestShortfall(
  tx: Reader,
  companyId: string,
  materialRequestId: string
): Promise<MaterialRequestShortfall> {
  const request = await tx.material_requests.findFirst({
    where: { id: materialRequestId, company_id: companyId },
    select: {
      id: true,
      number: true,
      status: true,
      ...DESTINATION_SELECT,
      employee_id: true,
      vehicle_id: true,
      other_equipment_id: true,
      maintenance_order_id: true,
      customer_id: true,
      customer_service_id: true,
      lines: {
        select: {
          id: true,
          material_id: true,
          quantity: true,
          material: { select: { code: true, name: true, unit: { select: { id: true, abbreviation: true } } } },
        },
      },
    },
  });
  if (!request) throw new PurchaseError('El pedido de materiales no existe');
  if (!(OPEN_FOR_DELIVERY as readonly string[]).includes(request.status)) {
    throw new PurchaseError(`El pedido ${request.number} no está aprobado con entregas pendientes`);
  }

  const delivered = await deliveredByLines(
    tx,
    request.lines.map((l) => l.id)
  );
  const materialIds = [...new Set(request.lines.map((l) => l.material_id))];
  const balances = await tx.stock_balances.groupBy({
    by: ['material_id'],
    where: { company_id: companyId, material_id: { in: materialIds } },
    _sum: { quantity: true },
  });
  const availableBy = new Map(balances.map((b) => [b.material_id, dec(b._sum.quantity ?? 0)]));

  // Un material puede estar en dos lineas del pedido: se suma.
  const byMaterial = new Map<string, { pending: Prisma.Decimal; line: (typeof request.lines)[number] }>();
  for (const line of request.lines) {
    const pending = dec(line.quantity).minus(delivered.get(line.id) ?? 0);
    const current = byMaterial.get(line.material_id);
    byMaterial.set(line.material_id, { pending: (current?.pending ?? dec(0)).plus(pending), line: current?.line ?? line });
  }

  const lines: ShortfallLine[] = [];
  for (const [materialId, { pending, line }] of byMaterial) {
    if (pending.lte(0)) continue;
    const available = Prisma.Decimal.max(availableBy.get(materialId) ?? dec(0), 0);
    const shortfall = pending.minus(available);
    if (shortfall.lte(0)) continue;
    lines.push({
      materialId,
      code: line.material.code,
      name: line.material.name,
      unitId: line.material.unit.id,
      unit: line.material.unit.abbreviation,
      pending: pending.toString(),
      available: available.toString(),
      shortfall: shortfall.toString(),
    });
  }
  if (lines.length === 0) {
    throw new PurchaseError(`El pedido ${request.number} no tiene faltantes: hay stock para entregar todo`);
  }

  return {
    id: request.id,
    number: request.number,
    destination: {
      destinationType: request.destination_type,
      employeeId: request.employee_id,
      vehicleId: request.vehicle_id,
      otherEquipmentId: request.other_equipment_id,
      maintenanceOrderId: request.maintenance_order_id,
      customerId: request.customer_id,
      customerServiceId: request.customer_service_id,
    },
    destinationLabel: destinationLabel(request),
    lines,
  };
}
