import CardInfo from '@/shared/components/cards/CardInfo';
import { getAbsenteeismSummary } from '../actions.server';

function getTodayLabel(date = new Date()) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(date);
}

export async function SummaryCards() {
  const data = await getAbsenteeismSummary();
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">Medición del día de hoy: {getTodayLabel()}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <CardInfo title="Dotación Día Anterior" value={data?.dotacionAnterior ?? '-'} />
        <CardInfo title="Altas" value={data?.altas ?? '-'} valueClassname="text-emerald-600" />
        <CardInfo title="Bajas" value={data?.bajas ?? '-'} valueClassname="text-red-500" />
        <CardInfo title="Total Ausentes" value={data?.totalAusentes ?? '-'} valueClassname="text-amber-600" />
        <CardInfo title="Dotación Actual" value={data?.dotacionActual ?? '-'} />
        <CardInfo
          title="% Ausentismo Diario"
          value={data ? `${data.porcentajeAusentismo}%` : '-'}
          valueClassname="text-amber-600"
        />
      </div>
    </div>
  );
}
