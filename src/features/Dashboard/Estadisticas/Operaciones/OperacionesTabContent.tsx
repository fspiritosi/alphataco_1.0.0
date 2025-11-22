import { ChartBarServiceHistory } from '@/features/Dashboard/Estadisticas/Operaciones/Components/BarServiceHistory';
import { ServicesHistory } from '@/features/Dashboard/Estadisticas/Operaciones/Components/ServicesHistory';
import { getDailyReportsLatest } from '@/features/Operaciones/PartesDiarios/actions/actions';

export default async function OperacionesTabContent() {
  const dailyReports = await getDailyReportsLatest();

  return (
    <section className="md:mx-7 grid grid-cols-1 mt-6 gap-3 mb-4">
      <ServicesHistory dailyReports={dailyReports} />
      <ChartBarServiceHistory dailyReports={dailyReports} />
    </section>
  );
}
