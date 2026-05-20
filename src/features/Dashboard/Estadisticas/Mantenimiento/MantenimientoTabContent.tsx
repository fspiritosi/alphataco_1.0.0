import moment from 'moment';
import { getMaintenanceMonthSummary } from './actions/actions.server';
import { MantenimientoChartsDynamic } from './components/MantenimientoChartsDynamic';

export default async function MantenimientoTabContent() {
  const initialMonthKey = moment().startOf('month').format('YYYY-MM');
  const initialSummary = await getMaintenanceMonthSummary(initialMonthKey);

  return <MantenimientoChartsDynamic initialSummary={initialSummary} initialMonthKey={initialMonthKey} />;
}
