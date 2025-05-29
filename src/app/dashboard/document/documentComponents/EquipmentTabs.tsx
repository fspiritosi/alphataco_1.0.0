import { fetchMonthlyDocumentsEquipment, fetchPermanentDocumentsEquipment } from '@/app/server/GET/actions';
import DocumentNav from '@/components/DocumentNav';
import ViewcomponentInternal, { ViewDataObj } from '@/components/ViewComponentInternal';
import MonthlyDocumentsEquipment from '@/features/Equipos/DocumentosEquipos/MonthlyDocuments';
import PermanentDocumentsEquipment from '@/features/Equipos/DocumentosEquipos/PermanentDocuments';
import { formatVehiculesDocuments } from '@/lib/utils';
import { cookies } from 'next/headers';

async function EquipmentTabs({ subtab, tabValue, path }: { subtab?: string; tabValue: string; path: string }) {
  const monthlyDocuments = (await fetchMonthlyDocumentsEquipment()).map(formatVehiculesDocuments);
  const permanentDocuments = (await fetchPermanentDocumentsEquipment()).map(formatVehiculesDocuments);
  const cookiesStore = cookies();
  const savedVisibilityPermanent = cookiesStore.get('permanent-documents-vehicles')?.value;
  const savedVisibilityMonthly = cookiesStore.get('monthly-documents-vehicles')?.value;
  const savedFiltersPermanent = cookiesStore.get('permanent-documents-vehicles-filters')?.value;
  const savedFiltersMonthly = cookiesStore.get('monthly-documents-vehicles-filters')?.value;
  const viewData: ViewDataObj = {
    defaultValue: subtab || 'permanentes',
    path: path,
    tabsValues: [
      {
        value: 'permanentes',
        name: 'Documentos permanentes',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Todos los equipos',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex gap-4 flex-wrap">
              <DocumentNav onlyEquipment />
            </div>
          ),
          component: (
            <>
              {/* <ExpiredDataTable
                data={permanentDocuments || []}
                columns={ExpiredColums}
                pending={true}
                vehicles
                defaultVisibleColumnsCustom={['resource', 'documentName', 'validity', 'id', 'mandatory', 'state']}
                localStorageName={'dashboardVehiculosPermanentes'}
                permanent
              /> */}
              <PermanentDocumentsEquipment
                permanentDocuments={permanentDocuments}
                savedVisibility={savedVisibilityPermanent ? JSON.parse(savedVisibilityPermanent) : undefined}
                savedFilter={savedFiltersPermanent ? JSON.parse(savedFiltersPermanent) : []}
              />
            </>
          ),
        },
      },
      {
        value: 'mensuales',
        name: 'Documentos mensuales',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Solo vehículos',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex gap-4 flex-wrap">
              <DocumentNav onlyEquipment />
            </div>
          ),
          component: (
            <>
              {/* <ExpiredDataTable
                data={monthlyDocuments || []}
                columns={ColumnsMonthly}
                pending={true}
                vehicles
                defaultVisibleColumnsCustom={['resource', 'documentName', 'validity', 'id', 'mandatory', 'state']}
                localStorageName={'dashboardVehiculosMensuales'}
                monthly
              /> */}
              <MonthlyDocumentsEquipment
                monthlyDocuments={monthlyDocuments}
                savedVisibility={savedVisibilityMonthly ? JSON.parse(savedVisibilityMonthly) : undefined}
                savedFilter={savedFiltersMonthly ? JSON.parse(savedFiltersMonthly) : []}
              />
            </>
          ),
        },
      },
    ],
  };
  return (
    <ViewcomponentInternal viewData={viewData} />
    // <Tabs defaultValue="permanentes">
    //   <CardContent>
    //     <TabsList>
    //       <TabsTrigger value="permanentes">Documentos permanentes</TabsTrigger>
    //       <TabsTrigger value="mensuales">Documentos mensuales</TabsTrigger>
    //     </TabsList>
    //   </CardContent>
    //   <TabsContent value="permanentes">
    //     <ExpiredDataTable
    //       data={permanentDocuments || []}
    //       columns={ExpiredColums}
    //       pending={true}
    //       vehicles
    //       defaultVisibleColumnsCustom={['resource', 'documentName', 'validity', 'id', 'mandatory', 'state']}
    //       localStorageName={'dashboardVehiculosPermanentes'}
    //       permanent
    //     />
    //   </TabsContent>
    //   <TabsContent value="mensuales">
    //     <ExpiredDataTable
    //       data={monthlyDocuments || []}
    //       columns={ColumnsMonthly}
    //       pending={true}
    //       vehicles
    //       defaultVisibleColumnsCustom={['resource', 'documentName', 'validity', 'id', 'mandatory', 'state']}
    //       localStorageName={'dashboardVehiculosMensuales'}
    //       monthly
    //     />
    //   </TabsContent>
    // </Tabs>
  );
}

export default EquipmentTabs;
