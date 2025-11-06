import DocumentNav from '@/components/DocumentNav';
import ViewcomponentInternal, { ViewDataObj } from '@/components/ViewComponentInternal';
import { MonthlyEquipmentDocumentsWrapper } from '@/features/Equipos/DocumentosEquipos';
import { PermanentEquipmentDocumentsWrapper } from '@/features/Equipos/DocumentosEquipos/Permanents';

export default function EquipmentTabs({ subtab, tabValue, path }: { subtab?: string; tabValue: string; path: string }) {
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
          component: <PermanentEquipmentDocumentsWrapper />,
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
          // buttonAction: (
          //   <div className="flex gap-4 flex-wrap">
          //     <DocumentNav onlyEquipment />
          //   </div>
          // ),
          component: <MonthlyEquipmentDocumentsWrapper />,
        },
      },
    ],
  };
  return (
    <ViewcomponentInternal currentMainTab={tabValue} viewData={viewData} />
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
