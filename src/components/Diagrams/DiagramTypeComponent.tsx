'use client';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { VerActivosButton } from '@/features/Empresa/RRHH/components/verActivosButton';
import { useEffect, useState } from 'react';
import { DiagramNewTypeForm } from './DiagramNewTypeForm';

import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Badge } from '../ui/badge';

export function getDiagramColumns(onEdit: (diagram: DiagramType) => void): ColumnDef<DiagramType>[] {
  return [
    {
      accessorKey: 'name',
      id: 'Nombre',
      // header: () => <span className="w-[200px]">Nombre</span>,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'color',
      id: 'Color',
      header: 'Color',
      cell: ({ row }) => (
        <div
          className="w-10 h-10 flex justify-center items-center rounded-full border"
          style={{ backgroundColor: row.original.color }}
        ></div>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'short_description',
      id: 'Descripción corta',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción corta" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'vista_previa',
      id: 'Vista previa',
      header: 'Vista previa',
      cell: ({ row }) => (
        <div className="w-10 h-10 flex justify-center items-center" style={{ backgroundColor: row.original.color }}>
          {row.original.short_description}
        </div>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'work_active',
      id: 'Lab. Activa',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lab. Activa" />,
      cell: ({ row }) => (
        <Badge variant={row.original.work_active ? 'success' : 'default'}>
          {row.original.work_active ? 'Trabajando' : 'No trabajando'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
      enableSorting: false,
    },
  ];
}

function DiagramTypeComponent({
  diagrams_types,
  savedVisibility,
  savedFilters,
}: {
  diagrams_types: DiagramType[];
  savedVisibility: VisibilityState;
  savedFilters: string[];
}) {
  const [selectDiagramType, setSelectDiagramType] = useState<{}>({});
  const [diagramToEdit, setDiagramToEdit] = useState(false);
  const [filteredData, setFilteredData] = useState<DiagramType[]>([]);

  function setDiagram(data: any) {
    setSelectDiagramType(data);
  }

  function createDataToDownload(data: any) {
    const dataToDownload = data?.map((dato: any) => ({
      nombre: dato.name,
      color: dato.color,
      descCorta: dato.short_description,
      labActivo: dato.work_active ? 'Trabajando' : 'No trabajando',
    }));
    return dataToDownload;
  }

  useEffect(() => {
    if (Object.keys(selectDiagramType || {})?.length === 0) {
      setDiagramToEdit(false);
    } else {
      setDiagramToEdit(true);
    }
  }, [selectDiagramType]);

  const names = createFilterOptions(filteredData, (document) => document.name);
  const descriptionShort = createFilterOptions(filteredData, (document) => document.short_description);

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={40}>
        <DiagramNewTypeForm
          selectedDiagram={selectDiagramType}
          diagramToEdit={diagramToEdit}
          setDiagramToEdit={setDiagramToEdit}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="pl-6 min-w-[600px]" defaultSize={60}>
        <div className="flex justify-between">
          <h2 className="text-xl font-bold">Tipos de Novedades</h2>
          <VerActivosButton data={diagrams_types} filterKey="is_active" onFilteredChange={setFilteredData} />
        </div>

        <BaseDataTable
          className="mt-4"
          columns={getDiagramColumns(setDiagram)}
          data={filteredData}
          savedVisibility={savedVisibility}
          tableId="novelty-types-table-empresa"
          toolbarOptions={{
            initialVisibleFilters: savedFilters || [],
            filterableColumns: [
              {
                columnId: 'Nombre',
                title: 'Nombre',
                options: names,
              },
              {
                columnId: 'Descripción corta',
                title: 'Descripción corta',
                options: descriptionShort,
              },
            ],
          }}
        />
        {/* <BtnXlsDownload fn={createDataToDownload} dataToDownload={diagrams_types} nameFile={'Tipos_de_Diagrama'} /> */}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default DiagramTypeComponent;
