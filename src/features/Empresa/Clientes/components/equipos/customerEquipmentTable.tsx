'use client';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { fechAllCustomers, fetchEquipmentsCustomers } from '../../actions/create';

interface CustomerEquipmentTableProp {
  customerEquipments: Awaited<ReturnType<typeof fetchEquipmentsCustomers>>;
  customers: Awaited<ReturnType<typeof fechAllCustomers>>;
  selectedCustomerEquipment: CustomerEquipmentTableProp['customerEquipments'][number] | null;
  setSelectedCustomerEquipment: (
    customerEquipment: CustomerEquipmentTableProp['customerEquipments'][number] | null
  ) => void;
  setMode: (mode: 'create' | 'edit') => void;
  mode: 'create' | 'edit';
}

export function getCustomerEquipmentColums(
  handleEdit: (sector: CustomerEquipmentTableProp['customerEquipments'][number]) => void
): ColumnDef<CustomerEquipmentTableProp['customerEquipments']>[] {
  return [
    {
      accessorKey: 'name',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'customers.name',
      id: 'Cliente',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'type',
      id: 'Tipo de equipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de equipo" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'actions',
      id: 'Acciones',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => {
        const handleSelectArea = () => {
          handleEdit(row.original as any);
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

function CustomerEquipmentTable({
  customers,
  customerEquipments,
  selectedCustomerEquipment,
  setSelectedCustomerEquipment,
  setMode,
  mode,
}: CustomerEquipmentTableProp) {
  const handleEdit = (customerEquipment: CustomerEquipmentTableProp['customerEquipments'][number]) => {
    setSelectedCustomerEquipment(customerEquipment);
    setMode('edit');
  };
  const cookies = Cookies.get('comercial-equipment-table');
  const savedVisibility = cookies ? JSON.parse(cookies) : {};
  const savedFilter = Cookies.get('comercial-equipment-table-filters');

  const names = createFilterOptions(customerEquipments, (customerEquipment) => customerEquipment.name);
  const clients = createFilterOptions(
    customerEquipments,
    (customerEquipment) => customerEquipment.customers?.name || ''
  );
  const types = createFilterOptions(customerEquipments, (customerEquipment) => customerEquipment.type || '');
  return (
    <div className="p-4 pt-0">
      <h2 className="text-xl font-bold mb-4">Equipos del cliente</h2>
      <BaseDataTable
        columns={getCustomerEquipmentColums(handleEdit)}
        data={customerEquipments as any}
        savedVisibility={savedVisibility}
        tableId="comercial-equipment-table"
        toolbarOptions={{
          initialVisibleFilters: savedFilter ? JSON.parse(savedFilter) : [],
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
              columnId: 'Tipo de equipo',
              title: 'Tipo de equipo',
              options: types,
            },
          ],
        }}
      />
    </div>
    // <div className="ml-4 space-y-4">
    //   <h2 className="text-xl font-bold">Equipos del cliente</h2>

    //   {/* Filtros */}
    //   <div className="flex flex-col sm:flex-row gap-4">
    //     <Input
    //       type="search"
    //       placeholder="Buscar por serial"
    //       value={filterByName}
    //       onChange={(e) => setFilterByName(e.target.value)}
    //       className="w-[200px]"
    //     />

    //     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
    //       <Select value={selectedCustomer} key={selectedCustomer} onValueChange={setSelectedCustomer}>
    //         <SelectTrigger>
    //           <SelectValue placeholder="Filtrar por cliente" />
    //         </SelectTrigger>
    //         <SelectContent>
    //           <SelectItem value="todos">Todos los clientes</SelectItem>
    //           {uniqueCustomers.map((cliente) => (
    //             <SelectItem key={cliente.id} value={cliente.id}>
    //               {cliente.name}
    //             </SelectItem>
    //           ))}
    //         </SelectContent>
    //       </Select>

    //       <Select value={selectedTypes} onValueChange={setSelectedTypes}>
    //         <SelectTrigger>
    //           <SelectValue placeholder="Filtrar por tipo" />
    //         </SelectTrigger>
    //         <SelectContent>
    //           <SelectItem value="todos">Tipos de equipo</SelectItem>
    //           {uniqueTypes.map((tipos) => (
    //             <SelectItem key={tipos} value={tipos}>
    //               {tipos}
    //             </SelectItem>
    //           ))}
    //         </SelectContent>
    //       </Select>
    //     </div>
    //   </div>

    //   {/* Tabla */}
    //   <div>
    //     <Table>
    //       <TableHeader>
    //         <TableRow>
    //           <TableHead>Nombre del equipo</TableHead>
    //           <TableHead>Cliente</TableHead>
    //           <TableHead>Tipo de equipo</TableHead>
    //           <TableHead>Acciones</TableHead>
    //         </TableRow>
    //       </TableHeader>
    //       <TableBody>
    //         {currentItems?.length > 0 ? (
    //           currentItems.map((customerEquipment) => (
    //             <TableRow key={customerEquipment.id}>
    //               <TableCell className="font-medium">{customerEquipment.name}</TableCell>
    //               <TableCell>{customerEquipment.customer_name}</TableCell>
    //               <TableCell>{customerEquipment.type}</TableCell>
    //               <TableCell>
    //                 <Button
    //                   onClick={() => handleEdit(customerEquipment)}
    //                   size="sm"
    //                   variant="ghost"
    //                   //   className="text-blue-600 hover:text-blue-800"
    //                 >
    //                   Editar
    //                 </Button>
    //               </TableCell>
    //             </TableRow>
    //           ))
    //         ) : (
    //           <TableRow>
    //             <TableCell colSpan={7} className="text-center py-4">
    //               No hay equipos disponibles con los filtros seleccionados
    //             </TableCell>
    //           </TableRow>
    //         )}
    //       </TableBody>
    //     </Table>
    //   </div>

    //   {/* Paginación */}
    //   {filteredCustomerEquipments?.length > itemsPerPage && (
    //     <Pagination>
    //       <PaginationContent>
    //         <PaginationItem>
    //           <PaginationPrevious
    //             href="#"
    //             onClick={(e) => {
    //               e.preventDefault();
    //               handlePageChange(currentPage - 1);
    //             }}
    //             className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
    //           />
    //         </PaginationItem>

    //         {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
    //           <PaginationItem key={page}>
    //             <PaginationLink
    //               href="#"
    //               onClick={(e) => {
    //                 e.preventDefault();
    //                 handlePageChange(page);
    //               }}
    //               isActive={page === currentPage}
    //             >
    //               {page}
    //             </PaginationLink>
    //           </PaginationItem>
    //         ))}

    //         <PaginationItem>
    //           <PaginationNext
    //             href="#"
    //             onClick={(e) => {
    //               e.preventDefault();
    //               handlePageChange(currentPage + 1);
    //             }}
    //             className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
    //           />
    //         </PaginationItem>
    //       </PaginationContent>
    //     </Pagination>
    //   )}
    // </div>
  );
}

export default CustomerEquipmentTable;
