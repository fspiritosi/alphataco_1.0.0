import {
  fetchEmployeeMonthlyDocumentsByEmployeeId,
  fetchEmployeePermanentDocumentsByEmployeeId,
} from '@/app/server/GET/actions';
import DocumentNav from '@/components/DocumentNav';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuardServer, getUserPermissionsMapServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { formatEmployeeDocuments } from '@/lib/utils';
import { Calendar, FileArchive } from 'lucide-react';
import { Suspense } from 'react';
import { ColumnsMonthly } from '../columsMonthly';
import { ExpiredDataTable } from '../data-table';
import { ExpiredColums } from '../pedidos/colums';

type Props = { employee_id: string; role?: string; searchParams?: { [key: string]: string | string[] | undefined } };

export default async function DocumentTable({ employee_id, role, searchParams = {} }: Props) {
  // const { allDocumentsToShow } = useLoggedUserStore();
  const monthlyDocuments = (await fetchEmployeeMonthlyDocumentsByEmployeeId(employee_id)).map(formatEmployeeDocuments);

  const permanentDocuments = (await fetchEmployeePermanentDocumentsByEmployeeId(employee_id)).map(
    formatEmployeeDocuments
  );

  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab="permanentes"
      permissions={permissions}
      tabs={[
        {
          value: 'permanentes',
          label: (
            <span className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" />
              Documentos Permanentes
            </span>
          ),
          moduleSlug: 'documentacion',
          tabSlug: 'docs-empleados-permanentes',
          content: (
            <div>
              <PermissionGuardServer module="documentacion" tab="documentos-de-empleados" action="create">
                <div className="flex gap-4 flex-wrap mb-4">
                  <DocumentNav id_user={employee_id} onlyEmployees onlyNoMultiresource />
                </div>
              </PermissionGuardServer>
              <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
                <ExpiredDataTable
                  data={permanentDocuments}
                  columns={ExpiredColums}
                  pending={true}
                  defaultVisibleColumnsCustom={[
                    'date',
                    'resource',
                    'documentName',
                    'validity',
                    'id',
                    'mandatory',
                    'state',
                  ]}
                  localStorageName={'dashboardEmployeesPermanentes'}
                  permanent
                />
              </Suspense>
            </div>
          ),
        },
        {
          value: 'mensuales',
          label: (
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Documentos Mensuales
            </span>
          ),
          moduleSlug: 'documentacion',
          tabSlug: 'docs-empleados-mensuales',
          content: (
            <div>
              <PermissionGuardServer module="documentacion" tab="documentos-de-empleados" action="create">
                <div className="flex gap-4 flex-wrap mb-4">
                  <DocumentNav id_user={employee_id} onlyEmployees onlyNoMultiresource />
                </div>
              </PermissionGuardServer>
              <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
                <ExpiredDataTable
                  data={monthlyDocuments}
                  columns={ColumnsMonthly}
                  pending={true}
                  defaultVisibleColumnsCustom={[
                    'date',
                    'resource',
                    'documentName',
                    'validity',
                    'id',
                    'mandatory',
                    'state',
                  ]}
                  localStorageName={'dashboardEmployeesMensuales'}
                  monthly
                />
              </Suspense>
            </div>
          ),
        },
      ]}
    />
  );
}
