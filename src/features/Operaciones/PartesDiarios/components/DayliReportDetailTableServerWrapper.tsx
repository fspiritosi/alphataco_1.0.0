import { checkPermissionServer } from '@/features/Permissions';
import { cookies } from 'next/headers';
import { getDailyReportById } from '../actions/actions';
import DayliReportDetailTableServer from './DayliReportDetailTableServer';

export default async function DayliReportDetailTableServerWrapper({ params }: { params: { uuid: string } }) {
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get('dailyReportServerTable')?.value;
  const savedFilter = cookiesStore.get('dailyReportServerTable-filters')?.value;

  // Obtener datos del daily report para obtener la fecha
  const dailyReport = await getDailyReportById(params.uuid);
  const reportDate = dailyReport[0]?.date || '';

  // Verificar permiso de editar para mostrar/ocultar columna de checkbox
  const canEdit = await checkPermissionServer('operaciones', 'detalle-parte-diario', 'update');

  // Los datos ahora se cargan client-side con React Query para permitir
  // ordenamiento completo y carga progresiva de relaciones

  return (
    <DayliReportDetailTableServer
      dailyReportId={params.uuid}
      reportDate={reportDate}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilter ? JSON.parse(savedFilter) : []}
      dailyReport={dailyReport}
      canEdit={canEdit}
    />
  );
}
