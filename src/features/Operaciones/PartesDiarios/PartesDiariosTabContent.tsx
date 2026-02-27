import { Card, CardContent } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { checkPermissionServer, getUserPermissionsMapServer } from '@/features/Permissions';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { Suspense } from 'react';
import DayliReportForm from './components/DayliReportForm';
import { DailyReportList } from './list/DailyReportList';
import { DailyReportTableSkeleton } from './list/fallback/DailyReportTableSkeleton';

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  searchParams?: DataTableSearchParams;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function PartesDiariosTabContent({ searchParams = {} }: Props) {
  const [canCreate, permissionsMap] = await Promise.all([
    checkPermissionServer('operaciones', 'dailyreportstable', 'create'),
    getUserPermissionsMapServer(),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <ResizablePanelGroup direction="horizontal">
          {canCreate && (
            <>
              <ResizablePanel id="daily-report-form" defaultSize="25%" minSize="15%" maxSize="40%">
                <div className="p-4">
                  <DayliReportForm />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          <ResizablePanel id="daily-report-table" defaultSize="75%">
            <div className="p-4">
              <Suspense fallback={<DailyReportTableSkeleton />}>
                <DailyReportList searchParams={searchParams} permissionsMap={permissionsMap} />
              </Suspense>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </CardContent>
    </Card>
  );
}
