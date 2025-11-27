'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import { fechAllCustomers } from '../../actions/create';
import { fetchServiceItems } from '../../actions/items';
import { fetchMeasureUnits } from '../../actions/meassure';
import { fetchServices } from '../../actions/service';
import ServiceItemsForm from './ServiceItemsForm';
interface Item {
  id: string;
  item_name: string;
  item_description: string;
  item_measure_units: { id: string; unit: string };
  item_price: number;
  code_item: string;
  item_number: string;
  is_active: boolean;
  customer_id: { id: string; name: string };
  customer_service_id: { customer_id: { id: string; name: string } };
  company_id: string;
}

interface ServiceItemsTableProps {
  measure_units: Awaited<ReturnType<typeof fetchMeasureUnits>>;
  customers: Awaited<ReturnType<typeof fechAllCustomers>>;
  services: Awaited<ReturnType<typeof fetchServices>>;
  items: Awaited<ReturnType<typeof fetchServiceItems>>;
  company_id: string;
  editService: any;
  customer_service_id?: string;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}

{
  /* <TableHead>Nombre</TableHead>
<TableHead>Estado</TableHead>
<TableHead>Descripción</TableHead>
<TableHead>Codigo</TableHead>
<TableHead>Número</TableHead>
<TableHead>UDM</TableHead>
<TableHead>Precio</TableHead>
<TableHead>Acciones</TableHead> */
}
function getServiceItemsColumns(
  handleEdit: (sector: ServiceItemsTableProps['items'][number]) => void
): ColumnDef<ServiceItemsTableProps['items'][number]>[] {
  return [
    {
      accessorKey: 'item_name',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'is_active',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return <Badge variant={isActive ? 'success' : 'destructive'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id) === true ? 'Activo' : 'Inactivo');
      },
    },
    {
      accessorKey: 'item_description',
      id: 'Descripción',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },

    {
      accessorKey: 'code_item',
      id: 'Codigo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Codigo" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'item_number',
      id: 'Numero',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Numero" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'measure_units.unit',
      id: 'UDM',
      header: ({ column }) => <DataTableColumnHeader column={column} title="UDM" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'item_price',
      id: 'Precio',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Precio" />,
      cell: ({ row }) => {
        const price = row.original.item_price;
        return <div>${price}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'actions',
      id: 'Acciones',
      enableHiding: false,
      enableColumnFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => {
        return (
          <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => handleEdit(row.original)}>
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

export default function ServiceItemsTable({
  measure_units,
  customers,
  services,
  company_id,
  items,
  editService,
  customer_service_id,
  savedFilters,
  savedVisibility,
}: ServiceItemsTableProps) {
  const [editingService, setEditingService] = useState<ServiceItemsTableProps['items'][number] | null>(null);

  const modified_company_id = company_id?.replace(/"/g, '');

  const [filteredItems, setFilteredItems] = useState<ServiceItemsTableProps['items']>([]);
  const [allItems, setAllItems] = useState<ServiceItemsTableProps['items']>([]);
  const [showInactive, setShowInactive] = useState(false);

  // Función para cargar los items del servicio
  const loadItems = useCallback(async () => {
    if (!customer_service_id) return;

    try {
      const serviceItems = await fetchServiceItems(customer_service_id);

      if (serviceItems) {
        // Actualizamos los items locales sin afectar los items que vienen por props
        setFilteredItems(serviceItems);
        setAllItems(serviceItems);
      }
    } catch (err) {
      console.error('Error al cargar los items:', err);
    }
  }, [customer_service_id]);

  // Cargar items cuando cambia el customer_service_id
  useEffect(() => {
    if (customer_service_id) {
      loadItems();
    } else if (items && items.length > 0) {
      // Si no hay customer_service_id pero hay items en props, los usamos
      setFilteredItems(items);
    }
  }, [customer_service_id, items, loadItems]);

  // Función para manejar la actualización después de guardar
  const handleItemSaved = async () => {
    if (customer_service_id) {
      await loadItems();
    }
  };

  const handleSelectItem = (item: ServiceItemsTableProps['items'][number]) => {
    setEditingService(item);
  };
  const handleShowInactive = () => {
    // Guardamos el nuevo estado en una variable para usarlo en la lógica del filtro
    const newShowInactive = !showInactive;
    setShowInactive(newShowInactive);

    // Usamos el nuevo valor para determinar qué elementos mostrar
    if (newShowInactive) {
      // Si newShowInactive es true, mostramos los inactivos
      setFilteredItems(allItems.filter((item) => item.is_active === false));
    } else {
      // Si newShowInactive es false, mostramos todos los activos
      // Aseguramos que mostramos todos los elementos activos
      setFilteredItems(allItems.filter((item) => item.is_active === true));
    }
  };

  const names = createFilterOptions(
    filteredItems,
    (item) => item.item_name
    // FileText // Icono para documentos
  );
  const states = createFilterOptions(
    filteredItems,
    (item) => (item.is_active ? 'Activo' : 'Inactivo')
    // FileText // Icono para documentos
  );
  const codes = createFilterOptions(
    filteredItems,
    (item) => item.code_item
    // FileText // Icono para documentos
  );
  const numbers = createFilterOptions(
    filteredItems,
    (item) => item.item_number
    // FileText // Icono para documentos
  );
  const udm = createFilterOptions(
    filteredItems,
    (item) => item?.measure_units?.unit
    // FileText // Icono para documentos
  );

  return (
    <ResizablePanelGroup className=" flex flex-col gap-2" direction="horizontal">
      <ResizablePanel>
        <Card>
          <ServiceItemsForm
            measure_units={measure_units}
            customers={customers}
            services={services}
            company_id={modified_company_id}
            editingService={editingService}
            editService={editService}
            onSuccess={handleItemSaved}
          />
        </Card>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className=" min-w-[500px] flex flex-col gap-2" defaultSize={75}>
        <Card>
          <div className="flex flex-col p-4">
            <div className="flex space-x-4 justify-end mb-2">
              {/* <VerActivosButton data={items} filterKey="is_active" onFilteredChange={setFilteredItems} /> */}
              <Button variant="gh_orange" onClick={() => handleShowInactive()}>
                {showInactive ? 'Ver Activos' : 'Ver Inactivos'}
              </Button>
            </div>
            <div>
              <BaseDataTable
                columns={getServiceItemsColumns(handleSelectItem)}
                data={filteredItems}
                savedVisibility={savedVisibility || {}}
                tableId="service-items-table"
                toolbarOptions={{
                  filterableColumns: [
                    {
                      columnId: 'Nombre',
                      title: 'Nombre',
                      options: names,
                    },
                    {
                      columnId: 'Estado',
                      title: 'Estado',
                      options: states,
                    },
                    {
                      columnId: 'Codigo',
                      title: 'Codigo',
                      options: codes,
                    },
                    {
                      columnId: 'Numero',
                      title: 'Numero',
                      options: numbers,
                    },
                    {
                      columnId: 'UDM',
                      title: 'UDM',
                      options: udm,
                    },
                  ],
                  initialVisibleFilters: savedFilters || [],
                }}
              />
            </div>
          </div>
        </Card>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
