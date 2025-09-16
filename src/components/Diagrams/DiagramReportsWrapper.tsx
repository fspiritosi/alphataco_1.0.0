import { fetchCompanyPositions } from '@/app/server/GET/actions';
import { query } from '@/app/server/GET/probando';

import DiagramReportsTableComponent from '@/features/Employees/Diagrams/Reports/components/DiagramReportsTable';

const fetchEmployeesForReports = async () => {
  const response = await query('employees', 'id,cuil,firstname,lastname', [
    {
      column: 'is_active',
      operator: 'eq',
      value: true,
    },
  ]);
  return response;
};

const fetchNoveltyTypesForReports = async (company_id: string) => {
  const response = await query('diagram_type', 'id,name,color,short_description', [
    { column: 'company_id', value: company_id },
  ]);
  return response;
};

export type fetchEmployeesForReportsType = Awaited<ReturnType<typeof fetchEmployeesForReports>>;
export type fetchNoveltyTypesForReportsType = Awaited<ReturnType<typeof fetchNoveltyTypesForReports>>;
export type fetchCompanyPositionsForReportsType = Awaited<ReturnType<typeof fetchCompanyPositions>>;

export async function DiagramReportsWrapper() {
  // Renderizar la tabla de reportes
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reportes de Diagramas</h2>
        <p className="text-muted-foreground">Consulta y analiza los datos de novedades diarias de los empleados.</p>
      </div>
      <DiagramReportsTableComponent />
    </div>
  );
}
