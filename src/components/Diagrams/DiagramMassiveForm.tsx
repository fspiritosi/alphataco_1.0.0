'use client';

import { Filter, query, queryPaginated } from '@/app/server/GET/probando';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { zodResolver } from '@hookform/resolvers/zod';
import Cookies from 'js-cookie';
import { Search, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormItemDatePicker } from '../ui/FormItemDatePicker';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MultiSelectCombobox } from '../ui/multi-select-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Configuración de límites (fácil de ajustar)
const DATE_RESTRICTIONS = {
  minDate: new Date(), // Hoy
  maxDaysRange: 90, // 3 meses máximo
  maxEmployees: 100, // 100 empleados máximo
};

// Schema de validación
const formSchema = z.object({
  employeeIds: z
    .array(z.string())
    .min(1, 'Selecciona al menos un empleado')
    .max(DATE_RESTRICTIONS.maxEmployees, `Máximo ${DATE_RESTRICTIONS.maxEmployees} empleados`),
  workDiagramId: z.string().min(1, 'Selecciona un diagrama de trabajo'),
  activeNoveltyId: z.string().optional(), // Solo requerido si hay múltiples opciones
  dateRange: z
    .object({
      from: z.date().min(DATE_RESTRICTIONS.minDate, 'Solo fechas desde hoy en adelante'),
      to: z.date(),
    })
    .refine((data) => {
      const diffDays = Math.ceil((data.to.getTime() - data.from.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= DATE_RESTRICTIONS.maxDaysRange;
    }, `Máximo ${DATE_RESTRICTIONS.maxDaysRange} días permitidos`),
});

type FormData = z.infer<typeof formSchema>;

// Tipos para el sistema de filtros
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

// Función para obtener empleados con filtros y paginación
const fetchData = async ({
  filters,
  page,
  pageSize,
  company_id,
}: {
  filters: Filter<'employees'>[];
  page: number;
  pageSize: number;
  company_id: string;
}) => {
  const employeesData = await queryPaginated(
    'employees',
    'id, firstname, lastname, document_number, workflow_diagram, employees_diagram(*,diagram_type(*)), contractor_employee(*,customers(id,name))',
    {
      filters: [
        {
          column: 'company_id',
          operator: 'eq',
          value: company_id,
        },
        ...filters,
      ],
      page: page,
      pageSize: pageSize,
    }
  );
  return employeesData;
};

// Función para formatear empleados para el componente
const formatEmployees = (employeesData: Awaited<ReturnType<typeof fetchData>>) => {
  return (
    employeesData.data?.map((employee) => ({
      id: employee?.id,
      firstname: employee?.firstname,
      lastname: employee?.lastname,
      document_number: employee?.document_number,
      workflow_diagram: employee?.workflow_diagram,
      employees_diagram: employee?.employees_diagram,
      contractor_employee: employee?.contractor_employee,
      label: `${employee?.firstname?.charAt(0).toUpperCase()}${employee?.firstname?.slice(1)} ${employee?.lastname?.charAt(0).toUpperCase()}${employee?.lastname?.slice(1)}`,
    })) || []
  );
};

interface ConflictRecord {
  employee_id: string;
  employee_name: string;
  day: number;
  month: number;
  year: number;
  date_formatted: string;
  current_diagram_type: string;
  current_diagram_name: string;
  current_diagram_color: string;
  is_used_in_operations: boolean;
  operation_details: string;
  can_update: boolean;
  conflict_type: string;
}

interface Props {
  onSubmit: (data: any) => void;
  onConflictsFound: (conflicts: any, formData: any) => void;
  onNoConflicts: () => void;
  onProcessingComplete: (result: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const fetchEmployees = async () => {
  const employees = await query('employees', 'id, firstname, lastname, workflow_diagram', [
    { column: 'is_active', value: true },
  ]);
  return employees;
};

async function fetchWorkDiagrams(company_id: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from('work_diagram')
    .select('id, name, active_working_days, inactive_working_days, inactive_novelty')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching work diagrams:', error);
    return [];
  }

  return data || [];
}

async function fetchNovelties(workDiagramId: string) {
  const supabase = supabaseBrowser();

  // Cargar inactive_novelty del work_diagram
  const { data: workDiagram, error: workDiagramError } = await supabase
    .from('work_diagram')
    .select('inactive_novelty, diagram_type!inactive_novelty(id, name, color)')
    .eq('id', workDiagramId)
    .single();

  if (workDiagramError) {
    console.error('Error fetching work diagram:', workDiagramError);
    return { inactiveNovelty: null, activeNovelties: [] };
  }

  // Cargar active_novelties
  const { data: activeNovelties, error: activeNoveltiesError } = await supabase
    .from('work_diagram_active_novelties')
    .select('diagram_type_id, diagram_type(id, name, color)')
    .eq('work_diagram_id', workDiagramId);

  if (activeNoveltiesError) {
    console.error('Error fetching active novelties:', activeNoveltiesError);
    return { inactiveNovelty: workDiagram, activeNovelties: [] };
  }

  return {
    inactiveNovelty: workDiagram,
    activeNovelties: activeNovelties || [],
  };
}

export function DiagramMassiveForm({
  onSubmit,
  onConflictsFound,
  onNoConflicts,
  onProcessingComplete,
  loading,
  setLoading,
}: Props) {
  const [employees, setEmployees] = useState<ReturnType<typeof formatEmployees>>([]);
  const [workDiagrams, setWorkDiagrams] = useState<any[]>([]);
  const [activeNovelties, setActiveNovelties] = useState<any[]>([]);
  const [inactiveNovelty, setInactiveNovelty] = useState<any>(null);
  const [showActiveNoveltySelect, setShowActiveNoveltySelect] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<ReturnType<typeof formatEmployees>>([]);
  const supabase = supabaseBrowser();
  const company_id = Cookies.get('actualComp');

  // Estados para el sistema de filtros (copiados de EmployesDiagramWrapper)
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
  const [showFilters, setShowFilters] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeIds: [],
      workDiagramId: '',
      activeNoveltyId: '',
      dateRange: {
        from: new Date(),
        to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días por defecto
      },
    },
  });

  // Función para cargar los datos basados en los filtros seleccionados (copiada de EmployesDiagramWrapper)
  const loadData = async (page: number = 1, append: boolean = false) => {
    console.log('📊 [DEBUG] loadData - INICIO');
    console.log('📊 [DEBUG] Parámetros:', { page, append });
    console.log('📊 [DEBUG] Estado actual:', {
      currentPage,
      hasMoreData,
      isLoading,
      isLoadingMore,
      hasSearched,
      employeesCount: employees.length,
    });

    // Si estamos cargando la primera página, reiniciamos el estado
    if (page === 1 && !append) {
      console.log('📊 [DEBUG] Reiniciando estado para página 1');
      setEmployees([]);
      setCurrentPage(1);
    }

    console.log('📊 [DEBUG] Filtros activos:', activeFilters);
    console.log('📊 [DEBUG] Filtros completos:', filters);

    console.log('📊 [DEBUG] Estableciendo isLoading = true');
    setIsLoading(true);

    try {
      console.log('📊 [DEBUG] Iniciando construcción de filtros');
      // Construimos los filtros para la función query
      const queryFilters: Filter<'employees'>[] = [];

      console.log('📊 [DEBUG] Company ID disponible:', company_id);
      // Agregar filtro por compañía
      // if (company_id) {
      //   queryFilters.push({
      //     column: 'company_id',
      //     operator: 'eq',
      //     value: company_id,
      //   });
      //   console.log('📊 [DEBUG] Filtro company_id agregado:', company_id);
      // } else {
      //   console.log('⚠️ [DEBUG] WARNING: No hay company_id disponible');
      // }

      // Agregar filtro por empleados activos
      queryFilters.push({
        column: 'is_active',
        operator: 'eq',
        value: true,
      });
      console.log('📊 [DEBUG] Filtro is_active agregado');

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

      console.log('📊 [DEBUG] Filtros finales construidos:', queryFilters);
      console.log('📊 [DEBUG] Total de filtros aplicados:', queryFilters.length);
      console.log('📊 [DEBUG] Parámetros de consulta:', { filters: queryFilters, page: page, pageSize: 100 });

      console.log('📊 [DEBUG] Ejecutando fetchData...');
      const employeesData = await fetchData({
        filters: queryFilters,
        page: page,
        pageSize: 100,
        company_id: company_id || '',
      });

      console.log('📊 [DEBUG] Respuesta de fetchData:', {
        data: employeesData.data ? `Array de ${employeesData.data.length} elementos` : 'null/undefined',
        pagination: employeesData.pagination,
      });

      console.log('📊 [DEBUG] Resultados encontrados:', employeesData.data?.length || 0);
      if (employeesData.data?.length) {
        console.log('📊 [DEBUG] Primeros 3 resultados:', employeesData.data.slice(0, 3));
      } else {
        console.log('⚠️ [DEBUG] No se encontraron datos o data es null/undefined');
      }

      // Verificar si hay más páginas disponibles
      const totalCount = employeesData.pagination?.total || 0;
      const loadedCount = (page - 1) * 100 + (employeesData.data?.length || 0);
      const hasMore = loadedCount < totalCount;

      console.log('📊 [DEBUG] Paginación:', {
        totalCount,
        loadedCount,
        hasMore,
        currentPage: page,
        pageSize: 100,
      });

      setHasMoreData(hasMore);
      console.log(`📊 [DEBUG] Página ${page}: ${loadedCount} de ${totalCount} registros cargados`);

      // Formato para mostrar en el componente
      console.log('📊 [DEBUG] Formateando empleados...');
      const formattedEmployees = formatEmployees(employeesData);
      console.log('📊 [DEBUG] Empleados formateados:', formattedEmployees.length);

      if (append) {
        console.log('📊 [DEBUG] Agregando empleados a lista existente');
        setEmployees((prevEmployees) => {
          const newList = [...prevEmployees, ...formattedEmployees];
          console.log('📊 [DEBUG] Nueva lista total:', newList.length);
          return newList;
        });
      } else {
        console.log('📊 [DEBUG] Reemplazando lista de empleados');
        setEmployees(formattedEmployees);
      }

      console.log('📊 [DEBUG] loadData - ÉXITO');
    } catch (error) {
      console.error('🚫 [DEBUG] ERROR en loadData:', error);
      console.error('🚫 [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack available');
      toast.error('Error al cargar empleados');
    } finally {
      console.log('📊 [DEBUG] Estableciendo isLoading = false');
      setIsLoading(false);
      console.log('📊 [DEBUG] loadData - FIN');
    }
  };

  // Cargar work diagrams al inicio
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Cargar diagramas de trabajo activos
        const workDiagramsData = await fetchWorkDiagrams(company_id || '');
        setWorkDiagrams(workDiagramsData);

        // Cargar opciones de filtros
        await loadFilterOptions();
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast.error('Error al cargar los datos iniciales');
      }
    };

    if (company_id) {
      loadInitialData();
      // Al montar el componente, reiniciamos el estado de paginación
      setCurrentPage(1);
      setHasMoreData(false);
    }
  }, [company_id]);

  // Cargar opciones para los filtros (copiada de EmployesDiagramWrapper)
  const loadFilterOptions = async () => {
    try {
      // Gremios - usando la función query
      const guildsData = await query('guild', 'id, name');

      // Categorías
      const categoriesData = await query('category', 'id, name,covenant(name)', [{ column: 'is_active', value: true }]);

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

      // Contratistas
      const contractorsData = await query('contractors', 'id, name');

      // Tipos de diagrama
      const diagramTypesData = await query('diagram_type', 'id, name', [{ column: 'company_id', value: company_id }]);

      console.log(categoriesData, 'categoriesData');

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

  // Función que maneja cambios en campos de texto (string) - copiada de EmployesDiagramWrapper
  const handleFilterChange = (name: 'firstname' | 'lastname', value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));

    if (value && value !== '' && !activeFilters.includes(name)) {
      setActiveFilters((prev) => [...prev, name]);
    } else if ((!value || value === '') && activeFilters.includes(name)) {
      setActiveFilters((prev) => prev.filter((filter) => filter !== name));
    }
  };

  // Función que maneja cambios en multi-select (string[]) - copiada de EmployesDiagramWrapper
  const handleMultiFilterChange = (name: Exclude<keyof FilterState, 'firstname' | 'lastname'>, values: string[]) => {
    setFilters((prev) => ({ ...prev, [name]: values }));

    if (values && values.length > 0 && !activeFilters.includes(name)) {
      setActiveFilters((prev) => [...prev, name]);
    } else if ((!values || values.length === 0) && activeFilters.includes(name)) {
      setActiveFilters((prev) => prev.filter((filter) => filter !== name));
    }
  };

  // Función para borrar un filtro específico - copiada de EmployesDiagramWrapper
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

  // Función para manejar el submit del formulario de filtros - copiada de EmployesDiagramWrapper
  const handleFilterSubmit = (e: FormEvent) => {
    console.log('🔍 [DEBUG] handleFilterSubmit - INICIO');
    console.log('🔍 [DEBUG] Event:', e);
    console.log('🔍 [DEBUG] Event type:', e.type);

    e.preventDefault();
    console.log('🔍 [DEBUG] preventDefault() ejecutado');

    console.log('🔍 [DEBUG] Filtros actuales:', {
      firstname: filters.firstname,
      lastname: filters.lastname,
      position: filters.position,
      workflow: filters.workflow,
      costCenter: filters.costCenter,
      covenant: filters.covenant,
      guild: filters.guild,
      category: filters.category,
      'contractor_employee.contractor_id': filters['contractor_employee.contractor_id'],
    });

    console.log('🔍 [DEBUG] Filtros activos:', activeFilters);
    console.log('🔍 [DEBUG] Company ID:', company_id);

    console.log('🔍 [DEBUG] Estableciendo hasSearched = true');
    setHasSearched(true);

    console.log('🔍 [DEBUG] Llamando a loadData(1, false)');
    loadData(1, false);

    console.log('🔍 [DEBUG] handleFilterSubmit - FIN');
  };

  // Función para cargar más datos - copiada de EmployesDiagramWrapper
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

  // Función para limpiar todos los filtros
  const clearAllFilters = () => {
    setFilters({
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
    setActiveFilters([]);
    setHasSearched(false);
    setEmployees([]);
  };

  // Actualizar empleados seleccionados cuando cambian los IDs
  useEffect(() => {
    const employeeIds = form.watch('employeeIds');
    const selected = employees.filter((emp) => employeeIds.includes(emp.id));
    setSelectedEmployees(selected);
  }, [form.watch('employeeIds'), employees]);

  // Función para manejar el cambio de work_diagram
  const handleWorkDiagramChange = async (workDiagramId: string) => {
    console.log('🔧 [DEBUG] handleWorkDiagramChange - workDiagramId:', workDiagramId);

    form.setValue('workDiagramId', workDiagramId);

    try {
      // Cargar novelties asociadas al work_diagram
      const { inactiveNovelty, activeNovelties } = await fetchNovelties(workDiagramId);

      console.log('🔧 [DEBUG] Novelties cargadas:', {
        // inactiveNovelty: inactiveNovelty?.diagram_type?.name,
        activeNoveltiesCount: activeNovelties.length,
        activeNoveltyNames: activeNovelties.map((n: any) => n.diagram_type?.name),
      });

      setInactiveNovelty(inactiveNovelty);
      setActiveNovelties(activeNovelties);

      // Mostrar select solo si hay múltiples active_novelties
      if (activeNovelties.length > 1) {
        console.log('🔧 [DEBUG] Múltiples novelties activas, mostrando select');
        setShowActiveNoveltySelect(true);
        form.setValue('activeNoveltyId', ''); // Reset selection
      } else if (activeNovelties.length === 1) {
        console.log('🔧 [DEBUG] Una sola novelty activa, seleccionando automáticamente');
        setShowActiveNoveltySelect(false);
        form.setValue('activeNoveltyId', activeNovelties[0].diagram_type_id);
      } else {
        console.log('⚠️ [DEBUG] No hay novelties activas configuradas');
        setShowActiveNoveltySelect(false);
        form.setValue('activeNoveltyId', '');
        toast.error('El diagrama de trabajo no tiene novedades activas configuradas');
      }

      if (!inactiveNovelty?.diagram_type) {
        console.log('⚠️ [DEBUG] No hay novelty inactiva configurada');
        toast.error('El diagrama de trabajo no tiene novedad inactiva configurada');
      }

      // NUEVO: Configurar filtro de diagrama de trabajo (sin ejecutar búsqueda automática)
      console.log('🔧 [DEBUG] Configurando filtro de diagrama de trabajo:', workDiagramId);

      // Actualizar el filtro de workflow con el diagrama seleccionado
      const newFilters = {
        ...filters,
        workflow: [workDiagramId],
      };
      setFilters(newFilters);

      // Actualizar filtros activos si no está ya incluido
      if (!activeFilters.includes('workflow')) {
        setActiveFilters((prev) => [...prev, 'workflow']);
      }

      console.log('🔧 [DEBUG] Filtro configurado. Use el botón "Aplicar Filtros" para buscar empleados.');
    } catch (error) {
      console.error('🚫 [DEBUG] Error cargando novelties:', error);
      toast.error('Error al cargar las configuraciones del diagrama de trabajo');
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    const currentIds = form.getValues('employeeIds');

    if (currentIds.includes(employeeId)) {
      // Si ya está seleccionado, lo removemos
      const newIds = currentIds.filter((id) => id !== employeeId);
      form.setValue('employeeIds', newIds);
    } else {
      // Si no está seleccionado, verificamos el límite antes de agregarlo
      if (currentIds.length >= DATE_RESTRICTIONS.maxEmployees) {
        toast.warning(`No se puede seleccionar más de ${DATE_RESTRICTIONS.maxEmployees} empleados.`);
        return;
      }

      const newIds = [...currentIds, employeeId];
      form.setValue('employeeIds', newIds);
    }
  };

  const estimateRecords = (employeeCount: number, days: number) => {
    const totalRecords = employeeCount * days;
    const estimatedTime = Math.ceil(totalRecords / 1000) * 2; // 2 seg por cada 1000 registros

    return {
      totalRecords,
      estimatedTime: `${estimatedTime} segundos`,
      batches: Math.ceil(totalRecords / 1000),
    };
  };

  const handleVerifyAndSubmit = async (data: FormData) => {
    console.log('🚀 [DEBUG] handleVerifyAndSubmit - data:', data);

    setLoading(true);

    try {
      // Verificar conflictos usando la función SQL actualizada
      const { data: conflicts, error } = await supabase.rpc('check_diagram_conflicts_with_operations_v2', {
        p_employee_ids: data.employeeIds,
        p_work_diagram_id: data.workDiagramId,
        p_date_from: data.dateRange.from.toISOString().split('T')[0],
        p_date_to: data.dateRange.to.toISOString().split('T')[0],
        p_active_novelty_id: data.activeNoveltyId || '',
      });

      if (error) {
        console.error('Error checking conflicts:', error);
        toast.error('Error al verificar conflictos');
        return;
      }

      console.log('🔍 [DEBUG] Respuesta de verificación de conflictos:', conflicts);
      console.log('🔍 [DEBUG] Tipo de conflicts:', typeof conflicts);

      // Acceder correctamente a los conflictos según la estructura de tu función
      const conflictList = (conflicts as any)?.conflicts || [];
      console.log('🔍 [DEBUG] Lista de conflictos extraída:', conflictList);

      if (conflictList && conflictList.length > 0) {
        console.log(' [DEBUG] Se encontraron conflictos, mostrando modal');
        // Separar conflictos por tipo
        const operationConflicts = conflictList.filter((c: ConflictRecord) => c.conflict_type === 'IN_USE');
        const simpleConflicts = conflictList.filter((c: ConflictRecord) => c.conflict_type === 'CAN_UPDATE');

        console.log(' [DEBUG] Conflictos de operaciones:', operationConflicts);
        console.log(' [DEBUG] Conflictos simples:', simpleConflicts);

        onConflictsFound({ operationConflicts, simpleConflicts }, data);
      } else {
        console.log(' [DEBUG] No hay conflictos, pero mostrando ventana de resumen');
        onConflictsFound({ operationConflicts: [], simpleConflicts: [] }, data);
      }
    } catch (error) {
      console.error('Error in verification:', error);
      toast.error('Error en la verificación');
    } finally {
      setLoading(false);
    }
  };

  const executeCreation = async (data: FormData) => {
    setLoading(true);

    try {
      const { data: result, error } = await supabase.rpc('process_massive_diagram_creation_v2', {
        p_employee_ids: data.employeeIds,
        p_work_diagram_id: data.workDiagramId,
        p_date_from: data.dateRange.from.toISOString().split('T')[0],
        p_date_to: data.dateRange.to.toISOString().split('T')[0],
        p_active_novelty_id: data.activeNoveltyId || '',
        p_conflict_resolution: 'skip', // Por defecto, saltar conflictos
      });

      if (error) {
        console.error('Error creating diagrams:', error);
        toast.error('Error al crear los diagramas');
        return;
      }

      onProcessingComplete(result);
      toast.success('Diagramas procesados correctamente');
    } catch (error) {
      console.error('Error in creation:', error);
      toast.error('Error en la creación');
    } finally {
      setLoading(false);
    }
  };

  const watchedValues = form.watch();
  const employeeCount = watchedValues.employeeIds?.length || 0;
  const dateRange = watchedValues.dateRange;
  const days =
    dateRange?.from && dateRange?.to
      ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;
  const estimate = estimateRecords(employeeCount, days);

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleVerifyAndSubmit)} className="space-y-6">
          {/* Selección de diagrama de trabajo */}
          <FormField
            control={form.control}
            name="workDiagramId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diagrama de Trabajo</FormLabel>
                <Select onValueChange={handleWorkDiagramChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un diagrama de trabajo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {workDiagrams.map((diagram) => (
                      <SelectItem key={diagram.id} value={diagram.id}>
                        <div className="flex items-center space-x-2">
                          <span>{diagram.name}</span>
                          <Badge variant="outline">
                            {diagram.active_working_days}A/{diagram.inactive_working_days}I
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Selección de novedad activa (solo si hay múltiples opciones) */}
          {showActiveNoveltySelect && (
            <FormField
              control={form.control}
              name="activeNoveltyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novedad Activa</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una novedad activa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeNovelties.map((novelty) => (
                        <SelectItem key={novelty.diagram_type_id} value={novelty.diagram_type_id}>
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: novelty.diagram_type?.color || '#666' }}
                            />
                            <span>{novelty.diagram_type?.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Información de novedad activa */}
          {(activeNovelties.length === 1 || (activeNovelties.length > 1 && form.getValues('activeNoveltyId'))) && (
            <div className="p-3 bg-blue-50 rounded-lg mb-2">
              <div className="text-sm font-medium text-gray-700 mb-1">Novedad para días activos:</div>
              <div className="flex items-center space-x-2">
                {activeNovelties.length === 1 ? (
                  <>
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: activeNovelties[0]?.diagram_type?.color || '#666' }}
                    />
                    <span className="text-sm">{activeNovelties[0]?.diagram_type?.name}</span>
                  </>
                ) : (
                  activeNovelties.map((novelty) => {
                    if (novelty.diagram_type_id === form.getValues('activeNoveltyId')) {
                      return (
                        <div key={novelty.diagram_type_id} className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: novelty.diagram_type?.color || '#666' }}
                          />
                          <span className="text-sm">{novelty.diagram_type?.name}</span>
                        </div>
                      );
                    }
                    return null;
                  })
                )}
              </div>
            </div>
          )}

          {/* Información de novedad inactiva */}
          {inactiveNovelty && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-1">Novedad para días inactivos:</div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: inactiveNovelty.diagram_type?.color || '#666' }}
                />
                <span className="text-sm">{inactiveNovelty.diagram_type?.name}</span>
              </div>
            </div>
          )}

          {/* Selección de rango de fechas */}
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rango de Fechas</FormLabel>
                <FormItemDatePicker
                  name="dateRange"
                  control={form.control}
                  label="Fechas del diagrama"
                  description="Selecciona el rango de fechas para diagrama"
                  disabled={(date) => date < DATE_RESTRICTIONS.minDate}
                />
                <div className="text-sm text-muted-foreground">
                  Solo se permiten fechas desde hoy en adelante (máximo {DATE_RESTRICTIONS.maxDaysRange} días)
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* Filtros de empleados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="">Filtros de Empleados</CardTitle>
            <div className="flex items-center space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Search className="h-4 w-4 mr-2" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </Button>
              {activeFilters.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar Todo
                </Button>
              )}
            </div>
          </div>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100"
                  onClick={() => {
                    if (filter !== 'workflow') {
                      clearFilter(filter);
                    }
                  }}
                >
                  {filter === 'firstname' && 'Nombre'}
                  {filter === 'lastname' && 'Apellido'}
                  {filter === 'position' && 'Posición'}
                  {filter === 'workflow' && 'Diagrama de Trabajo'}
                  {filter === 'costCenter' && 'Centro de Costo'}
                  {filter === 'covenant' && 'Convenio'}
                  {filter === 'guild' && 'Gremio'}
                  {filter === 'category' && 'Categoría'}
                  {filter === 'contractor_employee.contractor_id' && 'Contratista'}
                  {filter === 'diagramType' && 'Tipo de Diagrama'}
                  {filter !== 'workflow' && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        {showFilters && (
          <CardContent>
            <form onSubmit={handleFilterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Filtro por nombre */}
                <div className="space-y-2">
                  <Label htmlFor="firstname-filter">Nombre</Label>
                  <Input
                    id="firstname-filter"
                    placeholder="Buscar por nombre..."
                    value={filters.firstname}
                    onChange={(e) => handleFilterChange('firstname', e.target.value)}
                  />
                </div>

                {/* Filtro por apellido */}
                <div className="space-y-2">
                  <Label htmlFor="lastname-filter">Apellido</Label>
                  <Input
                    id="lastname-filter"
                    placeholder="Buscar por apellido..."
                    value={filters.lastname}
                    onChange={(e) => handleFilterChange('lastname', e.target.value)}
                  />
                </div>

                {/* Filtro por posición */}
                <div className="space-y-2">
                  <Label>Posición</Label>
                  <MultiSelectCombobox
                    options={filterOptions.positions.map((p) => ({ value: p.id, label: p.name || 'Sin nombre' }))}
                    selectedValues={filters.position}
                    onChange={(values) => handleMultiFilterChange('position', values)}
                    placeholder="Seleccionar posiciones..."
                    emptyMessage="No se encontraron posiciones"
                  />
                </div>

                {/* Filtro de Diagrama de Trabajo removido - ahora se aplica automáticamente desde el formulario */}

                {/* Filtro por centro de costo */}
                <div className="space-y-2">
                  <Label>Centro de Costo</Label>
                  <MultiSelectCombobox
                    options={filterOptions.costCenters.map((c) => ({ value: c.id, label: c.name || 'Sin nombre' }))}
                    selectedValues={filters.costCenter}
                    onChange={(values) => handleMultiFilterChange('costCenter', values)}
                    placeholder="Seleccionar centros..."
                    emptyMessage="No se encontraron centros de costo"
                  />
                </div>

                {/* Filtro por convenio */}
                <div className="space-y-2">
                  <Label>Convenio</Label>
                  <MultiSelectCombobox
                    options={filterOptions.covenants.map((c) => ({ value: c.id, label: c.name || 'Sin nombre' }))}
                    selectedValues={filters.covenant}
                    onChange={(values) => handleMultiFilterChange('covenant', values)}
                    placeholder="Seleccionar convenios..."
                    emptyMessage="No se encontraron convenios"
                  />
                </div>

                {/* Filtro por gremio */}
                <div className="space-y-2">
                  <Label>Gremio</Label>
                  <MultiSelectCombobox
                    options={filterOptions.guilds.map((g) => ({ value: g.id, label: g.name || 'Sin nombre' }))}
                    selectedValues={filters.guild}
                    onChange={(values) => handleMultiFilterChange('guild', values)}
                    placeholder="Seleccionar gremios..."
                    emptyMessage="No se encontraron gremios"
                  />
                </div>

                {/* Filtro por categoría */}
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <MultiSelectCombobox
                    options={filterOptions.categories.map((c) => ({
                      value: c.id,
                      label: `${c.name || 'Sin nombre'}${c.covenant?.name ? ` (${c.covenant.name})` : ''}`,
                    }))}
                    selectedValues={filters.category}
                    onChange={(values) => handleMultiFilterChange('category', values)}
                    placeholder="Seleccionar categorías..."
                    emptyMessage="No se encontraron categorías"
                  />
                </div>

                {/* Filtro por contratista */}
                <div className="space-y-2">
                  <Label>Contratista</Label>
                  <MultiSelectCombobox
                    options={filterOptions.contractors.map((c) => ({ value: c.id, label: c.name || 'Sin nombre' }))}
                    selectedValues={filters['contractor_employee.contractor_id']}
                    onChange={(values) => handleMultiFilterChange('contractor_employee.contractor_id', values)}
                    placeholder="Seleccionar contratistas..."
                    emptyMessage="No se encontraron contratistas"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="submit" variant="outline" disabled={isLoading}>
                  <Search className="h-4 w-4 mr-2" />
                  {isLoading ? 'Buscando...' : 'Aplicar Filtros'}
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Renderizado condicional de empleados - copiado de EmployesDiagramWrapper */}
      {isLoading && !isLoadingMore ? (
        <div className="flex justify-center items-center p-10">
          <p className="text-lg">Buscando empleados...</p>
        </div>
      ) : employees.length > 0 ? (
        <>
          {/* Mensaje informativo sobre datos adicionales */}
          {hasMoreData && (
            <div className="flex justify-center mb-2">
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                Hay más registros disponibles. Al final de la sección encontrará la opción para cargar más datos.
              </div>
            </div>
          )}

          {/* Selección de empleados */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleVerifyAndSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Empleados ({form.getValues('employeeIds')?.length || 0}/{DATE_RESTRICTIONS.maxEmployees})
                  </FormLabel>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allIds = employees.map((emp) => emp.id);
                        const limitedIds = allIds.slice(0, DATE_RESTRICTIONS.maxEmployees);
                        form.setValue('employeeIds', limitedIds);

                        if (allIds.length > DATE_RESTRICTIONS.maxEmployees) {
                          toast.warning(
                            `Solo se seleccionaron los primeros ${DATE_RESTRICTIONS.maxEmployees} empleados debido al límite máximo.`
                          );
                        }
                      }}
                      disabled={employees.length === 0}
                    >
                      Seleccionar Todos
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => form.setValue('employeeIds', [])}>
                      Limpiar Selección
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className={`flex items-center space-x-2 p-3 rounded cursor-pointer hover:bg-gray-50 ${
                          form.getValues('employeeIds').includes(employee.id)
                            ? 'bg-blue-50 border border-blue-200'
                            : 'border border-gray-200'
                        }`}
                        onClick={() => handleEmployeeToggle(employee.id)}
                      >
                        <input
                          type="checkbox"
                          checked={form.getValues('employeeIds').includes(employee.id)}
                          onChange={() => handleEmployeeToggle(employee.id)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {employee.firstname} {employee.lastname}
                          </div>
                          {!employee.workflow_diagram && (
                            <div className="text-xs text-red-500">Sin diagrama de trabajo</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {form.formState.errors.employeeIds && (
                  <div className="text-sm text-red-500">{form.formState.errors.employeeIds.message}</div>
                )}
              </div>

              {/* Resumen y estimación */}
              {employeeCount > 0 && days > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen de la Operación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{employeeCount}</div>
                        <div className="text-sm text-muted-foreground">Empleados</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{days}</div>
                        <div className="text-sm text-muted-foreground">Días</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{estimate.totalRecords}</div>
                        <div className="text-sm text-muted-foreground">Registros</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">{estimate.estimatedTime}</div>
                        <div className="text-sm text-muted-foreground">Tiempo Est.</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button type="submit" className="w-full" disabled={loading || employeeCount === 0}>
                {loading ? 'Verificando...' : 'Verificar y Crear Diagramas'}
              </Button>
            </form>
          </Form>

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
          <p>No se encontraron empleados para los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="p-6 bg-white rounded-lg border text-center">
          <p>Para mostrar empleados debe aplicar al menos un filtro.</p>
        </div>
      )}
    </div>
  );
}
