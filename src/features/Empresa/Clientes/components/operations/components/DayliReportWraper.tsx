'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import {
  getFilterOptions,
  getFilteredDailyReportRows,
  getServicesByCustomer,
  type Service,
} from '@/features/Empresa/Clientes/components/operations/actions/actions';
import ComercialReportTable from '@/features/Empresa/Clientes/components/operations/components/ComercialReportTable';
import { DataTableDatePicker } from '@/shared/components/data-table/filters/data-table-date-picker';
import { Filter, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface ReportFilters {
  customer?: string[];
  service?: string[];
  status?: string[];
  employee?: string[];
  equipment?: string[];
  item?: string[];
  dateFrom?: Date | null;
  dateTo?: Date | null;
}

interface FilterOption {
  id: string;
  name: string;
  customer_id?: string;
  cuit?: string;
}

interface ItemFilterOption {
  id: string;
  name: string;
  customer_service_id: string;
}

interface FilterOptions {
  customers: FilterOption[];
  services: FilterOption[];
  employees: FilterOption[];
  equipment: FilterOption[];
  items: ItemFilterOption[];
}

export default function DailyReportWrapper() {
  const [filters, setFilters] = useState<ReportFilters>({
    customer: [],
    service: [],
    status: [],
    employee: [],
    equipment: [],
    item: [],
    dateFrom: null,
    dateTo: null,
  });
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    customers: [],
    services: [],
    employees: [],
    equipment: [],
    items: [],
  });

  // Load filter options on component mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions({
          customers: options.customers,
          services: options.services,
          employees: options.employees,
          equipment: options.equipment || [],
          items: options.items || [],
        });
      } catch (error) {
        console.error('Error loading filter options:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar las opciones de filtro',
        });
      }
    };

    loadFilterOptions();
  }, []);

  // Handle multi-select changes
  const handleMultiSelectChange = useCallback((key: keyof ReportFilters, values: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
  }, []);

  // Load services for selected customers
  const loadServices = useCallback(async (customerIds: string[]) => {
    try {
      let services: Service[] = [];

      if (customerIds.length > 0) {
        // Get services for all selected customers
        const servicesPromises = customerIds.map((id) => getServicesByCustomer(id));
        const servicesArrays = await Promise.all(servicesPromises);
        services = servicesArrays.flat();
      } else {
        // If no customers selected, show all services
        const options = await getFilterOptions();
        services = options.services || [];
      }

      // Fallback: if no services found for given customers, show all services
      if (!services.length) {
        const options = await getFilterOptions();
        services = options.services || [];
      }

      setFilterOptions((prev) => ({
        ...prev,
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          customer_id: s.customer_id,
        })),
      }));
    } catch (error) {
      console.error('Error loading services:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los servicios',
      });
    }
  }, []);

  // Handle customer selection change
  const handleCustomerChange = useCallback(
    (values: string[]) => {
      setFilters((prev) => ({ ...prev, customer: values, service: [], item: [] })); // Reset services and items when customers change

      // Load services for the selected customers
      loadServices(values);
    },
    [loadServices]
  );

  // Handle service selection change: reset items to keep selections valid
  const handleServiceChange = useCallback((values: string[]) => {
    setFilters((prev) => ({ ...prev, service: values, item: [] }));
  }, []);

  // Handle search with current filters
  const handleSearch = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setHasSearched(true);

    try {
      // Convert filters to API format
      const cleanFilters: any = {};

      if (filters.customer?.length) cleanFilters.customer = filters.customer.join(',');
      if (filters.service?.length) cleanFilters.service = filters.service.join(',');
      if (filters.status?.length) cleanFilters.status = filters.status.join(',');
      if (filters.employee?.length) cleanFilters.employee = filters.employee.join(',');
      if (filters.equipment?.length) cleanFilters.equipment = filters.equipment.join(',');
      if (filters.item?.length) cleanFilters.item = filters.item.join(',');

      // Dates -> YYYY-MM-DD
      if (filters.dateFrom instanceof Date) {
        const y = filters.dateFrom.getFullYear();
        const m = String(filters.dateFrom.getMonth() + 1).padStart(2, '0');
        const d = String(filters.dateFrom.getDate()).padStart(2, '0');
        cleanFilters.dateFrom = `${y}-${m}-${d}`;
      }
      if (filters.dateTo instanceof Date) {
        const y = filters.dateTo.getFullYear();
        const m = String(filters.dateTo.getMonth() + 1).padStart(2, '0');
        const d = String(filters.dateTo.getDate()).padStart(2, '0');
        cleanFilters.dateTo = `${y}-${m}-${d}`;
      }

      const filteredData = await getFilteredDailyReportRows(cleanFilters);
      setTableData(filteredData || []);
    } catch (error) {
      console.error('Error searching reports:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los reportes',
      });
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [filters, loading]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      customer: [],
      service: [],
      status: [],
      employee: [],
      equipment: [],
      item: [],
      dateFrom: null,
      dateTo: null,
    });
    setTableData([]);
    setHasSearched(false);
  }, []);

  // Check if there are any active filters
  const hasActiveFilters = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  // Prepare options for the MultiSelectCombobox components
  const customerOptions = useMemo(
    () =>
      filterOptions.customers.map((customer) => ({
        label: customer.name,
        value: customer.id,
        cuit: customer.cuit,
      })),
    [filterOptions.customers]
  );

  const serviceOptions = useMemo(
    () =>
      filterOptions.services.map((service) => ({
        label: service.name,
        value: service.id,
      })),
    [filterOptions.services]
  );

  const statusOptions = useMemo(
    () => [
      { label: 'Pendiente', value: 'pendiente' },
      { label: 'Sin recursos asignados', value: 'sin_recursos_asignados' },
      { label: 'Ejecutado', value: 'ejecutado' },
      { label: 'Reprogramado', value: 'reprogramado' },
      { label: 'Cancelado', value: 'cancelado' },
    ],
    []
  );

  const employeeOptions = useMemo(
    () =>
      filterOptions.employees.map((employee) => ({
        label: employee.name,
        value: employee.id,
      })),
    [filterOptions.employees]
  );

  const equipmentOptions = useMemo(
    () =>
      (filterOptions.equipment || []).map((eq) => ({
        label: eq.name,
        value: eq.id,
      })),
    [filterOptions.equipment]
  );

  const itemOptions = useMemo(() => {
    const allItems = filterOptions.items || [];
    const selectedServices = filters.service || [];

    // Debug: verify selected services and available items
    console.debug('[DailyReportWrapper] selectedServices:', selectedServices);
    console.debug('[DailyReportWrapper] allItems count:', allItems.length);

    // If no services selected, return empty options (combobox stays disabled too)
    if (!selectedServices.length) return [] as { label: string; value: string }[];

    const filtered = allItems.filter((it) => selectedServices.includes(it.customer_service_id));
    console.debug('[DailyReportWrapper] filtered itemOptions count:', filtered.length);

    return filtered.map((it) => ({ label: it.name, value: it.id }));
  }, [filterOptions.items, filters.service]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Accordion type="single" collapsible defaultValue="filters">
            <AccordionItem value="filters">
              <AccordionTrigger>
                <div className="flex items-center">
                  <Filter className="mr-2 h-5 w-5" />
                  <span className="text-xl font-semibold">Filtros de Reportes</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {/* Header clear button removed to avoid duplication. Use bottom 'Limpiar' next to 'Buscar'. */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Customer Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Cliente</label>
                    <MultiSelectCombobox
                      options={customerOptions}
                      placeholder="Seleccionar clientes"
                      emptyMessage="No se encontraron clientes"
                      selectedValues={filters.customer || []}
                      onChange={handleCustomerChange}
                      maxSelections={null}
                    />
                  </div>

                  {/* Service Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Servicio</label>
                    <MultiSelectCombobox
                      options={serviceOptions}
                      placeholder={
                        filters.customer?.length ? 'Seleccionar servicios' : 'Seleccione al menos un cliente'
                      }
                      emptyMessage="No se encontraron servicios"
                      selectedValues={filters.service || []}
                      onChange={handleServiceChange}
                      disabled={!filters.customer?.length}
                      maxSelections={null}
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Estado</label>
                    <MultiSelectCombobox
                      options={statusOptions}
                      placeholder="Seleccionar estados"
                      emptyMessage="No se encontraron estados"
                      selectedValues={filters.status || []}
                      onChange={(values) => handleMultiSelectChange('status', values)}
                      maxSelections={null}
                    />
                  </div>

                  {/* Employee Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Empleado</label>
                    <MultiSelectCombobox
                      options={employeeOptions}
                      placeholder="Seleccionar empleados"
                      emptyMessage="No se encontraron empleados"
                      selectedValues={filters.employee || []}
                      onChange={(values) => handleMultiSelectChange('employee', values)}
                      maxSelections={null}
                    />
                  </div>

                  {/* Equipment Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Equipo</label>
                    <MultiSelectCombobox
                      options={equipmentOptions}
                      placeholder="Seleccionar equipos"
                      emptyMessage="No se encontraron equipos"
                      selectedValues={filters.equipment || []}
                      onChange={(values) => handleMultiSelectChange('equipment', values)}
                      maxSelections={null}
                    />
                  </div>

                  {/* Item Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Ítem</label>
                    <MultiSelectCombobox
                      options={itemOptions}
                      placeholder="Seleccionar ítems"
                      emptyMessage="No se encontraron ítems"
                      selectedValues={filters.item || []}
                      onChange={(values) => handleMultiSelectChange('item', values)}
                      maxSelections={null}
                      disabled={!((filters.service && filters.service.length) || 0)}
                    />
                  </div>

                  {/* Date From Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha Desde</label>
                    <DataTableDatePicker
                      date={filters.dateFrom ?? null}
                      setDate={(date) => setFilters((prev) => ({ ...prev, dateFrom: date }))}
                      label="Desde"
                      clearFilter={() => setFilters((prev) => ({ ...prev, dateFrom: null }))}
                    />
                  </div>

                  {/* Date To Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha Hasta</label>
                    <DataTableDatePicker
                      date={filters.dateTo ?? null}
                      setDate={(date) => setFilters((prev) => ({ ...prev, dateTo: date }))}
                      label="Hasta"
                      clearFilter={() => setFilters((prev) => ({ ...prev, dateTo: null }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4 space-x-2">
                  <Button variant="outline" onClick={handleClearFilters} disabled={!hasActiveFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpiar
                  </Button>
                  <Button onClick={handleSearch} disabled={loading}>
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar
                      </>
                    )}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : hasSearched ? (
            tableData.length > 0 ? (
              <ComercialReportTable dailyReports={tableData} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No se encontraron resultados para los filtros seleccionados.</p>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Utilice los filtros para buscar reportes.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
