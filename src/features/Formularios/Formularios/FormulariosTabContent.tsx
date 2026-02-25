import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { FormsList } from './FormsList';

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  searchParams: DataTableSearchParams;
  permissionsMap: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function FormulariosTabContent({ searchParams, permissionsMap }: Props) {
  return <FormsList searchParams={searchParams} permissionsMap={permissionsMap} />;
}
