import DocumentNav from '@/components/DocumentNav';
import ViewcomponentInternal from '@/components/ViewComponentInternal';
import MonthlyDocuments from '@/features/Employees/Empleados/DocumentosEmpleados/MonthlyDocuments';
import PermanentDocuments from '@/features/Employees/Empleados/DocumentosEmpleados/PermanentDocuments';
import { Suspense } from 'react';

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
              <DocumentNav onlyEmployees />
            </div>
          ),
          component: (
            <Suspense fallback={<div>Loading...</div>}>
              <PermanentDocuments />
            </Suspense>
          ),
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
              <DocumentNav onlyEmployees />
            </div>
          ),
          component: (
            <Suspense fallback={<div>Loading...</div>}>
              <MonthlyDocuments />
            </Suspense>
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
