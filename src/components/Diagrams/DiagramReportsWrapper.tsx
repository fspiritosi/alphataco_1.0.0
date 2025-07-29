import { fetchCompanyPositions } from '@/app/server/GET/actions';
import { query } from '@/app/server/GET/probando';
import { cookies } from 'next/headers';
import DiagramReportsTable from './DiagramReportsTable';
import { fetchDiagramReportsData } from './actions/action';

const fetchEmployeesForReports = async () => {
  const response = await query('employees', 'id,cuil,firstname,lastname');
  return response;
};

const fetchNoveltyTypesForReports = async (company_id: string) => {
  const response = await query('diagram_type', 'id,name,color,short_description', [
    { column: 'company_id', value: company_id },
  ]);
  console.log(response, 'response');
  return response;
};

export type fetchEmployeesForReportsType = Awaited<ReturnType<typeof fetchEmployeesForReports>>;
export type fetchNoveltyTypesForReportsType = Awaited<ReturnType<typeof fetchNoveltyTypesForReports>>;
export type fetchCompanyPositionsForReportsType = Awaited<ReturnType<typeof fetchCompanyPositions>>;

export async function DiagramReportsWrapper() {
  // Obtener datos iniciales para la tabla
  const initialData = await fetchDiagramReportsData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  // Obtener opciones para filtros
  const employees = await fetchEmployeesForReports();
  const noveltyTypes = await fetchNoveltyTypesForReports(company_id!);
  const companyPositions = await fetchCompanyPositions();

  console.log(noveltyTypes, 'noveltyTypes');
  const savedFilters = cookieStore.get('diagramReportsTable-filters')?.value;

  // Renderizar la tabla de reportes
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reportes de Diagramas</h2>
        <p className="text-muted-foreground">Consulta y analiza los datos de novedades diarias de los empleados.</p>
      </div>

      <DiagramReportsTable
        initialData={initialData}
        employees={employees}
        noveltyTypes={noveltyTypes}
        companyPositions={companyPositions}
        savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      />
    </div>
  );
}
