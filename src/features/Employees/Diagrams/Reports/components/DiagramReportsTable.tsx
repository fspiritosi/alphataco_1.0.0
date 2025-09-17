import { cookies } from 'next/headers';
import { fetchEmployeesDiagramData } from '../lib/actions/report-actions';
import TableReportDiagram from './TableReportDiagram';

async function DiagramReportsTableComponent() {
  const cookieStore = cookies();
  const savedFilters = cookieStore.get('diagramReportsTable-filters')?.value;
  const savedVisibility = cookieStore.get('diagramReportsTable')?.value;

  const initialData = await fetchEmployeesDiagramData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
    server: true,
  });

  console.log(initialData);

  return (
    <TableReportDiagram
      initialData={initialData}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
    />
  );
}

export default DiagramReportsTableComponent;
