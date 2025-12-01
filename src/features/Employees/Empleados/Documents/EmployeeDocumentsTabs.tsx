import DocumentNav from '@/components/DocumentNav';
import ViewcomponentInternal from '@/components/ViewComponentInternal';
import MonthlyDocuments from '@/features/Employees/Empleados/Documents/Monthly/MonthlyDocuments';
import PermanentDocuments from '@/features/Employees/Empleados/Documents/Permanents/PermanentDocuments';
import { PermissionGuardServer } from '@/features/Permissions';

async function EmployeeDocumentsTabs({ tabValue, subtab, path }: { tabValue: string; subtab?: string; path: string }) {
  const viewData = {
    defaultValue: subtab || 'permanentes',
    path: path,
    tabsValues: [
      {
        value: 'permanentes',
        name: 'Documentos permanentes',
        tab: tabValue,
        restricted: [''],
        content: {
          title: 'Documentos permanentes',
          description: 'Documentos permanentes',
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex gap-4 flex-wrap">
              <PermissionGuardServer module="empleados" tab="docs-empleados-permanentes" action="create">
                <DocumentNav onlyEmployees />
              </PermissionGuardServer>
            </div>
          ),
          component: <PermanentDocuments />,
        },
      },
      {
        value: 'mensuales',
        name: 'Documentos mensuales',
        tab: tabValue,
        restricted: [''],
        content: {
          title: 'Documentos mensuales',
          description: 'Documentos mensuales',
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex gap-4 flex-wrap">
              <PermissionGuardServer module="empleados" tab="docs-empleados-mensuales" action="create">
                <DocumentNav onlyEmployees />
              </PermissionGuardServer>
            </div>
          ),
          component: <MonthlyDocuments />,
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
    //       defaultVisibleColumnsCustom={['resource', 'documentName', 'validity', 'id', 'mandatory', 'state']}
    //       localStorageName={'dashboardEmployeesPermanentes'}
    //       permanent
    //     />
    //   </TabsContent>
    //   <TabsContent value="mensuales">
    //     <ExpiredDataTable
    //       data={monthlyDocuments || []}
    //       columns={ColumnsMonthly}
    //       pending={true}
    //       defaultVisibleColumnsCustom={['resource', 'documentName', 'validity', 'id', 'mandatory', 'state']}
    //       localStorageName={'dashboardEmployeesMensuales'}
    //       monthly
    //     />
    //   </TabsContent>
    // </Tabs>
  );
}

export default EmployeeDocumentsTabs;
