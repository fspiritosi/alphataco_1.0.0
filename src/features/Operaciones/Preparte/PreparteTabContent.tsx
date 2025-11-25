import { Card } from '@/components/ui/card';
import { PreparteDetailTableWrapper } from './components/PreparteDetailTableWrapper';

export default function PreparteTabContent() {
  return (
    <Card className="flex w-full gap-4 p-6">
      <PreparteDetailTableWrapper />
    </Card>
  );
}
