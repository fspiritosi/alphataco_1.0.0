import { fetchDiagramsTypes } from '@/app/server/GET/actions';
import { Card } from '@/components/ui/card';
import DiagramFormUpdated from './DiagramFormUpdated';

export default async function DiagramFormUpdatedWrapper({ defaultId }: { defaultId?: string }) {
  const diagrams_types = await fetchDiagramsTypes();

  return (
    <Card className="p-6">
      <DiagramFormUpdated diagrams_types={diagrams_types} defaultId={defaultId} />
    </Card>
  );
}
