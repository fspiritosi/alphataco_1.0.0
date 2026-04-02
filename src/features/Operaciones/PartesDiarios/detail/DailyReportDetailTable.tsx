import { Card, CardContent } from '@/components/ui/card';
import { checkPermissionServer } from '@/features/Permissions';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getDailyReportDetailPaginated, getDailyReportHeader } from './actions.server';
import { _DailyReportDetailDataTable } from './components/_DailyReportDetailDataTable';

const TABLE_ID = 'daily-report-detail';

interface Props {
  uuid: string;
  searchParams: DataTableSearchParams;
}

export async function DailyReportDetailTable({ uuid, searchParams }: Props) {
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  const header = await getDailyReportHeader(uuid);
  const rawDate = header?.date ?? new Date();
  // Extraer YYYY-MM-DD sin timezone para evitar desfase de fecha (UTC midnight → día anterior en hora local)
  const reportDate =
    rawDate instanceof Date
      ? `${rawDate.getUTCFullYear()}-${String(rawDate.getUTCMonth() + 1).padStart(2, '0')}-${String(rawDate.getUTCDate()).padStart(2, '0')}`
      : String(rawDate).slice(0, 10);
  const dailyReportStatus = header?.status ?? 'abierto';

  const [{ data, total }, preferences, canUpdate, canDelete] = await Promise.all([
    getDailyReportDetailPaginated(uuid, tableParams, reportDate),
    getTablePreferences(TABLE_ID),
    checkPermissionServer('operaciones', 'detalle-parte-diario', 'update'),
    checkPermissionServer('operaciones', 'detalle-parte-diario', 'delete'),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_DailyReportDetailDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          dailyReportId={uuid}
          reportDate={reportDate}
          dailyReportStatus={dailyReportStatus}
          canUpdate={canUpdate}
          canDelete={canDelete}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
