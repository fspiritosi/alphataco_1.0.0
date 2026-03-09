import moment from 'moment';
import { cookies } from 'next/headers';
import { getAllPositions, getDiagramIndicators, getEmployeeIndicators } from '../actions/actions.server';
import { RrhhSectionClient } from './RrhhSectionClient';

export async function RrhhSection() {
  const cookiesStore = await cookies();
  const positionFilter = cookiesStore.get('position-filter')?.value;
  const positionIds = positionFilter ? positionFilter.split(',').filter(Boolean) : undefined;
  const initialFilterValues = positionIds ?? [];

  // async-parallel — only fetch indicator data for SSR; detail data loads lazily in dialog
  const [employeeIndicator, diagramData, positions] = await Promise.all([
    getEmployeeIndicators(positionIds),
    getDiagramIndicators(positionIds),
    getAllPositions(),
  ]);

  const date = moment().format('DD/MM/YYYY');

  // server-serialization — pre-compute values, minimize props to client
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
      positionIds={positionIds}
      positions={positions.map((p) => ({ label: p.name ?? '', value: p.id }))}
      initialFilterValues={initialFilterValues}
    />
  );
}
