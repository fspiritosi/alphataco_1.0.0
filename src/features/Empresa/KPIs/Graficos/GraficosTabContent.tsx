import { EmployeeUsageChart } from './components/EmployeeUsageChart';
// import { AbsenteeismChart } from './components/AbsenteeismChart';
// import { AbsenteeismTrendChart } from './components/AbsenteeismTrendChart';
// import { DailyAbsenceTimeseriesChart } from './components/DailyAbsenceTimeseriesChart';
// import { CompanyCountsChart } from './components/CompanyCountsChart';
// import { DiagramDistributionChart } from './components/DiagramDistributionChart';
import { VehicleUsageChart } from './components/VehicleUsageChart';

export default function GraficosTabContent() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <EmployeeUsageChart />
        {/* <AbsenteeismChart /> */}
        {/* <AbsenteeismTrendChart /> */}
        {/* <DailyAbsenceTimeseriesChart /> */}
        {/* <CompanyCountsChart /> */}
        {/* <DiagramDistributionChart /> */}
        <VehicleUsageChart />
      </div>
    </div>
  );
}
