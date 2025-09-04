import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig } from '@/components/ui/chart';
import { getDepartmentAbsenceReasons } from '../actions/actions';
import { DepartmentAbsenceChartsComponent } from './charts/department-absence-charts';

export async function DepartmentAbsenceCharts() {
  const data: any = await getDepartmentAbsenceReasons({});
  console.log(data, 'getDepartmentAbsenceReasons');

  const sanitizeKey = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const reasonNames = Array.from(new Set(data?.flatMap((d: any) => d.data.map((r: any) => r.name))));

  const chartConfig: ChartConfig = {
    value: { label: 'Porcentaje' },
  };

  reasonNames.forEach((name: any, idx) => {
    const key = sanitizeKey(name);
    (chartConfig as any)[key] = {
      label: name,
      color: `hsl(var(--chart-${(idx % 5) + 1}))`,
    };
  });

  return (
    <Card>
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg font-semibold">Motivos de Ausencia por Departamento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.map((dept: any, index: number) => {
            const deptChartData = dept.data.map((r: any) => {
              const key = sanitizeKey(r.name);
              return {
                reason: key,
                value: r.value,
                fill: `var(--color-${key})`,
                label: r.name,
              };
            });

            return (
              <div key={index} className="text-center">
                <h3 className="font-medium text-sm mb-3 text-gray-700">{dept.department}</h3>
                <DepartmentAbsenceChartsComponent chartConfig={chartConfig} deptChartData={deptChartData} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
