'use client';

import { DayliReportDetailTable } from './DayliReportDetailTable';

interface DayliReportDetailTableWrapperProps {
  dailyReport: any[];
  customers: any[];
  employees: any[];
  equipments: any[];
}

export function DayliReportDetailTableWrapper({
  dailyReport,
  customers,
  employees,
  equipments,
}: DayliReportDetailTableWrapperProps) {
  return (
    <DayliReportDetailTable
      dailyReport={dailyReport}
      customers={customers}
      employeesPromise={Promise.resolve(employees)}
      equipmentsPromise={Promise.resolve(equipments)}
    />
  );
}
