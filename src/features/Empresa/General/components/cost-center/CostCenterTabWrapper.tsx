import { cookies } from 'next/headers';
import { fetchAllCostCenters } from '../../actions/actions';
import CostCenterTab from './CostCenterTab';

export default async function CostCenterTabWrapper() {
  const cookiesStore = cookies();
  const costCenters = await fetchAllCostCenters();

  const savedVisibilityCostCenter = cookiesStore.get('cost-center-table')?.value;
  const savedFilterCostCenter = cookiesStore.get('cost-center-table-filters')?.value;

  return (
    <CostCenterTab
      savedFilter={savedFilterCostCenter ? JSON.parse(savedFilterCostCenter) : []}
      costCenters={costCenters}
      savedVisibility={savedVisibilityCostCenter ? JSON.parse(savedVisibilityCostCenter) : {}}
    />
  );
}
