import { cookies } from 'next/headers';
import { RepairTypeForm } from './RepairTypeForm';
import { fetchAllTypesOfRepairs } from './actions/actions';

async function RepairTypeFormWrapper() {
  // Fetch data
  const types_of_repairs = await fetchAllTypesOfRepairs();
  const coockiesStore = cookies();
  const savedVisibility = coockiesStore.get('repair-type-table')?.value;
  const savedVisibilityFilters = coockiesStore.get('repair-type-table-filters')?.value;

  return (
    <RepairTypeForm
      types_of_repairs={types_of_repairs}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : []}
      savedFilters={savedVisibilityFilters ? JSON.parse(savedVisibilityFilters) : []}
    />
  );
}

export default RepairTypeFormWrapper;
