import { getOperationsChartData } from './actions/actions.server';
import { OperacionesChartsDynamic } from './components/OperacionesChartsDynamic';

export default async function OperacionesTabContent() {
  const chartData = await getOperationsChartData();

  return (
    <div className="space-y-3">
      <OperacionesChartsDynamic data={chartData} />
    </div>
  );
}
