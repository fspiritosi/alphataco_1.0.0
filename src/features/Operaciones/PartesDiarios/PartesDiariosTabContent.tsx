import { Card } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { PermissionGuardServer, checkPermissionServer } from '@/features/Permissions';
import { cookies } from 'next/headers';
import DailyReportTable from './DailyReportTable';
import { getDailyReportsForCurrentMonth } from './actions/actions';
import DayliReportForm from './components/DayliReportForm';

export default async function PartesDiariosTabContent() {
  // Fetching solo cuando este tab está activo
  const cookiesStore = await cookies();
  const dailyReportTableSavedColumns = cookiesStore.get('dailyReportTable')?.value;
  const dailyReportTableSavedFilter = cookiesStore.get('dailyReportTable-filters')?.value;
  const dailyReports = await getDailyReportsForCurrentMonth();

  // Verificar permisos
  const canCreate = await checkPermissionServer('operaciones', 'dailyreportstable', 'create');

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex gap-4">
        <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
          <PermissionGuardServer module="operaciones" tab="dailyreportstable" action="create">
            <ResizablePanel defaultSize={40} className="p-4">
              <DayliReportForm />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </PermissionGuardServer>
          <ResizablePanel defaultSize={canCreate ? 60 : 100} className="p-4">
            <DailyReportTable
              savedVisibility={dailyReportTableSavedColumns ? JSON.parse(dailyReportTableSavedColumns) : {}}
              savedFilter={dailyReportTableSavedFilter ? JSON.parse(dailyReportTableSavedFilter) : []}
              dailyReports={dailyReports as any}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Card>
  );
}
