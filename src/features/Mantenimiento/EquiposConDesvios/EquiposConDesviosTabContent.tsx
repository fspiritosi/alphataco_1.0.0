import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { EquiposConDesviosList } from './EquiposConDesviosList';

interface Props {
  searchParams?: DataTableSearchParams;
}

export async function EquiposConDesviosTabContent({ searchParams = {} }: Props) {
  return <EquiposConDesviosList searchParams={searchParams} />;
}
