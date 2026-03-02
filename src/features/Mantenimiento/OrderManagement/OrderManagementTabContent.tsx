import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { Suspense } from 'react';
import { OrderManagementSkeleton } from './fallback';
import { OrderManagementList } from './OrderManagementList';

interface Props {
  searchParams: DataTableSearchParams;
}

/**
 * Tab de Gestion de Ordenes - Jefe de Taller
 *
 * Permite al Jefe de Taller gestionar los pedidos que ya ingresaron al taller:
 * - Ver items del pedido
 * - Agregar items manualmente
 * - Asignar items a sectores con orden de secuencia
 * - Se crea automaticamente un DIAGNOSTICO por sector
 */
export async function OrderManagementTabContent({ searchParams }: Props) {
  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Gestion de Ordenes</CardTitle>
        <CardDescription>Asignar items de reparacion a sectores del taller con orden de secuencia</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Suspense fallback={<OrderManagementSkeleton />}>
          <OrderManagementList searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
