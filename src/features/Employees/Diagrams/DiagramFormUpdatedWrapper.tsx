import { Card } from '@/components/ui/card';
import { fetchDiagramsTypes } from '@/features/Employees/Diagrams/actions/queries.server';
import DiagramFormUpdated from './DiagramFormUpdated';

export default async function DiagramFormUpdatedWrapper({ defaultId }: { defaultId?: string }) {
  const diagrams_types = await fetchDiagramsTypes();

  return (
    <Card className="p-6">
      <DiagramFormUpdated diagrams_types={diagrams_types} defaultId={defaultId} />
    </Card>
  );
}
