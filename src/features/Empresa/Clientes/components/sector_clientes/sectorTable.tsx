'use client';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { fechAllCustomers, fetchAllContractorSectorBySectorIds, fetchAllSectors } from '../../actions/create';

interface SectorTableProp {
  customers: Awaited<ReturnType<typeof fechAllCustomers>>;
  sectors: Awaited<ReturnType<typeof fetchAllSectors>>;
  contractorSectors: Awaited<ReturnType<typeof fetchAllContractorSectorBySectorIds>>;
  selectedSector: SectorTableProp['contractorSectors'][number] | null;
  setSelectedSector: (sector: SectorTableProp['contractorSectors'][number] | null) => void;
  setMode: (mode: 'create' | 'edit') => void;
  mode: 'create' | 'edit';
}

export function getCustomerEquipmentColums(
  handleEdit: (sector: SectorTableProp['contractorSectors'][number]) => void,
  canEdit: boolean
): ColumnDef<SectorTableProp['contractorSectors'][number]>[] {
  const columns: ColumnDef<SectorTableProp['contractorSectors'][number]>[] = [
    {
      accessorKey: 'sectors.name',
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
      accessorKey: 'sectors.descripcion_corta',
      id: 'Descripción',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
  ];

  if (canEdit) {
    columns.push({
      accessorKey: 'actions',
      id: 'Acciones',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => {
        const handleSelectSector = () => {
          handleEdit(row.original);
        };
        return (
          <Button size="sm" variant="link" className="hover:text-blue-400" onClick={handleSelectSector}>
            Editar
          </Button>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    });
  }

  return columns;
}

function SectorTable({
  customers,
  contractorSectors,
  sectors,
  selectedSector,
  setSelectedSector,
  setMode,
  mode,
}: SectorTableProp) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('comercial', 'sector', 'update');

  const handleEdit = (sector: SectorTableProp['contractorSectors'][number]) => {
    setSelectedSector(sector);
    setMode('edit');
  };

  const cookies = Cookies.get('comercial-sector-table');
  const savedVisibility = cookies ? JSON.parse(cookies) : {};
  const savedFilter = Cookies.get('comercial-sector-table-filters');

  const names = createFilterOptions(contractorSectors, (sector) => sector.sectors?.name);
  const clients = createFilterOptions(contractorSectors, (sector) => sector.customers?.name);

  return (
    <div className="p-4 pt-0">
      <h2 className="text-xl font-bold mb-4">Sectores </h2>
      <BaseDataTable
        columns={getCustomerEquipmentColums(handleEdit, canEdit)}
        data={contractorSectors}
        savedVisibility={savedVisibility}
        tableId="comercial-sector-table"
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
          ],
        }}
      />
    </div>
    // <div className="ml-4 space-y-4">
    //   <h2 className="text-xl font-bold">Sectores</h2>

    //   {/* Filtros */}
    //   <div className="flex flex-col sm:flex-row gap-4">
    //     <Input
    //       type="search"
    //       placeholder="Buscar por nombre"
    //       value={filterByName}
    //       onChange={(e) => setFilterByName(e.target.value)}
    //       className="w-[200px]"
    //     />

    //     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
    //       <Select value={selectedClient} onValueChange={setSelectedClient}>
    //         <SelectTrigger>
    //           <SelectValue placeholder="Filtrar por cliente" />
    //         </SelectTrigger>
    //         <SelectContent>
    //           <SelectItem value="todos">Todos los clientes</SelectItem>
    //           {uniqueClients.map((cliente) => (
    //             <SelectItem key={cliente.id} value={cliente.name}>
    //               {cliente.name}
    //             </SelectItem>
    //           ))}
    //         </SelectContent>
    //       </Select>

    //       <Select value={selectedSectorFilter} onValueChange={setSelectedSectorFilter}>
    //         <SelectTrigger>
    //           <SelectValue placeholder="Filtrar por sector" />
    //         </SelectTrigger>
    //         <SelectContent>
    //           <SelectItem value="todos">Todos los sectores</SelectItem>
    //           {uniqueSectors.map((sector) => (
    //             <SelectItem key={sector} value={sector}>
    //               {sector}
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
    //           <TableHead>Nombre</TableHead>
    //           <TableHead>Cliente</TableHead>
    //           <TableHead>Descripción</TableHead>
    //           <TableHead>Acciones</TableHead>
    //         </TableRow>
    //       </TableHeader>
    //       <TableBody>
    //         {currentItems?.length > 0 ? (
    //           currentItems.map((sector) => (
    //             <TableRow key={sector.id}>
    //               <TableCell className="font-medium">{sector.name}</TableCell>
    //               <TableCell>{sector.sector_customer[0]?.customer_id.name}</TableCell>
    //               <TableCell>{sector.descripcion_corta}</TableCell>

    //               <TableCell>
    //                 <Button
    //                   onClick={() => handleEdit(sector)}
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
    //             <TableCell colSpan={5} className="text-center py-4">
    //               No hay áreas disponibles con los filtros seleccionados
    //             </TableCell>
    //           </TableRow>
    //         )}
    //       </TableBody>
    //     </Table>
    //   </div>

    //   {/* Paginación */}
    //   {filteredSectors?.length > itemsPerPage && (
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

export default SectorTable;
