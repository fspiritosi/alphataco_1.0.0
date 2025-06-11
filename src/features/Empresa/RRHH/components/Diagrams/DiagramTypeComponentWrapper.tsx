import { fetchDiagramsTypes } from '@/app/server/GET/actions';
import DiagramTypeComponent from '@/components/Diagrams/DiagramTypeComponent';
import { fetchAllWorkDiagrams } from '@/features/Empresa/RRHH/components/rrhh/actions/actions';
import { cookies } from 'next/headers';

export default async function DiagramTypeComponentWrapper() {
  const cookiesStore = cookies();

  // Fetch data
  const diagrams_types = await fetchDiagramsTypes();

  // Get cookies
  const tipesNovelties = cookiesStore.get('novelty-types-table-empresa')?.value;
  const savedFilterNovelties = cookiesStore.get('novelty-types-table-empresa-filters')?.value;
  //Stash
  // const cookiesStore = cookies();
  // const diagrams_types = await fetchDiagramsTypes();
  // console.log(diagrams_types);
  // const allContractTypes = await fetchAllContractTypes();
  // console.log(allContractTypes);
  const diagrams = await fetchAllWorkDiagrams();
  // console.log(diagrams);
  // const savedVisibilityDiagramTypes = cookiesStore.get('diagram-table-empresa')?.value;
  // const savedFilterDiagramTypes = cookiesStore.get('diagram-table-empresa-filters')?.value;

  // const savedVisibilityContractTypes = cookiesStore.get('contract-type-table')?.value;
  // const savedVisibilityContractTypesFilter = cookiesStore.get('contract-type-table-filters')?.v
  return (
    <DiagramTypeComponent
      savedFilters={savedFilterNovelties ? JSON.parse(savedFilterNovelties) : []}
      diagrams_types={diagrams_types}
      savedVisibility={tipesNovelties ? JSON.parse(tipesNovelties) : {}}
    />
  );
}
