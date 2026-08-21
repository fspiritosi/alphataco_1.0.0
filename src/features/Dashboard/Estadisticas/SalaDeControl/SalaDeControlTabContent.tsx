import { getDeviationsChartData } from './actions/actions.server';
import { getPreparteKpiData } from './actions/preparte-kpi.server';
import { DesviosChartsDynamic } from './components/DesviosChartsDynamic';
import { OrderManagementDynamic } from './components/OrderManagementDynamic';

export default async function SalaDeControlTabContent() {
  const [deviationsData, preparteKpiData] = await Promise.all([getDeviationsChartData(), getPreparteKpiData()]);

  return (
    <div className="space-y-3">
      <DesviosChartsDynamic data={deviationsData} />
      <OrderManagementDynamic data={preparteKpiData} />
    </div>
  );
}
