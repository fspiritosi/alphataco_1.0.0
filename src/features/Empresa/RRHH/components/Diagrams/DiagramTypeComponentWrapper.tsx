import { fetchDiagramsTypes } from '@/app/server/GET/actions';
import DiagramTypeComponent from '@/components/Diagrams/DiagramTypeComponent';
import { cookies } from 'next/headers';

export default async function DiagramTypeComponentWrapper() {
  const cookiesStore = await cookies();

  // Fetch data
  const diagrams_types = await fetchDiagramsTypes();

  // Get cookies
  const tipesNovelties = cookiesStore.get('novelty-types-table-empresa')?.value;
  const savedFilterNovelties = cookiesStore.get('novelty-types-table-empresa-filters')?.value;

  return (
    <DiagramTypeComponent
      savedFilters={savedFilterNovelties ? JSON.parse(savedFilterNovelties) : []}
      diagrams_types={diagrams_types}
      savedVisibility={tipesNovelties ? JSON.parse(tipesNovelties) : {}}
    />
  );
}
