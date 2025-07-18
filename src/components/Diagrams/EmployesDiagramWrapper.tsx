'use client';

import { Filter, query, queryPaginated } from '@/app/server/GET/probando';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import DiagramEmployeeView from './DiagramEmployeeView';

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
};

// Tipo para las opciones de los filtros
type FilterOptions = {
  positions: { id: string; name: string | null }[];
  workflows: { id: string; name: string | null }[];
  costCenters: { id: string; name: string | null }[];
  covenants: { id: string; name: string | null }[];
  guilds: { id: string; name: string | null }[];
  categories: { id: string; name: string | null }[];
};

export default function EmployesDiagramWrapper() {
  const [diagrams, setDiagrams] = useState<any[]>([]);
  const [employees, setEmployees] = useState<
    {
      id: string;
      firstname: string;
      lastname: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    firstname: '',
    lastname: '',
    position: '',
    workflow: '',
    costCenter: '',
    covenant: '',
    guild: '',
    category: '',
  });
  const [activeFilters, setActiveFilters] = useState<(keyof FilterState)[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    positions: [],
    workflows: [],
    costCenters: [],
    covenants: [],
    guilds: [],
    categories: [],
  });

  // Función para cargar los datos basados en los filtros seleccionados
  const loadData = async () => {
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

      if (filters.covenant && filters.covenant !== '') {
        queryFilters.push({
          column: 'type_of_contract',
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

      console.log('Filtros aplicados:', queryFilters);
      console.log('Ejecutando consulta de empleados...');

      // Ejecutar la consulta con los filtros construidos
      // @ts-ignore - Ignoramos errores temporalmente mientras resolvemos tipados
      const employeesData = await queryPaginated('employees', 'id, firstname, lastname, document_number', {
        filters: queryFilters,
        page: 1,
        pageSize: 100,
      });

      console.log('Resultados encontrados:', employeesData.data?.length || 0);
      if (employeesData.data?.length) {
        console.log('Primeros resultados:', employeesData.data.slice(0, 3));
      } else {
        console.log('No se encontraron resultados, mostrando consulta de diagnóstico...');
        const diagnosticData = await query('employees', 'id, firstname, lastname', []);
        console.log('Muestra de empleados disponibles:', diagnosticData?.slice(0, 5));
      }

      // if (employeesData.error) {
      //   console.error('Error al buscar empleados:', employeesData.error);
      //   return;
      // }

      // Formato para mostrar en el componente
      const formattedEmployees =
        employeesData.data?.map((employee) => ({
          id: employee?.id,
          firstname: employee?.firstname,
          lastname: employee?.lastname,
        })) || [];
      console.log('formattedEmployees', formattedEmployees);

      setEmployees(formattedEmployees);

      // Si tenemos empleados, cargamos los diagramas
      if (employeesData.data && employeesData.data.length > 0) {
        setEmployees(employeesData.data);
        await loadDiagrams(employeesData.data);
      } else {
        setEmployees([]);
        setDiagrams([]);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar opciones para los filtros
  const loadFilterOptions = async () => {
    try {
      // Gremios - usando la función query
      // @ts-ignore - Ignoramos errores temporalmente mientras resolvemos tipados
      const guildsData = await query('guild', 'id, name');

      // Categorías
      // @ts-ignore
      const categoriesData = await query('category', 'id, name');

      // Posiciones
      // @ts-ignore
      const positionsData = await query('company_positions', 'id, name');

      // Flujos de trabajo
      // @ts-ignore
      const workflowsData = await query('work_diagram', 'id, name');

      // Centros de costo
      // @ts-ignore
      const costCentersData = await query('cost_center', 'id, name');

      // Contratos
      const covenantsData = await query('covenant', 'id, name');

      setFilterOptions({
        guilds: guildsData || [],
        categories: categoriesData || [],
        positions: positionsData || [],
        workflows: workflowsData || [],
        costCenters: costCentersData || [],
        covenants: covenantsData || [],
      });
    } catch (error) {
      console.error('Error al cargar opciones de filtros:', error);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const handleFilterChange = (name: keyof FilterState, value: string) => {
    // Si el valor es "all", lo tratamos como no seleccionado
    const filterValue = value === 'all' ? '' : value;
    setFilters((prev) => ({ ...prev, [name]: filterValue }));

    // Actualizar filtros activos
    if (filterValue && !activeFilters.includes(name)) {
      setActiveFilters((prev) => [...prev, name]);
    } else if (!filterValue && activeFilters.includes(name)) {
      setActiveFilters((prev) => prev.filter((filter) => filter !== name));
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
    loadData();
  };

  // Función para cargar los diagramas de un conjunto de empleados
  const loadDiagrams = async (employees: any[]) => {
    try {
      const diagramsData = [];
      console.log(`Cargando diagramas para ${employees.length} empleados...`);

      // Consultar diagramas por lotes para mejor rendimiento
      for (const employee of employees) {
        try {
          // @ts-ignore - Ignoramos errores temporalmente mientras resolvemos tipados
          const employeeDiagrams = await query('employees_diagram', '*, diagram_type(*)', [
            {
              column: 'employee_id',
              value: employee?.id,
            },
          ]);

          if (employeeDiagrams && employeeDiagrams.length > 0) {
            diagramsData.push(...employeeDiagrams);
          }
        } catch (err) {
          console.error(`Error al obtener diagramas para empleado ${employee?.id}:`, err);
        }
      }

      setDiagrams(diagramsData);
    } catch (error) {
      console.error('Error al cargar diagramas:', error);
    }
  };

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
                      onChange={(e) => setFilters({ ...filters, firstname: e.target.value })}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="lastname">Apellido</Label>
                  <div className="relative">
                    <Input
                      placeholder="Buscar por apellido"
                      value={filters.lastname}
                      onChange={(e) => setFilters({ ...filters, lastname: e.target.value })}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Filtro por gremio */}
              <div className="space-y-2">
                <Label htmlFor="guild">Gremio</Label>
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
                <Label htmlFor="category">Categoría</Label>
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
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Buscando...' : 'Buscar diagramas'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center p-10">
          <p className="text-lg">Buscando diagramas de empleados...</p>
        </div>
      ) : diagrams.length > 0 ? (
        <DiagramEmployeeView diagrams={diagrams} activeEmployees={employees} />
      ) : employees.length > 0 ? (
        <div className="p-6 bg-white rounded-lg border text-center">
          <p>No se encontraron diagramas para los empleados seleccionados.</p>
        </div>
      ) : activeFilters.length > 0 ? (
        <div className="p-6 bg-white rounded-lg border text-center">
          <p>No se encontraron empleados con los criterios de búsqueda seleccionados.</p>
        </div>
      ) : (
        <div className="p-6 bg-white rounded-lg border text-center">
          <p>Utilice los filtros para buscar diagramas de empleados.</p>
          <p className="text-sm text-gray-500 mt-2">
            Para mejorar el rendimiento, debe aplicar al menos un filtro antes de cargar datos.
          </p>
        </div>
      )}
    </div>
  );
}
