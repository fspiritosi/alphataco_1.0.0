import { fetchDiagramsTypes } from '@/app/server/GET/actions';
import { cookies } from 'next/headers';
import { fetchAllWorkDiagrams } from '../../actions/rrhh/actions';
import DiagramTypesTab from '../diagramTypesTab';

export default async function DiagramTypesTabWrapper() {
  const cookiesStore = cookies();

  // Fetch data
  const diagrams_types = await fetchDiagramsTypes();
  const diagrams = await fetchAllWorkDiagrams();

  // Get cookies
  const savedVisibilityDiagramTypes = cookiesStore.get('diagram-table-empresa')?.value;
  const savedFilterDiagramTypes = cookiesStore.get('diagram-table-empresa-filters')?.value;

  return (
    <DiagramTypesTab
      savedFilter={savedFilterDiagramTypes ? JSON.parse(savedFilterDiagramTypes) : []}
      data={diagrams}
      diagrams_types={diagrams_types}
      savedVisibility={savedVisibilityDiagramTypes ? JSON.parse(savedVisibilityDiagramTypes) : {}}
    />
  );
}
