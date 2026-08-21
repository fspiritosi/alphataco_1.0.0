import { getPreparteKpiData } from './actions/preparte-kpi.server';
import { OrderManagementDynamic } from './components/OrderManagementDynamic';

export default async function SalaDeControlTabContent() {
  const preparteKpiData = await getPreparteKpiData();

  return (
    <div className="space-y-3">
      <OrderManagementDynamic data={preparteKpiData} />
    </div>
  );
}
