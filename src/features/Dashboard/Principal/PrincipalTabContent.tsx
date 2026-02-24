import EmployeeDiagramsDataSection from '@/features/Dashboard/Principal/components/EmployeeDiagramsDataSection';
import EquipmentDataSection from '@/features/Dashboard/Principal/components/EquipmentDataSection';
import { ResourcesOverviewChart } from '@/features/Dashboard/Principal/components/ResourcesOverviewChart';
import { ServicesDistributionSection } from '@/features/Dashboard/Principal/components/ServicesDistributionSection';
import EquipmentChart from '@/features/graficos/equipos/data-indicator- equipos';
import { getServicesSummaryByType } from '@/features/Operaciones/PartesDiarios/actions/actions';
import { fetchAllEmployeesCount, fetchAllVehiclesCount } from '@/shared/actions/employees.actions';

export default async function PrincipalTabContent() {
  const employees = await fetchAllEmployeesCount();
  const equipments = await fetchAllVehiclesCount();
  const servicesSummary = await getServicesSummaryByType();

  return (
    <section className="grid grid-cols-1 xl:grid-cols-4 gap-3 mb-4">
      <section className="flex flex-col gap-4 w-full min-w-0">
        <ResourcesOverviewChart employees={employees} equipments={equipments} />
        <ServicesDistributionSection servicesSummary={servicesSummary} />
      </section>
      <section className="col-span-3 min-w-0">
        <section className="flex flex-col gap-4 w-full">
          <EmployeeDiagramsDataSection />
          <EquipmentChart />
          <EquipmentDataSection />
        </section>
      </section>
    </section>
  );
}
