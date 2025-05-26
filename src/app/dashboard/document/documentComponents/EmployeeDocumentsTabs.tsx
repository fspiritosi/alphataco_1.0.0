import { fetchEmployeeMonthlyDocuments, fetchEmployeePermanentDocuments } from '@/app/server/GET/actions';
import DocumentNav from '@/components/DocumentNav';
import ViewcomponentInternal from '@/components/ViewComponentInternal';
import MonthlyDocuments from '@/features/Employees/Empleados/DocumentosEmpleados/MonthlyDocuments';
import PermanentDocuments from '@/features/Employees/Empleados/DocumentosEmpleados/PermanentDocuments';
import { formatEmployeeDocuments } from '@/lib/utils';
import { cookies } from 'next/headers';

async function EmployeeDocumentsTabs({ tabValue, subtab, path }: { tabValue: string; subtab?: string; path: string }) {
  const monthlyDocuments = (await fetchEmployeeMonthlyDocuments()).map(formatEmployeeDocuments);
  const permanentDocuments = (await fetchEmployeePermanentDocuments()).map(formatEmployeeDocuments);
  const cookiesStore = cookies();
  const savedVisibilityMonthly = cookiesStore.get(`monthly-documents-employees`)?.value;
  const savedVisibilityPermanent = cookiesStore.get(`permanent-documents-employees`)?.value;
  const savedFiltersMonthly = cookiesStore.get(`monthly-documents-employees-filters`)?.value;
  const savedFiltersPermanent = cookiesStore.get(`permanent-documents-employees-filters`)?.value;
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
            <>
              {/* <ExpiredDataTable
                data={permanentDocuments || []}
                columns={ExpiredColums}
                pending={true}
                defaultVisibleColumnsCustom={['resource', 'documentName', 'validity', 'id', 'mandatory', 'state']}
                localStorageName={'dashboardEmployeesPermanentes'}
                permanent
              /> */}
              <PermanentDocuments
                permanentDocuments={permanentDocuments}
                savedVisibility={savedVisibilityPermanent ? JSON.parse(savedVisibilityPermanent) : undefined}
                savedFilters={savedFiltersPermanent ? JSON.parse(savedFiltersPermanent) : []}
              />
            </>
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
            <>
              {/* <ExpiredDataTable
                data={monthlyDocuments || []}
                columns={ColumnsMonthly}
                pending={true}
                defaultVisibleColumnsCustom={['resource', 'documentName', 'validity', 'id', 'mandatory', 'state']}
                localStorageName={'dashboardEmployeesMensuales'}
                monthly
              /> */}
              <MonthlyDocuments
                monthlyDocuments={monthlyDocuments}
                savedVisibility={savedVisibilityMonthly ? JSON.parse(savedVisibilityMonthly) : undefined}
                savedFilters={savedFiltersMonthly ? JSON.parse(savedFiltersMonthly) : []}
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
