'use client';

import { Filter, query, queryPaginated } from '@/app/server/GET/probando';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import InfoComponent from '../InfoComponent';
import DiagramEmployeeViewCOPI from './DiagramEmployeeViewCOPI';

// Tipo para los filtros
type FilterState = {
  firstname: string;
  lastname: string;
  position: string;
  workflow: string;
  costCenter: string;
  covenant: string;
  guild: string;
  category: string;
  'contractor_employee.contractor_id': string;
};

// Tipo para las opciones de los filtros
type FilterOptions = {
  positions: { id: string; name: string | null }[];
  workflows: { id: string; name: string | null }[];
  costCenters: { id: string; name: string | null }[];
  covenants: { id: string; name: string | null }[];
  guilds: { id: string; name: string | null }[];
  categories: { id: string; name: string | null }[];
  customers: { id: string; name: string | null }[];
};

export default function EmployesDiagramWrapper() {
  const [diagrams, setDiagrams] = useState([]);
  const router = useRouter();
  const [employees, setEmployees] = useState<
    {
      value: string;
      label: string;
      diagrams: {
        created_at: string;
        day: number;
        diagram_type: string & {
          color: string;
          company_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string | null;
          short_description: string;
          work_active: boolean | null;
        };
        employee_id: string;
        id: string;
        month: number;
        year: number;
      }[];
      contractor_employee: {
        contractor_id: string | null;
        created_at: string;
        employee_id: string | null;
        id: string;
        customers: {
          id: string;
          name: string;
        } | null;
      }[];
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMoreData, setHasMoreData] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    firstname: '',
    lastname: '',
    position: '',
    workflow: '',
    costCenter: '',
    covenant: '',
    guild: '',
    category: '',
    'contractor_employee.contractor_id': '',
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
    customers: [],
  });

  // Función para cargar los datos basados en los filtros seleccionados
  const loadData = async (page: number = 1, append: boolean = false) => {
    // Si estamos cargando la primera página, reiniciamos el estado
    if (page === 1 && !append) {
      setEmployees([]);
      setCurrentPage(1);
    }
    console.log('activeFilters', activeFilters);
    // if (!activeFilters.length) {
    //   return;
    // }

    setIsLoading(true);

    try {
      // Construimos los filtros para la función query
      const queryFilters: Filter<'employees'>[] = [];

      // Filtro por nombre (firstname)
      if (filters.firstname && filters.firstname.trim() !== '') {
        const searchTerm = filters.firstname.trim();
        console.log('Buscando por nombre:', searchTerm);
        queryFilters.push({
          column: 'firstname',
          operator: 'ilike',
          value: `%${searchTerm}%`,
        });
      }

      // Filtro por apellido (lastname)
      if (filters.lastname && filters.lastname.trim() !== '') {
        const searchTerm = filters.lastname.trim();
        console.log('Buscando por apellido:', searchTerm);
        queryFilters.push({
          column: 'lastname',
          operator: 'ilike',
          value: `%${searchTerm}%`,
        });
      }

      // Filtros para los demás campos
      if (filters.position && filters.position !== '') {
        queryFilters.push({
          column: 'company_position',
          value: filters.position,
        });
      }

      if (filters.workflow && filters.workflow !== '') {
        queryFilters.push({
          column: 'workflow_diagram',
          value: filters.workflow,
        });
      }

      if (filters.costCenter && filters.costCenter !== '') {
        queryFilters.push({
          column: 'cost_center_id',
          value: filters.costCenter,
        });
      }

      if (filters.covenant && filters.covenant !== '' && filters.covenant !== 'all') {
        queryFilters.push({
          column: 'covenants_id',
          value: filters.covenant,
        });
      }

      if (filters.guild && filters.guild !== 'all' && filters.guild !== '') {
        queryFilters.push({
          column: 'guild_id',
          value: filters.guild,
        });
      }

      if (filters.category && filters.category !== 'all' && filters.category !== '') {
        queryFilters.push({
          column: 'category_id',
          value: filters.category,
        });
      }

      if (
        filters['contractor_employee.contractor_id'] &&
        filters['contractor_employee.contractor_id'] !== 'all' &&
        filters['contractor_employee.contractor_id'] !== ''
      ) {
        queryFilters.push({
          column: 'contractor_employee.contractor_id',
          value: filters['contractor_employee.contractor_id'],
        });
        //Ignorar tambien los que tengan null
        queryFilters.push({
          column: 'contractor_employee',
          operator: 'not.is',
          value: null,
        });
      }

      console.log('Filtros aplicados:', queryFilters);
      console.log('Ejecutando consulta de empleados...');

      // Ejecutar la consulta con los filtros construidos
      // @ts-ignore - Ignoramos errores temporalmente mientras resolvemos tipados
      const employeesData = await queryPaginated(
        'employees',
        'id, firstname, lastname, document_number,employees_diagram(*,diagram_type(*)),contractor_employee(*,customers(id,name))',
        {
          filters: queryFilters,
          page: page,
          pageSize: 100,
        }
      );

      console.log('Resultados encontrados:', employeesData.data?.length || 0);
      if (employeesData.data?.length) {
        console.log('Primeros resultados:', employeesData.data.slice(0, 3));
      }

      // Verificar si hay más páginas disponibles
      const totalCount = employeesData.pagination?.total || 0;
      const loadedCount = (page - 1) * 100 + (employeesData.data?.length || 0);
      setHasMoreData(loadedCount < totalCount);
      console.log(`Página ${page}: ${loadedCount} de ${totalCount} registros cargados`);

      // if (employeesData.error) {
      //   console.error('Error al buscar empleados:', employeesData.error);
      //   return;
      // }

      // Formato para mostrar en el componente
      const formattedEmployees =
        employeesData.data?.map((employee) => ({
          value: employee?.id,
          label: `${employee?.firstname?.charAt(0).toUpperCase()}${employee?.firstname?.slice(1)} ${employee?.lastname?.charAt(0).toUpperCase()}${employee?.lastname?.slice(1)}`,
          diagrams: employee?.employees_diagram,
          contractor_employee: employee?.contractor_employee,
        })) || [];
      console.log('formattedEmployees', formattedEmployees);

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
      const guildsData = await query('guild', 'id, name');

      // Categorías
      const categoriesData = await query('category', 'id, name');

      // Posiciones
      const positionsData = await query('company_positions', 'id, name');

      // Flujos de trabajo
      const workflowsData = await query('work_diagram', 'id, name');

      // Centros de costo
      const costCentersData = await query('cost_center', 'id, name');

      // Contratos
      const covenantsData = await query('covenant', 'id, name');

      // Contratistas
      const customersData = await query('customers', 'id, name');

      setFilterOptions({
        guilds: guildsData || [],
        categories: categoriesData || [],
        positions: positionsData || [],
        workflows: workflowsData || [],
        costCenters: costCentersData || [],
        covenants: covenantsData || [],
        customers: customersData || [],
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

  const handleFilterChange = (name: keyof FilterState, value: string) => {
    // Si el valor es "all", lo tratamos como no seleccionado
    const filterValue = value === 'all' ? '' : value;
    setFilters((prev) => ({ ...prev, [name]: value }));

    // Actualizar filtros activos
    if (value && value !== 'all' && !activeFilters.includes(name)) {
      setActiveFilters((prev) => [...prev, name]);
    } else if ((value === '' || value === 'all') && activeFilters.includes(name)) {
      setActiveFilters((prev) => prev.filter((filter) => filter !== name));
    }
  };

  // Función para borrar un filtro específico
  const clearFilter = (name: keyof FilterState) => {
    // Restaurar el valor a estado vacío para todos los tipos de filtros
    setFilters((prev) => ({ ...prev, [name]: '' }));

    // Remover de los filtros activos
    if (activeFilters.includes(name)) {
      setActiveFilters(activeFilters.filter((filter) => filter !== name));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Filtros aplicados:', {
      firstname: filters.firstname,
      lastname: filters.lastname,
      position: filters.position,
      workflow: filters.workflow,
      costCenter: filters.costCenter,
      covenant: filters.covenant,
      guild: filters.guild,
      category: filters.category,
    });
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
  //     console.log(`Cargando diagramas para ${employees.length} empleados...`);

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

  console.log(employees, 'employeesemployees');
  console.log(activeFilters, 'activeFilters');

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
                  {filters.position && filters.position !== '' && (
                    <button
                      type="button"
                      onClick={() => clearFilter('position')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <Select value={filters.position} onValueChange={(value) => handleFilterChange('position', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los puestos</SelectItem>
                    {filterOptions.positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por diagrama de trabajo */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="workflow">Diagrama de trabajo</Label>
                  {filters.workflow && filters.workflow !== '' && (
                    <button
                      type="button"
                      onClick={() => clearFilter('workflow')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <Select value={filters.workflow} onValueChange={(value) => handleFilterChange('workflow', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar diagrama" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los diagramas</SelectItem>
                    {filterOptions.workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por centro de costos */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="costCenter">Centro de costos</Label>
                  {filters.costCenter && filters.costCenter !== '' && (
                    <button
                      type="button"
                      onClick={() => clearFilter('costCenter')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <Select value={filters.costCenter} onValueChange={(value) => handleFilterChange('costCenter', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro de costos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los centros</SelectItem>
                    {filterOptions.costCenters.map((costCenter) => (
                      <SelectItem key={costCenter.id} value={costCenter.id}>
                        {costCenter.name || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por convenio */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="covenant">Convenio</Label>
                  {filters.covenant && filters.covenant !== '' && (
                    <button
                      type="button"
                      onClick={() => clearFilter('covenant')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <Select value={filters.covenant} onValueChange={(value) => handleFilterChange('covenant', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar convenio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los convenios</SelectItem>
                    {filterOptions.covenants.map((covenant) => (
                      <SelectItem key={covenant.id} value={covenant.id}>
                        {covenant.name || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por gremio */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="guild">Gremio</Label>
                  {filters.guild && filters.guild !== '' && (
                    <button
                      type="button"
                      onClick={() => clearFilter('guild')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <Select value={filters.guild} onValueChange={(value) => handleFilterChange('guild', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar gremio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los gremios</SelectItem>
                    {filterOptions.guilds.map((guild) => (
                      <SelectItem key={guild.id} value={guild.id}>
                        {guild.name || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por categoría */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="category">Categoría</Label>
                  {filters.category && filters.category !== '' && (
                    <button
                      type="button"
                      onClick={() => clearFilter('category')}
                      className="text-muted-foreground hover:text-black text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {filterOptions.categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por contratista */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="customer">Contratista</Label>
                  {filters['contractor_employee.contractor_id'] &&
                    filters['contractor_employee.contractor_id'] !== '' && (
                      <button
                        type="button"
                        onClick={() => clearFilter('contractor_employee.contractor_id')}
                        className="text-muted-foreground hover:text-black text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                </div>
                <Select
                  value={filters['contractor_employee.contractor_id']}
                  onValueChange={(value) => handleFilterChange('contractor_employee.contractor_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar contratista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los contratistas</SelectItem>
                    {filterOptions.customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        <div className="p-6 bg-white rounded-lg border text-center">
          <p>No se encontraron diagramas para los empleados seleccionados.</p>
        </div>
      ) : (
        <div className="p-6 bg-white rounded-lg border text-center">
          <p>Para mostrar diagramas debe aplicar al menos un filtro.</p>
        </div>
      )}
    </div>
  );
}
