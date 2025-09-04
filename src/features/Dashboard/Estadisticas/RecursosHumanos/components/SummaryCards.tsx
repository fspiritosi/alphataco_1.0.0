import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAbsenteeismSummary } from '../actions/actions';

function getTodayLabel(date = new Date()) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(date);
}

export async function SummaryCards() {
  const data: any = await getAbsenteeismSummary({});
  console.log(data, 'getAbsenteeismSummary');
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">Medición del día de hoy: {getTodayLabel()}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dotación Día Anterior</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{data?.dotacionAnterior}</div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Altas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold text-emerald-600">{data.altas}</div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bajas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold text-red-500">{data.bajas}</div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dotación Actual</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{data.dotacionActual}</div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ausentes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold text-amber-600">{data.totalAusentes}</div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Ausentismo Diario</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold text-amber-600">{data.porcentajeAusentismo}%</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
