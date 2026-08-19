import { getDeviationsChartData } from './actions/actions.server';
import { DesviosChartsDynamic } from './components/DesviosChartsDynamic';

export default async function DesviosTabContent() {
  const data = await getDeviationsChartData();

  return (
    <div className="space-y-3">
      <DesviosChartsDynamic data={data} />
    </div>
  );
}
