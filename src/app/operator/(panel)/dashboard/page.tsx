import { getOperatorContext, getWorkOrdersForOperator } from '@/features/OperatorPanel/actions/actionsServer';
import { WorkOrderList } from '@/features/OperatorPanel/components/WorkOrderList';
import { redirect } from 'next/navigation';

export default async function OperatorDashboardPage() {
  const context = await getOperatorContext();
  if (!context) redirect('/operator/login');

  const workOrders = await getWorkOrdersForOperator(context.sectorId);

  return <WorkOrderList initialData={workOrders} />;
}
