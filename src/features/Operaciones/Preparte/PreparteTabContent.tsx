import { Card } from '@/components/ui/card';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { PreparteList } from './list/PreparteList';

interface Props {
  searchParams: DataTableSearchParams;
  permissionsMap: Record<string, boolean>;
}

export default function PreparteTabContent({ searchParams, permissionsMap }: Props) {
  return (
    <Card className="flex w-full gap-4 p-6">
      <PreparteList searchParams={searchParams} permissionsMap={permissionsMap} />
    </Card>
  );
}
