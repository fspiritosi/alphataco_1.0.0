import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import Viewcomponent from '@/components/ViewComponent';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { getDailyReportsForCurrentMonth } from '@/features/Operaciones/PartesDiarios/actions/actions';
import DayliReportForm from '@/features/Operaciones/PartesDiarios/components/DayliReportForm';
import DailyReportTable from '@/features/Operaciones/PartesDiarios/DailyReportTable';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Operaciones | ${companyName}`,
      description: `Página de peraciones de ${companyName} con información general, comercial, HR y equipos`,
    };
  } else {
    const companyName = await getCompanyName();
    if (companyName) {
      return {
        title: `Operaciones | ${companyName.company_name}`,
        description: `Página de peraciones de ${companyName.company_name} con información general, comercial, HR y equipos`,
      };
    }
  }
}

async function OperationsPage() {
  const cookiesStore = cookies();
  const dailyReportTableSavedColumns = cookiesStore.get('dailyReportTable')?.value;
  const dailyReportTableSavedFilter = cookiesStore.get('dailyReportTable-filters')?.value;
  const dailyReports = await getDailyReportsForCurrentMonth();
  const viewData = {
    defaultValue: 'dailyReportsTable',
    path: '/dashboard/operations',
    tabsValues: [
      {
        value: 'dailyReportsTable',
        name: 'Partes diarios',
        restricted: [''],
        content: {
          title: 'Ver partes diarios',
          description: 'Aquí encontrarás todos los partes diarios diarios',
          buttonActioRestricted: [''],
          // buttonAction: <Create />,
          component: (
            <div className="flex flex-col gap-4">
              {/* <Create /> */}
              {/* <ViewDailysReports /> */}
              <div className="flex gap-4">
                <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
                  <ResizablePanel defaultSize={25} className="p-4">
                    <DayliReportForm />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={75} className="p-4">
                    <DailyReportTable
                      savedVisibility={dailyReportTableSavedColumns ? JSON.parse(dailyReportTableSavedColumns) : {}}
                      savedFilter={dailyReportTableSavedFilter ? JSON.parse(dailyReportTableSavedFilter) : []}
                      dailyReports={dailyReports}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          ),
        },
      },
      // {
      //   value: 'dailyReportsDetailTable',
      //   name: 'Detalle de Partes diarios',
      //   restricted: [''],
      //   content: {
      //     title: 'Ver detalle de partes diarios',
      //     description: 'Aquí encontrarás todos los detalles de los partes diarios',
      //     buttonActioRestricted: [''],
      //     buttonAction: '',
      //     component: <DailyReportDetail />,
      //   },
      // },
      // {
      //   value: 'dailyReports',
      //   name: 'Crear parte diario',
      //   restricted: [''],
      //   content: {
      //     title: 'Crear parte diario',
      //     description: 'Aquí se crean los partes diarios',
      //     buttonActioRestricted: [''],
      //     buttonAction: (''),
      //     component: <DailyReport />,
      //   },
      // },
    ],
  };

  return (
    <div className="h-full">
      <Viewcomponent viewData={viewData} />
    </div>
  );
}

export default OperationsPage;
