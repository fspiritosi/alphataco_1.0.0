import { fetchDiagramsTypes } from '@/features/Employees/Diagrams/actions/diagram-queries';
import { cookies } from 'next/headers';
import DiagramTypeComponent from './DiagramTypeComponent';

export default async function DiagramTypeComponentWrapper() {
  const cookieStore = await cookies();
  const diagrams_types = await fetchDiagramsTypes();

  const visibilityState = cookieStore.get('novelty-types-table-empresa')?.value;
  const filtersState = cookieStore.get('novelty-types-table-empresa-filters')?.value;

  return (
    <DiagramTypeComponent
      diagrams_types={diagrams_types}
      savedVisibility={visibilityState ? JSON.parse(visibilityState) : {}}
      savedFilters={filtersState ? JSON.parse(filtersState) : []}
    />
  );
}
