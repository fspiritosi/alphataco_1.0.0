import { fetchAllActivesEmployees, fetchDiagrams, fetchDiagramsTypes } from '@/app/server/GET/actions';
import DiagramFormUpdated from './DiagramFormUpdated';

export default async function DiagramFormUpdatedWrapper({ defaultId }: { defaultId?: string }) {
  // Fetch data
  const employees = await fetchAllActivesEmployees();
  const diagrams = await fetchDiagrams();
  const diagrams_types = await fetchDiagramsTypes();

  return (
    <DiagramFormUpdated
      employees={employees}
      diagrams={diagrams}
      diagrams_types={diagrams_types}
      defaultId={defaultId}
    />
  );
}
