import { ColumnsMonthly } from '@/app/dashboard/columsMonthly';
import { ExpiredDataTable } from '@/app/dashboard/data-table';
import { ExpiredColums } from '@/app/dashboard/pedidos/colums';
import { fetchMonthlyDocumentsByEquipmentId, fetchPermanentDocumentsByEquipmentId } from '@/app/server/GET/actions';
import { PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { formatVehiculesDocuments } from '@/lib/utils';
import { Calendar, FileArchive } from 'lucide-react';
import { Suspense } from 'react';
import DocumentNav from './DocumentNav';

type Props = { id: string; role: string; searchParams?: { [key: string]: string | string[] | undefined } };

export default async function DocumentEquipmentComponent({ id, role, searchParams = {} }: Props) {
  const monthlyDocuments = (await fetchMonthlyDocumentsByEquipmentId(id)).map(formatVehiculesDocuments);
  const permanentDocuments = (await fetchPermanentDocumentsByEquipmentId(id)).map(formatVehiculesDocuments);

  return (
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab="permanentes"
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
          tabSlug: 'docs-equipos-permanentes',
          content: (
            <div>
              <PermissionGuardServer module="documentacion" tab="documentos-de-equipos" action="create">
                <div className="flex gap-4 flex-wrap mb-4">
                  <DocumentNav id_user={id} onlyEquipment onlyNoMultiresource />
                </div>
              </PermissionGuardServer>
              <Suspense fallback={<div>Cargando documentos permanentes...</div>}>
                <ExpiredDataTable
                  data={permanentDocuments}
                  columns={ExpiredColums}
                  vehicles={true}
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
                  localStorageName={'dashboardVehiculosPermanentes'}
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
          tabSlug: 'docs-equipos-mensuales',
          content: (
            <div>
              <PermissionGuardServer module="documentacion" tab="documentos-de-equipos" action="create">
                <div className="flex gap-4 flex-wrap mb-4">
                  <DocumentNav id_user={id} onlyEquipment onlyNoMultiresource />
                </div>
              </PermissionGuardServer>
              <Suspense fallback={<div>Cargando documentos mensuales...</div>}>
                <ExpiredDataTable
                  data={monthlyDocuments}
                  columns={ColumnsMonthly}
                  vehicles={true}
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
                  localStorageName={'dashboardVehiculosMensuales'}
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
