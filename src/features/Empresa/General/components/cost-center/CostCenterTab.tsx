import { cookies } from 'next/headers';
import { fetchAllCostCenters } from '../../actions/actions';
import { CostCenterTabClient } from './CostCenterTabClient';

async function CostCenterTab() {
  const cookiesStore = cookies();
  const costCenters = fetchAllCostCenters();
  const savedVisibility = cookiesStore.get('cost-center-table')?.value;
  const savedFilter = cookiesStore.get('cost-center-table-filters')?.value;

  return (
    <CostCenterTabClient
      costCenters={costCenters}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
    />
  );
}

export default CostCenterTab;
