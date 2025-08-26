'use client';

import { Filter, query, queryPaginated } from '@/app/server/GET/probando';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Cookies from 'js-cookie';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import InfoComponent from '../InfoComponent';
import { MultiSelectCombobox } from '../ui/multi-select-combobox';
import DiagramEmployeeViewCOPI from './DiagramEmployeeViewCOPI';

// Tipo para los filtros
type FilterState = {
  firstname: string;
  lastname: string;
  position: string[];
  workflow: string[];
  costCenter: string[];
  covenant: string[];
  guild: string[];
  category: string[];
  'contractor_employee.contractor_id': string[];
  diagramType: string[];
};

// Tipo para las opciones de los filtros
type FilterOptions = {
  positions: { id: string; name: string | null }[];
  workflows: { id: string; name: string | null }[];
  costCenters: { id: string; name: string | null }[];
  covenants: { id: string; name: string | null }[];
  guilds: { id: string; name: string | null }[];
  categories: {
    id: string;
    name: string | null;
    covenant: {
      name: string | null;
    } | null;
  }[];
  contractors: { id: string; name: string | null }[];
  customers: { id: string; name: string | null }[];
  diagramTypes: { id: string; name: string | null }[];
};

const fetchData = async ({
  filters,
  page,
  pageSize,
}: {
  filters: Filter<'employees'>[];
  page: number;
  pageSize: number;
}) => {
  const employeesData = await queryPaginated(
    'employees',
    'id, firstname, lastname, document_number,employees_diagram(*,diagram_type(*)),contractor_employee(*,customers(id,name))',
    {
      filters: filters,
      page: page,
      pageSize: 100,
      orderBy: 'lastname',
    }
  );

  return employeesData;
};

const formatEmployees = (employeesData: Awaited<ReturnType<typeof fetchData>>) => {
  return (
    employeesData.data?.map((employee) => ({
      value: employee?.id,
      label: `${employee?.lastname?.charAt(0).toUpperCase()}${employee?.lastname?.slice(1)} ${employee?.firstname?.charAt(0).toUpperCase()}${employee?.firstname?.slice(1)}`,
      diagrams: employee?.employees_diagram,
      contractor_employee: employee?.contractor_employee,
    })) || []
  );
};

