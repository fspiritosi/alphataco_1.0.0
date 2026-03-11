import { getOperationsChartData } from './actions/actions.server';
import { getPreparteKpiData } from './actions/preparte-kpi.server';
import { OperacionesChartsDynamic } from './components/OperacionesChartsDynamic';
import { OrderManagementDynamic } from './components/OrderManagementDynamic';

export default async function OperacionesTabContent() {
  const [chartData, preparteKpiData] = await Promise.all([getOperationsChartData(), getPreparteKpiData()]);

  return (
    <div className="space-y-3">
      <OperacionesChartsDynamic data={chartData} />
      <OrderManagementDynamic data={preparteKpiData} />
    </div>
  );
}
