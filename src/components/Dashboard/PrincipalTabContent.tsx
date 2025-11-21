import { ResoursesChart } from '@/components/Graficos/ResousrsesChart';
import { ServicesChart } from '@/components/Graficos/ServicesChart';
import DataEquipmentChart from '@/features/graficos/equipos/data-equipos';
import EquipmentChart from '@/features/graficos/equipos/data-indicator- equipos';
import EmpleadoDiagramasChart from '@/features/graficos/rrhh/data-empleado-diagramas';
import { getServicesSummaryByType } from '@/features/Operaciones/PartesDiarios/actions/actions';
import { fetchAllEmployeesCount, fetchAllVehiclesCount } from '@/shared/actions/employees.actions';

export default async function PrincipalTabContent() {
  const employees = await fetchAllEmployeesCount();
  const equipments = await fetchAllVehiclesCount();
  const servicesSummary = await getServicesSummaryByType();

  return (
    <section className="md:mx-7 grid grid-cols-1 mt-6 xl:grid-cols-4 gap-3 mb-4 ">
      <section className="flex flex-col gap-4 w-full">
        <ResoursesChart employees={employees} equipments={equipments} />
        <ServicesChart servicesSummary={servicesSummary} />
      </section>
      <section className="col-span-3">
        <section className="flex flex-col gap-4 w-full">
          <EmpleadoDiagramasChart />
          <EquipmentChart />
          <DataEquipmentChart />
        </section>
      </section>
    </section>
  );
}