export default function EmployesDiagramWrapper() {
  const [diagrams, setDiagrams] = useState([]);
  const router = useRouter();
  const company_id = Cookies.get('actualComp');
  const [employees, setEmployees] = useState<ReturnType<typeof formatEmployees>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMoreData, setHasMoreData] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    firstname: '',
    lastname: '',
    position: [],
    workflow: [],
    costCenter: [],
    covenant: [],
    guild: [],
    category: [],
    'contractor_employee.contractor_id': [],
    diagramType: [],
  });
  const [activeFilters, setActiveFilters] = useState<(keyof FilterState)[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    positions: [],
    workflows: [],
    costCenters: [],
    covenants: [],
    guilds: [],
    categories: [],
    contractors: [],
    customers: [],
    diagramTypes: [],
  });

  // Función para cargar los datos basados en los filtros seleccionados
  const loadData = async (page: number = 1, append: boolean = false) => {
    // Si estamos cargando la primera página, reiniciamos el estado
    if (page === 1 && !append) {
      setEmployees([]);
      setCurrentPage(1);
    }
    // if (!activeFilters.length) {
    //   return;
    // }

    setIsLoading(true);

    try {
      // Construimos los filtros para la función query
      const queryFilters: Filter<'employees'>[] = [
        {
          column: 'is_active',
          operator: 'eq',
          value: true,
        },
      ];

      // Filtro por nombre (firstname)
      if (filters.firstname && filters.firstname.trim() !== '') {
        const searchTerm = filters.firstname.trim();
        queryFilters.push({
          column: 'firstname',
          operator: 'ilike',
          value: `%${searchTerm}%`,
        });
      }

      // Filtro por apellido (lastname)
      if (filters.lastname && filters.lastname.trim() !== '') {
        const searchTerm = filters.lastname.trim();
        queryFilters.push({
          column: 'lastname',
          operator: 'ilike',
          value: `%${searchTerm}%`,
        });
      }

      // Filtros para los demás campos
      if (filters.position && filters.position.length > 0) {
        queryFilters.push({
          column: 'company_position',
          operator: 'in',
          value: filters.position,
        });
      }

      if (filters.workflow && filters.workflow.length > 0) {
        queryFilters.push({
          column: 'workflow_diagram',
          operator: 'in',
          value: filters.workflow,
        });
      }

      if (filters.costCenter && filters.costCenter.length > 0) {
        queryFilters.push({
          column: 'cost_center_id',
          operator: 'in',
          value: filters.costCenter,
        });
      }

      if (filters.covenant && filters.covenant.length > 0) {
        queryFilters.push({
          column: 'covenants_id',
          operator: 'in',
          value: filters.covenant,
        });
      }

      if (filters.guild && filters.guild.length > 0) {
        queryFilters.push({
          column: 'guild_id',
          operator: 'in',
          value: filters.guild,
        });
      }

      if (filters.category && filters.category.length > 0) {
        queryFilters.push({
          column: 'category_id',
          operator: 'in',
          value: filters.category,
        });
      }

      if (filters['contractor_employee.contractor_id'] && filters['contractor_employee.contractor_id'].length > 0) {
        queryFilters.push({
          column: 'contractor_employee.contractor_id',
          operator: 'in',
          value: filters['contractor_employee.contractor_id'],
        });
        // Excluir empleados sin relación contractor_employee
        queryFilters.push({
          column: 'contractor_employee',
          operator: 'not.is',
          value: null,
        });
      }

      // Filtro por tipo de diagrama
      if (filters.diagramType && filters.diagramType.length > 0) {
        // Verificar si se seleccionó la opción "Sin diagramas"
        if (filters.diagramType.includes('sin_diagrama')) {
          // Si solo está seleccionada la opción "Sin diagramas"
          if (filters.diagramType.length === 1) {
            queryFilters.push({
              column: 'employees_diagram',
              operator: 'is',
              value: null,
            });
          } else {
            // Si está seleccionada "Sin diagramas" junto con otros tipos
            // Filtramos por los tipos de diagrama seleccionados O por empleados sin diagrama
            const diagramTypesWithoutNull = filters.diagramType.filter((type) => type !== 'sin_diagrama');

            // Aquí no podemos usar directamente los operadores OR en la API de filtros
            // Esta es una solución temporal, podría requerir una consulta SQL personalizada
            // para manejar correctamente esta condición OR
            queryFilters.push({
              column: 'employees_diagram.diagram_type.id',
              operator: 'in',
              value: diagramTypesWithoutNull,
            });
          }
        } else {
          // Solo tipos de diagrama seleccionados (sin incluir "Sin diagramas")
          queryFilters.push({
            column: 'employees_diagram.diagram_type.id',
            operator: 'in',
            value: filters.diagramType,
          });
          // Asegurarse que employees_diagram no es null
          queryFilters.push({
            column: 'employees_diagram',
            operator: 'not.is',
            value: null,
          });
        }
      }

      // Ejecutar la consulta con los filtros construidos
      // @ts-ignore - Ignoramos errores temporalmente mientras resolvemos tipados
      const employeesData = await fetchData({ filters: queryFilters, page: page, pageSize: 100 });

      // Verificar si hay más páginas disponibles
      const totalCount = employeesData.pagination?.total || 0;
      const loadedCount = (page - 1) * 100 + (employeesData.data?.length || 0);
      setHasMoreData(loadedCount < totalCount);

      // if (employeesData.error) {
      //   console.error('Error al buscar empleados:', employeesData.error);
      //   return;
      // }

      // Formato para mostrar en el componente
      const formattedEmployees = formatEmployees(employeesData);

      if (append) {
        setEmployees((prevEmployees) => [...prevEmployees, ...formattedEmployees]);
      } else {
        setEmployees(formattedEmployees);
      }
      router.refresh();
    } catch (error) {
      console.error('Error al cargar datos:', error);
      await loadData(1, false);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar opciones para los filtros
  const loadFilterOptions = async () => {
    try {
      // Gremios - usando la función query
      const guildsData = await query('guild', 'id, name', [], {
        orderBy: 'name',
      });

      // Categorías
      const categoriesData = await query(
        'category',
        'id, name,covenant(name)',
        [{ column: 'is_active', value: true }],
        {
          orderBy: 'name',
        }
      );

      // Posiciones
      const positionsData = await query('company_positions', 'id, name', [], {
        orderBy: 'name',
      });

      // Flujos de trabajo
      const workflowsData = await query('work_diagram', 'id, name', [], {
        orderBy: 'name',
      });

      // Centros de costo
      const costCentersData = await query('cost_center', 'id, name', [], {
        orderBy: 'name',
      });

      // Contratos
      const covenantsData = await query('covenant', 'id, name', [], {
        orderBy: 'name',
      });

      // Contratistas
      const customersData = await query('customers', 'id, name', [], {
        orderBy: 'name',
      });

      // Contratistas
      const contractorsData = await query('contractors', 'id, name', [], {
        orderBy: 'name',
      });

      // Tipos de diagrama
      const diagramTypesData = await query('diagram_type', 'id, name', [{ column: 'company_id', value: company_id }], {
        orderBy: 'name',
      });

      setFilterOptions({
        guilds: guildsData || [],
        categories: categoriesData || [],
        positions: positionsData || [],
        workflows: workflowsData || [],
        costCenters: costCentersData || [],
        covenants: covenantsData || [],
        contractors: contractorsData || [],
        customers: customersData || [],
        diagramTypes: diagramTypesData || [],
      });
    } catch (error) {
      console.error('Error al cargar opciones de filtros:', error);
    }
  };

  useEffect(() => {
    loadFilterOptions();
    // Al montar el componente, reiniciamos el estado de paginación
    setCurrentPage(1);
    setHasMoreData(false);
  }, []);

  // Función que maneja cambios en campos de texto (string)
  const handleFilterChange = (name: 'firstname' | 'lastname', value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));

    if (value && value !== '' && !activeFilters.includes(name)) {
      setActiveFilters((prev) => [...prev, name]);
    } else if ((!value || value === '') && activeFilters.includes(name)) {
      setActiveFilters((prev) => prev.filter((filter) => filter !== name));
    }
  };

  // Función que maneja cambios en multi-select (string[])
  const handleMultiFilterChange = (name: Exclude<keyof FilterState, 'firstname' | 'lastname'>, values: string[]) => {
    setFilters((prev) => ({ ...prev, [name]: values }));

    if (values && values.length > 0 && !activeFilters.includes(name)) {
      setActiveFilters((prev) => [...prev, name]);
    } else if ((!values || values.length === 0) && activeFilters.includes(name)) {
      setActiveFilters((prev) => prev.filter((filter) => filter !== name));
    }
  };

  // Función para borrar un filtro específico
  const clearFilter = (name: keyof FilterState) => {
    // Restaurar el valor según el tipo de filtro
    if (name === 'firstname' || name === 'lastname') {
      setFilters((prev) => ({ ...prev, [name]: '' }));
    } else {
      setFilters((prev) => ({ ...prev, [name]: [] }));
    }

    // Remover de los filtros activos
    if (activeFilters.includes(name)) {
      setActiveFilters(activeFilters.filter((filter) => filter !== name));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    setHasSearched(true);
    loadData(1, false);
  };

  // Función para cargar más datos
  const loadMoreData = async () => {
    if (isLoadingMore || !hasMoreData) return;

    setIsLoadingMore(true);
    try {
      await loadData(currentPage + 1, true);
      setCurrentPage((prev) => prev + 1);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Función para cargar los diagramas de un conjunto de empleados
  // const loadDiagrams = async (employees: any[]) => {
  //   try {
  //     const diagramsData = [];

  //     // Consultar diagramas por lotes para mejor rendimiento
  //     for (const employee of employees) {
  //       try {
  //         // @ts-ignore - Ignoramos errores temporalmente mientras resolvemos tipados
  //         const employeeDiagrams = await query('employees_diagram', '*, diagram_type(*)', [
  //           {
  //             column: 'employee_id',
  //             value: employee?.id,
  //           },
  //         ]);

  //         if (employeeDiagrams && employeeDiagrams.length > 0) {
  //           diagramsData.push(...employeeDiagrams);
  //         }
  //       } catch (err) {
  //         console.error(`Error al obtener diagramas para empleado ${employee?.id}:`, err);
  //       }
  //     }

  //     setDiagrams(diagramsData);
  //   } catch (error) {
  //     console.error('Error al cargar diagramas:', error);
  //   }
  // };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buscador de diagramas de empleados</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Filtro por nombre */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstname">Nombre</Label>
                  <div className="relative">
                    <Input
                      placeholder="Buscar por nombre"
                      value={filters.firstname}
                      onChange={(e) => handleFilterChange('firstname', e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    {filters.firstname && (
                      <button
                        type="button"
                        onClick={() => clearFilter('firstname')}
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-black text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="lastname">Apellido</Label>
                  <div className="relative">
                    <Input
                      placeholder="Buscar por apellido"
                      value={filters.lastname}
                      onChange={(e) => handleFilterChange('lastname', e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    {filters.lastname && (
                      <button
                        type="button"
                        onClick={() => clearFilter('lastname')}
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-black text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filtro por puesto en la empresa */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="position">Puesto en la empresa</Label>
                  {filters.position && filters.position.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearFilter('position')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={filterOptions.positions.map((position) => ({
                    label: position.name || 'Sin nombre',
                    value: position.id,
                  }))}
                  placeholder="Seleccionar puestos"
                  emptyMessage="No hay puestos"
                  selectedValues={filters.position}
                  onChange={(values) => handleMultiFilterChange('position', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por diagrama de trabajo */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="workflow">Diagrama de trabajo</Label>
                  {filters.workflow && filters.workflow.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearFilter('workflow')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={filterOptions.workflows.map((workflow) => ({
                    label: workflow.name || 'Sin nombre',
                    value: workflow.id,
                  }))}
                  placeholder="Seleccionar diagramas"
                  emptyMessage="No hay diagramas"
                  selectedValues={filters.workflow}
                  onChange={(values) => handleMultiFilterChange('workflow', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por centro de costos */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="costCenter">Centro de costos</Label>
                  {filters.costCenter && filters.costCenter.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearFilter('costCenter')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={filterOptions.costCenters.map((costCenter) => ({
                    label: costCenter.name || 'Sin nombre',
                    value: costCenter.id,
                  }))}
                  placeholder="Seleccionar centros de costos"
                  emptyMessage="No hay centros de costos"
                  selectedValues={filters.costCenter}
                  onChange={(values) => handleMultiFilterChange('costCenter', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por convenio */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="covenant">Convenio</Label>
                  {filters.covenant && filters.covenant.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearFilter('covenant')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={filterOptions.covenants.map((covenant) => ({
                    label: covenant.name || 'Sin nombre',
                    value: covenant.id,
                  }))}
                  placeholder="Seleccionar convenios"
                  emptyMessage="No hay convenios"
                  selectedValues={filters.covenant}
                  onChange={(values) => handleMultiFilterChange('covenant', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por gremio */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="guild">Gremio</Label>
                  {filters.guild && filters.guild.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearFilter('guild')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={filterOptions.guilds.map((guild) => ({
                    label: guild.name || 'Sin nombre',
                    value: guild.id,
                  }))}
                  placeholder="Seleccionar gremios"
                  emptyMessage="No hay gremios"
                  selectedValues={filters.guild}
                  onChange={(values) => handleMultiFilterChange('guild', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por categoría */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="category">Categoría</Label>
                  {filters.category && filters.category.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearFilter('category')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={filterOptions.categories.map((category) => ({
                    label: category.name + ' - ' + category.covenant?.name || 'Sin nombre',
                    value: category.id,
                  }))}
                  placeholder="Seleccionar categorías"
                  emptyMessage="No hay categorías"
                  selectedValues={filters.category}
                  onChange={(values) => handleMultiFilterChange('category', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por contratista */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="customer">Contratista</Label>
                  {filters['contractor_employee.contractor_id'] &&
                    filters['contractor_employee.contractor_id'].length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearFilter('contractor_employee.contractor_id')}
                        className="text-muted-foreground hover:text-black text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                </div>
                <MultiSelectCombobox
                  options={filterOptions.contractors.map((contractor) => ({
                    label: contractor.name || 'Sin nombre',
                    value: contractor.id,
                  }))}
                  placeholder="Seleccionar contratistas"
                  emptyMessage="No hay contratistas"
                  selectedValues={filters['contractor_employee.contractor_id']}
                  onChange={(values) => handleMultiFilterChange('contractor_employee.contractor_id', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por tipos de diagrama */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="diagramType">Tipo de Diagrama</Label>
                  {filters.diagramType && filters.diagramType.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearFilter('diagramType')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={[
                    // Opción especial para "Sin diagramas"
                    { label: 'Sin diagramas asignados', value: 'sin_diagrama' },
                    // Opciones desde la base de datos
                    ...filterOptions.diagramTypes.map((type) => ({
                      label: type.name || 'Sin nombre',
                      value: type.id,
                    })),
                  ]}
                  placeholder="Seleccionar tipos de diagrama"
                  emptyMessage="No hay tipos de diagrama"
                  selectedValues={filters.diagramType}
                  onChange={(values) => handleMultiFilterChange('diagramType', values)}
                  showSelectAll
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Buscando...' : 'Buscar diagramas'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading && !isLoadingMore ? (
        <div className="flex justify-center items-center p-10">
          <p className="text-lg">Buscando diagramas de empleados...</p>
        </div>
      ) : employees.length > 0 ? (
        <>
          {/* Mensaje informativo sobre datos adicionales */}
          {hasMoreData && (
            <div className="flex justify-center mb-2">
              <InfoComponent
                size="sm"
                message="Hay más registros disponibles. Al final de la página encontrará la opción para cargar más datos."
              />
            </div>
          )}

          <DiagramEmployeeViewCOPI employeesData={employees} />

          {/* Botón de cargar más */}
          {hasMoreData && (
            <div className="flex justify-center mt-4 mb-8">
              <Button onClick={loadMoreData} disabled={isLoadingMore} variant="outline" className="px-8">
                {isLoadingMore ? 'Cargando más empleados...' : 'Cargar más empleados'}
              </Button>
            </div>
          )}
        </>
      ) : hasSearched && employees.length === 0 ? (
        <div className="p-6  rounded-lg border text-center">
          <p>No se encontraron diagramas para los empleados seleccionados.</p>
        </div>
      ) : (
        <div className="p-6  rounded-lg border text-center">
          <p>Para mostrar diagramas debe aplicar al menos un filtro.</p>
        </div>
      )}
    </div>
  );
}
