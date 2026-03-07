import moment from 'moment';
import { cookies } from 'next/headers';
import {
  getAllPositions,
  getDiagramIndicators,
  getEmployeeIndicators,
  getEmployeesNotInDailyReport,
} from '../actions/actions.server';
import { RrhhSectionClient } from './RrhhSectionClient';

export async function RrhhSection() {
  const cookiesStore = await cookies();
  const positionFilter = cookiesStore.get('position-filter')?.value;
  const positionIds = positionFilter ? positionFilter.split(',').filter(Boolean) : undefined;
  const initialFilterValues = positionIds ?? [];

  // Promise.all — async-parallel (Vercel best practice)
  const [employeeIndicator, diagramData, employeesNotInReport, positions] = await Promise.all([
    getEmployeeIndicators(positionIds),
    getDiagramIndicators(positionIds),
    getEmployeesNotInDailyReport(positionIds),
    getAllPositions(),
  ]);

  const date = moment().format('DD/MM/YYYY');

  // Pre-compute values on server (server-serialization)
  const operativos = employeeIndicator.employees_operativos;
  const enOperacion = employeeIndicator.employees_used;
  const disponibles = operativos - enOperacion;
  const indicatorPercent = employeeIndicator.indicator;

  return (
    <RrhhSectionClient
      date={date}
      diagramData={diagramData}
      operativos={operativos}
      enOperacion={enOperacion}
      disponibles={disponibles}
      indicatorPercent={indicatorPercent}
      employeesNotInReport={employeesNotInReport}
      positions={positions.map((p) => ({ label: p.name ?? '', value: p.id }))}
      initialFilterValues={initialFilterValues}
    />
  );
}
