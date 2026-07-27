import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { checkPermissionServer, getUserPermissionsMapServer } from '@/features/Permissions/actionsServer';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';

import { PreEmployeeList } from './components/PreEmployeeList/PreEmployeeList';
import { PreEmployeeTableSkeleton } from './components/PreEmployeeList/fallback/PreEmployeeTableSkeleton';

// ============================================================================
// TYPES
// ============================================================================

interface PreLegajosTabContentProps {
  searchParams: DataTableSearchParams;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function PreLegajosTabContent({ searchParams }: PreLegajosTabContentProps) {
  const [canView, permissionsMap] = await Promise.all([
    checkPermissionServer('empleados', 'pre-legajos', 'view'),
    getUserPermissionsMapServer(),
  ]);

  if (!canView) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">No tenés permiso para ver esta información.</div>
    );
  }

  const canCreate = permissionsMap['empleados:pre-legajos:create'] === true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {canCreate && (
          <Button asChild variant="gh_orange" size="sm">
            <Link href="/dashboard/employee/pre-legajo?action=new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Pre Legajo
            </Link>
          </Button>
        )}
      </div>

      <Suspense fallback={<PreEmployeeTableSkeleton />}>
        <PreEmployeeList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
