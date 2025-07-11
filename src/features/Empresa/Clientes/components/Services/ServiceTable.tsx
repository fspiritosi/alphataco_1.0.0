'use client';
// import Loading from '@/app/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { fechAllCustomers, fetchAllContractorSectorBySectorIds, fetchAreasWithProvinces } from '../../actions/create';
import { fetchServiceItems } from '../../actions/items';
import { fetchMeasureUnits } from '../../actions/meassure';
import { fetchServices } from '../../actions/service';
import ServiceItemsTable from './ServiceItemsTable';
import ServicesForm from './ServicesForm';
import ContractDocuments from './contractDocuments';
interface Service {
  id: string;
  service_name: string;
  service_id: string;
  contract_number: string;
  service_areas?: {
    area_id: string;
    areas_cliente: {
      id: string;
      nombre: string;
      descripcion_corta: string;
    };
  }[];
  service_sectors?: {
    sector_id: string;
    sectors: {
      id: string;
      name: string;
    };
  }[];
  sector_id: string | string[];
  customer_id: string;
  description: string;
  service_price: number;
  service_start: string | Date;
  service_validity: string | Date;
  is_active: boolean;
  area?: string[];
  customer: string;
  sector?: string;
  created_at?: string;
  company_id?: string;
}

type Customer = {
  id: string;
  name: string;
};

interface ServiceTableProps {
  services: Awaited<ReturnType<typeof fetchServices>>;
  customers: Awaited<ReturnType<typeof fechAllCustomers>>;
  areas: Awaited<ReturnType<typeof fetchAreasWithProvinces>>;
  sectors: Awaited<ReturnType<typeof fetchAllContractorSectorBySectorIds>>;
  company_id: string;
  itemsList: Awaited<ReturnType<typeof fetchServiceItems>>;
  measureUnitsList: Awaited<ReturnType<typeof fetchMeasureUnits>>;
  id?: string;
  hideCreateButton?: boolean;
  savedFilter: string[];
  // savedFilters: string[];
  // savedVisibility: VisibilityState;
}

interface ServiceTableItem {
  id: string;
  service_name: string;
  customer_id: string;
  contract_number: string | null;
  service_start: string | Date | null;
  service_validity: string | Date | null;
  is_active: boolean | null;
  service_sectors?: Array<{ sectors: { name: string } }>;
  service_areas?: Array<{ areas_cliente: { nombre: string } }>;
}

