import { Card } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cookies } from 'next/headers';
import DailyReportTable from './DailyReportTable';
import { getDailyReportsForCurrentMonth } from './actions/actions';
import DayliReportForm from './components/DayliReportForm';

export default async function PartesDiariosTabContent() {
  // Fetching solo cuando este tab está activo
  const cookiesStore = cookies();
  const dailyReportTableSavedColumns = cookiesStore.get('dailyReportTable')?.value;
  const dailyReportTableSavedFilter = cookiesStore.get('dailyReportTable-filters')?.value;
  const dailyReports = await getDailyReportsForCurrentMonth();

  return (
    <Card className="flex flex-col gap-4 p-6">
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
              dailyReports={dailyReports as any}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Card>
  );
}
