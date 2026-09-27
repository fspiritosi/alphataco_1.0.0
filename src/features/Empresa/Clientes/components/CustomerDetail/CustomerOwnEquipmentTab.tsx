'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getCustomerEquipmentsByCustomer } from '../../actions/customer-equipment.server';
import type { CustomerRow } from '../../lib/serializers';
import { CustomerEquipmentFormDialog } from '../equipos/CustomerEquipmentFormDialog';
import CustomerEquipmentTable from '../equipos/customerEquipmentTable';

interface CustomerOwnEquipmentTabProps {
  customer: CustomerRow;
}

/**
 * Pestaña "Equipos del cliente" de la ficha: el CRUD de `equipos_clientes`.
 *
 * Son los equipos que APORTA el cliente (su perforador, su work over), y son los que después se
 * eligen al cargar una línea del parte diario. No confundir con la pestaña "Equipos afectados",
 * que son equipos DE LA EMPRESA asignados a este cliente (`contractor_equipment`).
 */
export function CustomerOwnEquipmentTab({ customer }: CustomerOwnEquipmentTabProps) {
  const { data: equipments = [], isPending } = useQuery({
    queryKey: ['customer-own-equipment', customer.id],
    queryFn: () => getCustomerEquipmentsByCustomer(customer.id),
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Equipos del cliente</h2>
        <CustomerEquipmentFormDialog customerId={customer.id} triggerLabel="Nuevo equipo" />
      </div>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <CustomerEquipmentTable customerEquipments={equipments} customerId={customer.id} />
      )}
    </div>
  );
}
