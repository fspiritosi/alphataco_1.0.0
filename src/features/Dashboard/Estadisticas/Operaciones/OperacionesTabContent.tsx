import { getOperationsChartData } from './actions/actions.server';
import { OperacionesChartsDynamic } from './components/OperacionesChartsDynamic';

export default async function OperacionesTabContent() {
  const data = await getOperationsChartData();

  return <OperacionesChartsDynamic data={data} />;
}
