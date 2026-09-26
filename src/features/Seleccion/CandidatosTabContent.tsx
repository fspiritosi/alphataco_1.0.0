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

interface CandidatosTabContentProps {
  searchParams: DataTableSearchParams;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function CandidatosTabContent({ searchParams }: CandidatosTabContentProps) {
  const [canView, permissionsMap] = await Promise.all([
    checkPermissionServer('seleccion', 'candidatos', 'view'),
    getUserPermissionsMapServer(),
  ]);

  if (!canView) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">No tenés permiso para ver esta información.</div>
    );
  }

  // Ojo: la clave se arma a mano y TypeScript no la verifica. Si el modulo o la tab se
  // renombran, esto pasa a ser `undefined` y el boton desaparece sin que nada falle.
  const canCreate = permissionsMap['seleccion:candidatos:create'] === true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {canCreate && (
          <Button asChild variant="brand" size="sm">
            <Link href="/dashboard/recruitment/detail?action=new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Candidato
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
