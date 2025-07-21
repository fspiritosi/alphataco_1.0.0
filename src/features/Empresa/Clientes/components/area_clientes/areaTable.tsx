'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { fetchAreasWithProvinces } from '../../actions/create';

export interface AreaTableProp {
  areas: Awaited<ReturnType<typeof fetchAreasWithProvinces>>;
  selectedArea: AreaTableProp['areas'][number] | null;
  setSelectedArea: (area: AreaTableProp['areas'][number] | null) => void;
  setMode: (mode: 'create' | 'edit') => void;
  mode: 'create' | 'edit';
  savedFilters: string[];
}

export function getAreaColums(
  handleEdit: (sector: AreaTableProp['areas'][number]) => void
): ColumnDef<AreaTableProp['areas']>[] {
  return [
    {
      accessorKey: 'nombre',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'cliente',
      id: 'Cliente',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'descripcion_corta',
      id: 'Descripción',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'provincias',
      id: 'Provincias',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Provincias" />,
      cell: ({ row }) => {
        const provinces: string[] = row.getValue('Provincias');
        if (!provinces || provinces.length === 0) return null;
        const [first, ...rest] = provinces;
        if (rest.length === 0) {
          return <Badge variant="default">{first}</Badge>;
        }
        return (
          <>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="default" className="cursor-pointer select-none">
                    {first} +{rest.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col gap-1">
                    {rest.map((prov) => (
                      <p key={prov}>{prov}</p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.getValue(id) || [];
        // Aseguramos que ambos sean arrays
        if (!Array.isArray(rowValues) || !Array.isArray(value)) return false;
        // ¿Algún elemento de value está en rowValues?
        return value.some((val) => rowValues.includes(val));
      },
    },
    {
      accessorKey: 'actions',
      id: 'Acciones',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => {
        const handleSelectArea = () => {
          handleEdit((row.original as any).area_full);
        };
        return (
          <Button size="sm" variant="link" className="hover:text-blue-400" onClick={handleSelectArea}>
            Editar
          </Button>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
  ];
}
// [
//   {
//       id: 'nombre',
//       header: 'Nombre',
//       cell: ({ row }) => row.getValue('nombre'),
//   },
//   {
//       id: 'cliente',
//       header: 'Cliente',
//       cell: ({ row }) => row.getValue('cliente'),
//   },
//   {
//       id: 'descripcion_corta',
//       header: 'Descripción',
//       cell: ({ row }) => row.getValue('descripcion_corta'),
//   },
//   {
//       id: 'provincias',
//       header: 'Provincias',
//       cell: ({ row }) => row.getValue('provincias'),
//   },
//   {
//       id: 'actions',
//       header: 'Acciones',
//       cell: ({ row }) => row.getValue('actions'),
//   },
// ]

function AreaTable({ areas, savedFilters, selectedArea, setSelectedArea, setMode, mode }: AreaTableProp) {
  // Leer las cookies necesarias
  const visibilityCookie = Cookies.get('areaTable');
  const filtersCookie = Cookies.get('areaTable-filters');

  const handleEdit = (area: AreaTableProp['areas'][number]) => {
    setSelectedArea(area);
    setMode('edit');
  };

  // Inicializar la visibilidad y los filtros desde las cookies
  const savedVisibility = visibilityCookie ? JSON.parse(visibilityCookie) : {};
  const savedFiltersFromCookie = filtersCookie ? JSON.parse(filtersCookie) : savedFilters || [];
  const formattedAreas: any = areas.map((area) => {
    return {
      id: area.id,
      nombre: area.nombre,
      descripcion_corta: area.descripcion_corta || '',
      cliente: area.customers?.name || '',
      provincias: area.area_province.map((area_province) => {
        return area_province.provinces?.name || '';
      }),
      area_full: area,
    };
  });

  const names = createFilterOptions(areas, (area) => area.nombre);
  const clients = createFilterOptions(areas, (area) => area.customers?.name || '');
  const allProvinceNames = areas
    .flatMap((area) => area.area_province.map((ap) => ap.provinces?.name || ''))
    .filter(Boolean);
  const provinces = createFilterOptions(allProvinceNames, (name) => name);

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <h2 className="text-xl font-bold ">Areas</h2>

      <BaseDataTable
        columns={getAreaColums(handleEdit)}
        data={formattedAreas}
        savedVisibility={savedVisibility}
        tableId="areaTable"
        toolbarOptions={{
          initialVisibleFilters: savedFiltersFromCookie,
          filterableColumns: [
            {
              columnId: 'Nombre',
              title: 'Nombre',
              options: names,
            },
            {
              columnId: 'Cliente',
              title: 'Cliente',
              options: clients,
            },
            {
              columnId: 'Provincias',
              title: 'Provincias',
              options: provinces,
            },
          ],
        }}
      />
    </div>
  );
}

export default AreaTable;