export function getServiceColumns(
  handleEdit: (service: ServiceTableItem) => void,
  customers: Customer[]
): ColumnDef<ServiceTableItem>[] {
  return [
    {
      accessorKey: 'service_name',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre del Servicio" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'customer_id',
      id: 'Cliente',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => {
        return customers.find((c) => c.id === row.original.customer_id)?.name || '-';
      },
      filterFn: (row, id, value) => {
        const customerName = customers.find((c) => c.id === row.original.customer_id)?.name || '';
        return value.some((val: string) => customerName.toLowerCase().includes(val.toLowerCase()));
      },
    },
    {
      accessorKey: 'contract_number',
      id: 'Contrato',
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Contrato" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'service_areas',
      id: 'Areas',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Areas" />,
      cell: ({ row }) => {
        const service_areas = row.original.service_areas || [];
        if (service_areas.length === 0) return '-';

        const firstArea = service_areas[0]?.areas_cliente?.nombre || '-';
        const additionalCount = service_areas.length > 1 ? service_areas.length - 1 : 0;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="truncate cursor-pointer">
                  <Badge>
                    {firstArea}
                    {additionalCount > 0 && ` +${additionalCount}`}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col">
                  {service_areas.map((area) => (
                    <span key={area.areas_cliente?.nombre}>{area.areas_cliente?.nombre || '-'}</span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'sectors',
      id: 'Sectores',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sectores" />,
      cell: ({ row }) => {
        const service_sectors = row.original.service_sectors || [];

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="truncate cursor-pointer">
                  <Badge>
                    {service_sectors.length > 0 ? (
                      <>
                        {service_sectors[0]?.sectors?.name || '-'}
                        {service_sectors.length > 1 && ` +${service_sectors.length - 1}`}
                      </>
                    ) : (
                      '-'
                    )}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col">
                  {service_sectors.map((sector: any) => (
                    <span key={sector.sector_id}>{sector.sectors?.name || '-'}</span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'status',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return <Badge variant={isActive ? 'success' : 'destructive'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'service_start',
      id: 'Inicio',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Inicio" />,
      cell: ({ row }) => {
        const date = row.getValue('Inicio');
        return date ? new Date(date as string).toLocaleDateString() : '-';
      },
    },
    {
      accessorKey: 'service_validity',
      id: 'Vencimiento',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Vencimiento" />,
      cell: ({ row }) => {
        const date = row.getValue('Vencimiento');
        return date ? new Date(date as string).toLocaleDateString() : '-';
      },
    },
    // {
    //   accessorKey: 'actions',
    //   id: 'Acciones',
    //   header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
    //   cell: ({ row }) => {
    //     return (
    //       <div className="flex gap-2">
    //         <Button
    //           size="sm"
    //           variant="outline"
    //           onClick={() => handleEdit(row.original)}
    //         >
    //           Editar
    //         </Button>
    //       </div>
    //     );
    //   }
    // }
  ];
}

const dateSchema = z
  .object({
    service_start: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Fecha de inicio no válida',
    }),
    service_validity: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Fecha de validez no válida',
    }),
  })
  .refine((data) => new Date(data.service_start) < new Date(data.service_validity), {
    message: 'La fecha de inicio debe ser menor que la fecha de validez del servicio',
    path: ['service_validity'],
  });

const ServiceTable = ({
  services,
  customers,
  company_id,
  areas,
  sectors,
  id,
  itemsList,
  measureUnitsList,
  hideCreateButton = false,
  savedFilter,
  // savedFilters,
  // savedVisibility,
}: ServiceTableProps) => {
  const savedVisibility = Cookies.get('service-items-table')
    ? JSON.parse(Cookies.get('service-items-table') || '{}')
    : {};
  const savedFilters =
    savedFilter || Cookies.get('servicesTable') ? JSON.parse(Cookies.get('service-items-table-filters') || '[]') : [];
  const [servicesData, setServicesData] = useState<ServiceTableProps['services']>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<ServiceTableProps['services'][number] | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [filteredServices, setFilteredServices] = useState<ServiceTableProps['services']>([]);
  const [editing, setEditing] = useState(false);
  const [internalItemsList, setInternalItemsList] = useState<any[]>([]);
  // const [measureUnitsList, setMeasureUnitsList] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);

  // Filtros para las columnas
  const serviceNameFilter = createFilterOptions(servicesData || [], (service) => service.service_name || '');

  const customerFilter = createFilterOptions(servicesData || [], (service) => service.customers?.name || '');

  const contractNumberFilter = createFilterOptions(servicesData || [], (service) => service.contract_number || '');

  // Filtro para el estado (Activo/Inactivo)
  const statusFilter = [
    { value: 'true', label: 'Activo' },
    { value: 'false', label: 'Inactivo' },
  ];

  // Filtro para sectores (si es necesario)
  const sectorsFilter = createFilterOptions(
    servicesData?.flatMap((service) => service.service_sectors?.map((s) => s.sectors?.name) || []).filter(Boolean) ||
      [],
    (sector) => sector
  );

  // Filtro para áreas (si es necesario)
  const areasFilter = createFilterOptions(
    servicesData
      ?.flatMap((service) => service.service_areas?.map((a) => a.areas_cliente?.nombre) || [])
      .filter(Boolean) || [],
    (area) => area
  );
  useEffect(() => {
    if (id) {
      const service = servicesData?.find((service) => service.id === id);
      setEditingService(service || null);
      setEditing(true);
    } else {
      setEditing(false);
      setEditingService(null);
    }
  }, [id, servicesData]);
  useEffect(() => {
    filterServices();
  }, [selectedCustomer, servicesData, services]);
  const filterItems = () => {
    let filtered = internalItemsList;
    if (selectedCustomer !== 'all') {
      filtered = filtered.filter((item) => item.customer_id.toString() === selectedCustomer);
    }
    if (id) {
      filtered = filtered.filter((item) => item.service_id.toString() === id);
    }
    setFilteredItems(filtered);
  };
  useEffect(() => {
    filterItems();
  }, [selectedCustomer, id, itemsList]);
  const filterServices = (servicesToFilter = services) => {
    let filtered = servicesToFilter;

    if (selectedCustomer !== 'all') {
      filtered = filtered.filter((service) => service.customer_id?.toString() === selectedCustomer);
    }

    setFilteredServices(filtered);
  };

  useEffect(() => {
    setServicesData(services);
    setLoading(false);
  }, [services]);

  const formatedServices = useMemo(() => {
    return filteredServices?.map((service) => ({
      ...service,
      customer: areas.find((area) => area.customers?.id === service.customer_id)?.customers?.name,
      area: areas.find((area) => area.id === service.service_areas?.[0]?.area_id)?.nombre,
      sector: sectors.find((sector) => sector.id === service.service_sectors?.[0]?.sector_id)?.sectors?.name,
    }));
  }, [filteredServices, areas, sectors]);

  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setEditingService(null); // Limpiar el servicio en edición
    setOpen(true);
  };

  const handleOpenDetail = (service: ServiceTableProps['services'][number]) => {
    setEditingService(service);
    setOpenDetail(true);
    //Agregar una query a la url
  };
  // Get customer_service_id from editingService
  const customerServiceId = editingService?.id || '';
  // const savedVisibility = cookies ? JSON.parse(cookies) : {};

  return (
    <div>
      {loading ? (
        // <Loading />
        <p>Cargando...</p>
      ) : (
        <>
          {id !== undefined && (
            <div>
              <ServicesForm
                customers={customers as any}
                editingService={editingService as any}
                company_id={company_id}
                areas={areas}
                sectors={sectors}
                id={id}
              />
            </div>
          )}

          <div>
            <Dialog
              open={open}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setEditingService(null);
                }
                setOpen(isOpen);
              }}
            >
              <DialogTrigger asChild>
                {hideCreateButton && (
                  <Button size="sm" variant="gh_orange" className="mb-4" onClick={handleOpen}>
                    Crear Contrato
                  </Button>
                )}
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogTitle>Crear Contrato</DialogTitle>

                <ServicesForm
                  customers={customers as any}
                  editingService={editingService as any}
                  company_id={company_id}
                  areas={areas}
                  sectors={sectors}
                  setOpen={setOpen}
                />
              </DialogContent>
            </Dialog>

            {openDetail ? (
              <div>
                {/* <div className="flex justify-end space-x-4">
                    <Button onClick={() => setOpenDetail(false)}>Cerrar</Button>
                  </div> */}

                <Tabs defaultValue="detail">
                  <div className="flex justify-between items-center mr-3">
                    <TabsList className="flex gap-1 bg-gh_contrast/50">
                      <TabsTrigger value="detail" className="text-gh_orange font-semibold">
                        Detalle
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="text-gh_orange font-semibold">
                        Documentos
                      </TabsTrigger>
                      <TabsTrigger value="items" className="text-gh_orange font-semibold">
                        Items del Servicio
                      </TabsTrigger>
                    </TabsList>
                    <Button onClick={() => setOpenDetail(false)} className="">
                      Cerrar
                    </Button>
                  </div>
                  <TabsContent value="detail">
                    <ServicesForm
                      editingService={editingService as any}
                      company_id={company_id}
                      areas={areas}
                      sectors={sectors}
                      customers={customers as any}
                      id={editingService?.id}
                    />
                  </TabsContent>
                  <TabsContent value="documents">
                    <ContractDocuments id={editingService?.id as string} />
                  </TabsContent>
                  <TabsContent value="items">
                    <ServiceItemsTable
                      editService={editingService || null}
                      measure_units={measureUnitsList || []}
                      customers={customers || []}
                      services={(services as any) || []}
                      company_id={company_id}
                      customer_service_id={customerServiceId}
                      items={itemsList || []}
                      savedFilters={savedFilters}
                      savedVisibility={savedVisibility}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="w-full overflow-x-auto mt-4">
                <BaseDataTable
                  columns={getServiceColumns((service) => handleOpenDetail(service as any), customers)}
                  data={servicesData as any}
                  tableId="services-table"
                  savedVisibility={savedVisibility}
                  onRowClick={(row) => handleOpenDetail(row as any)}
                  toolbarOptions={{
                    initialVisibleFilters: savedFilters || [],
                    filterableColumns: [
                      {
                        columnId: 'Nombre',
                        title: 'Nombre del Servicio',
                        options: serviceNameFilter,
                      },
                      {
                        columnId: 'Cliente',
                        title: 'Cliente',
                        options: customerFilter,
                      },
                      {
                        columnId: 'Contrato',
                        title: 'Número de Contrato',
                        options: contractNumberFilter,
                      },
                      {
                        columnId: 'Estado',
                        title: 'Estado',
                        options: statusFilter,
                      },
                      {
                        columnId: 'Sectores',
                        title: 'Sectores',
                        options: sectorsFilter,
                      },
                      {
                        columnId: 'Areas',
                        title: 'Areas',
                        options: areasFilter,
                      },
                    ],
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ServiceTable;
