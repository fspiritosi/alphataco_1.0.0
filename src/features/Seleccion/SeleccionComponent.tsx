import { getUserPermissionsMapServer } from '@/features/Permissions';
import { SectionManagerServer } from '@/features/TabsManager';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { UserSearch } from 'lucide-react';
import CandidatosTabContent from './CandidatosTabContent';

/**
 * Módulo Selección.
 *
 * Era la tab "Candidatos" de Empleados. Salió a módulo propio porque no es otra vista del
 * legajo: es el circuito de incorporación, con su máquina de estados (`lib/state-machine.ts`),
 * su checklist de documentación y la aprobación de gerencia que recién al final crea el legajo.
 */
export default async function SeleccionComponent({ searchParams }: { searchParams: DataTableSearchParams }) {
  const permissions = await getUserPermissionsMapServer();

  return (
    <SectionManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="candidatos"
      permissions={permissions}
      tabs={[
        {
          value: 'candidatos',
          label: (
            <span className="flex items-center gap-2">
              <UserSearch className="h-4 w-4" />
              Candidatos
            </span>
          ),
          moduleSlug: 'seleccion',
          tabSlug: 'candidatos',
          content: <CandidatosTabContent searchParams={searchParams} />,
        },
      ]}
    />
  );
}
