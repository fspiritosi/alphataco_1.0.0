import { getWorkOrderDetailForOperator } from '@/features/OperatorPanel/actions/actionsServer';
import { getOperatorContext } from '@/features/OperatorPanel/actions/session.server';
import { WorkOrderDetail } from '@/features/OperatorPanel/components/WorkOrderDetail';
import { redirect } from 'next/navigation';

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ workOrderId: string }> }) {
  const { workOrderId } = await params;
  const context = await getOperatorContext();
  if (!context) redirect('/operator/login');

  const workOrder = await getWorkOrderDetailForOperator(workOrderId, context.sectorId);

  if (!workOrder) {
    redirect('/operator/dashboard');
  }

  return <WorkOrderDetail initialData={workOrder} />;
}
