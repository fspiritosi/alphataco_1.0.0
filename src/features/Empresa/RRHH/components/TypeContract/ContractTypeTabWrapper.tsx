import { cookies } from 'next/headers';
import ContractTypesTab from './ContractTypeTab';
import { fetchAllContractTypesIncludesInactive } from './actions/actions';

export default async function ContractTypeTabWrapper() {
  const cookiesStore = cookies();

  // Fetch data
  const allContractTypes = await fetchAllContractTypesIncludesInactive();

  // Get cookies
  const savedVisibilityContractTypes = cookiesStore.get('contract-type-table')?.value;
  const savedVisibilityContractTypesFilter = cookiesStore.get('contract-type-table-filters')?.value;

  return (
    <ContractTypesTab
      savedFilter={savedVisibilityContractTypesFilter ? JSON.parse(savedVisibilityContractTypesFilter) : []}
      allContractTypes={allContractTypes}
      savedVisibility={savedVisibilityContractTypes ? JSON.parse(savedVisibilityContractTypes) : {}}
    />
  );
}
