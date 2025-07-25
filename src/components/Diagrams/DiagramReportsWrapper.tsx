'use client';

import { query } from '@/app/server/GET/probando';

const fetchEmployeesForReports = async () => {
  const response = await query('employees', 'id,cuil,firstname,lastname');
  return response;
};

const fetchNoveltyTypesForReports = async () => {
  const response = await query('diagram_type', 'id,name,color,short_description');
  return response;
};
export type fetchEmployeesForReportsType = Awaited<ReturnType<typeof fetchEmployeesForReports>>;
export type fetchNoveltyTypesForReportsType = Awaited<ReturnType<typeof fetchNoveltyTypesForReports>>;

export async function DiagramReportsWrapper() {
  const employees = await fetchEmployeesForReports();
  const noveltyTypes = await fetchNoveltyTypesForReports();

  // Renderizar la tabla de reportes
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reportes de Diagramas</h2>
        <p className="text-muted-foreground">Consulta y analiza los datos de novedades diarias de los empleados.</p>
      </div>

      {/* <DiagramReportsTable
        employees={employees} 
        noveltyTypes={noveltyTypes} 
        /> */}
    </div>
  );
}
