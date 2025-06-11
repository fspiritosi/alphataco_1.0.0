import { fetchAllContractTypes } from '@/features/Empresa/RRHH/actions/actions';
import { cookies } from 'next/headers';
import ContractTypesTab from './ContractTypeTab';

export default async function ContractTypeTabWrapper() {
  const cookiesStore = cookies();

  // Fetch data
  const allContractTypes = await fetchAllContractTypes();

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
