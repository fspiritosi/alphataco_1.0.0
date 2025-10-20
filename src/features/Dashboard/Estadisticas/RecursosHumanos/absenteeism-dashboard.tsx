import { AbsenteeismTrendChart } from './components/AbsenteeismTrendChart';
import { DepartmentAbsenceCharts } from './components/DepartmentAbsenceCharts';
import { DepartmentSummaryTable } from './components/DepartmentSummaryTable';
import { DetailedAbsenceTable } from './components/DetailedAbsenceTable';
import { HeadcountTrendChart } from './components/HeadcountTrendChart';
import { SummaryCards } from './components/SummaryCards';
import { EmployeeAbsenceTable } from './components/employee-absence-table';
import EmployeeDistributionCharts from './components/employee-distribution-charts';

export function AbsenteeismDashboard() {
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <SummaryCards />

      {/* Charts Section */}
      <div className="flex flex-wrap gap-8">
        <div className="w-full lg:w-[calc(50%-1rem)] space-y-8">
          <AbsenteeismTrendChart />
          <DepartmentSummaryTable />
          <EmployeeDistributionCharts />
        </div>
        <div className="w-full lg:w-[calc(50%-1rem)] space-y-8">
          <DepartmentAbsenceCharts />
          <DetailedAbsenceTable />
          <HeadcountTrendChart />
        </div>
      </div>

      {/* Employee Details */}
      <EmployeeAbsenceTable />
    </div>
  );
}
