'use client';
require('dotenv').config();

import { fetchContractorCompanies } from '@/app/dashboard/employee/action/actions/actions';
import { CheckboxDefaultValues } from '@/components/CheckboxDefValues';
import { SelectWithData } from '@/components/SelectWithData';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { useImageUpload } from '@/hooks/useUploadImage';
import { handleSupabaseError } from '@/lib/errorHandler';
import { cn } from '@/lib/utils';
import { useCountriesStore } from '@/store/countries';
import { useLoggedUserStore } from '@/store/loggedUser';
import {
  civilStateOptionsENUM,
  documentOptionsENUM,
  genderOptionsENUM,
  instrutionsOptionsENUM,
  nacionaliOptionsENUM,
} from '@/types/enums';
import { names } from '@/types/types';
import { accordionSchema } from '@/zodSchemas/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogTrigger } from '@radix-ui/react-dialog';
import { CalendarIcon } from '@radix-ui/react-icons';
import { PostgrestError } from '@supabase/supabase-js';
import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import Cookies from 'js-cookie';
import { Check, ChevronsUpDown, Loader, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '../../supabase/supabase';
import AddCategoryModal from './AddCategoryModal';
import AddCovenantModal from './AddCovenantModal';
import AddGuildModal from './AddGuildModal';
import BackButton from './BackButton';
import { DiagramDetailEmployeeView } from './Diagrams/DiagramDetailEmployeeView';
import { ImageHander } from './ImageHandler';
import { AlertDialogFooter } from './ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { FormDatePicker } from './ui/formDatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
type Province = {
  id: number;
  name: string;
};

interface EmployeeAptitude {
  aptitud_id: string;
  aptitudes_tecnicas: {
    id: string;
    nombre: string;
    descripcion?: string;
  };
}

export default function EmployeeComponent({
  guild,
  cost_center,
  user,
  diagrams,
  covenants,
  categories,
  employeeAptitudes,
  children,
  diagrams_types,
  activeEmploees,
  historyData,
  role,
  contract_types,
  company_positions,
  contractorCompanies,
  workDiagram,
}: {
  workDiagram: Database['public']['Tables']['work_diagram']['Row'][] | null;
  contractorCompanies: Awaited<ReturnType<typeof fetchContractorCompanies>>;
  contract_types: ContractType[];
  company_positions: any[];
  cost_center: CostCenter[];
  historyData: any;
  role: string | null;
  user: any;
  activeEmploees: any;
  diagrams: EmployeeDiagramWithDiagramType[];
  diagrams_types: any;
  guild:
    | {
        value: string;
        label: string;
      }[]
    | undefined;
  covenants:
    | {
        id: string;
        name: string;
        guild_id: string;
      }[]
    | undefined;
  categories:
    | {
        id: string;
        name: string;
        covenant_id: string;
      }[]
    | undefined;
  employeeAptitudes?: EmployeeAptitude[];
  children: React.ReactNode;
}) {
  const profile = useLoggedUserStore((state) => state);
  // const role = useLoggedUserStore((state) => state.roleActualCompany);
  const searchParams = useSearchParams();
  const accion = searchParams.get('action');
  const employees = useLoggedUserStore((state) => state.active_and_inactive_employees);
  const loggedUser = useLoggedUserStore((state) => state.credentialUser?.id);
  const { uploadImage } = useImageUpload();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [base64Image, setBase64Image] = useState<string>('');
  const fetchCityValues = useCountriesStore((state) => state.fetchCities);
  const provincesOptions = useCountriesStore((state) => state.provinces);
  const citysOptions = useCountriesStore((state) => state.cities);
  const countryOptions = useCountriesStore((state) => state.countries);
  const hierarchyOptions = useCountriesStore((state) => state.hierarchy);
  const workDiagramOptions = useCountriesStore((state) => state.workDiagram);
  // const contractorCompanies = useCountriesStore((state) =>
  //   state.customers?.filter(
  //     (company: any) => company.company_id.toString() === profile?.actualCompany?.id && company.is_active
  //   )
  // );
  const setActivesEmployees = useLoggedUserStore((state) => state.setActivesEmployees);
  const { updateEmployee, createEmployee } = useEmployeesData();
  const router = useRouter();
  const url = process.env.NEXT_PUBLIC_PROJECT_URL;
  const mandatoryDocuments = useCountriesStore((state) => state.mandatoryDocuments);
  //console.log(user);
  const form = useForm<z.infer<typeof accordionSchema>>({
    resolver: zodResolver(accordionSchema),
    defaultValues: user
      ? {
          ...user,
          company_position: user.company_position, // Usar el nombre del puesto
          contractor_employee: user.contractor_employee,
          picture: user.picture || '', // Asegurar que picture siempre sea una cadena
          covenants_id: user.covenants_id,
          category_id: user.category_id,
          guild_id: user.guild_id,
          cost_center_id: user.cost_center_id,
          workflow_diagram: workDiagram?.find((e) => e.name?.trim() === user?.workflow_diagram?.trim())?.name.trim(),
        }
      : {
          lastname: '',
          firstname: '',
          nationality: undefined,
          born_date: undefined,
          cuil: '',
          document_type: undefined,
          document_number: '',
          birthplace: undefined,
          gender: undefined,
          marital_status: undefined,
          level_of_education: undefined,
          picture: '',
          street: '',
          street_number: '',
          province: undefined,
          city: undefined,
          postal_code: '',
          phone: '',
          email: '',
          file: '',
          hierarchical_position: undefined,
          company_position: undefined,
          workflow_diagram: undefined,
          type_of_contract: undefined,
          allocated_to: [],
          date_of_admission: undefined,
          guild_id: undefined,
          covenants_id: undefined,
          category_id: undefined,
          cost_center_id: undefined,
        },
  });

  const hierarchicalPosition = useWatch({ control: form.control, name: 'hierarchical_position' });
  const hierarchicalPositionId = hierarchyOptions?.find((option) => option.name === hierarchicalPosition)?.id;
  // Estado para el nombre del puesto mostrado
  const [displayedPositionName, setDisplayedPositionName] = useState('');
  // Definir el tipo para las aptitudes
  interface Aptitud {
    id: string;
    nombre: string;
    tiene_aptitud: boolean;
  }

  const [aptitudes, setAptitudes] = useState<Aptitud[]>([]);
  const [loadingAptitudes, setLoadingAptitudes] = useState(false);
  const [datosInicialesCargados, setDatosInicialesCargados] = useState(false);

  // Obtener el ID del empleado que se está editando (puede ser el usuario actual o uno pasado como prop)
  const employeeId = user?.id; // O pasarlo como prop: `const { employeeId } = props;`

  // Efecto para cargar los datos iniciales del empleado una sola vez
  useEffect(() => {
    if (!datosInicialesCargados && user?.company_position && company_positions) {
      const position = company_positions.find(
        (p) => p.name === user.company_position || p.id === user.company_position
      );
      if (position) {
        // Actualizar el formulario con el ID del puesto
        form.setValue('company_position', user.company_position);
        // Cargar las aptitudes
        fetchAptitudesPorPuesto(position.id);
        setDatosInicialesCargados(true);
      }
    }
    const workflowDiagramId = workDiagram?.find((e) => e.name === user?.workflow_diagram)?.name.trim();
    if (workflowDiagramId) {
      form.setValue('workflow_diagram', workflowDiagramId);
    }
  }, [datosInicialesCargados, user?.company_position, company_positions, user?.workflow_diagram]);

  // Efecto para manejar cambios en el puesto seleccionado
  useEffect(() => {
    const updatePositionName = (positionId: string | undefined) => {
      if (positionId && company_positions) {
        const position = company_positions.find((p) => p.id === positionId);
        if (position) {
          setDisplayedPositionName(position.name);
          // Cargar aptitudes inmediatamente al cambiar el puesto
          fetchAptitudesPorPuesto(positionId);
        } else {
          setDisplayedPositionName('');
          setAptitudes([]);
        }
      } else {
        setDisplayedPositionName('');
        setAptitudes([]);
      }
    };

    // Obtener el nombre del puesto actual
    const currentPositionName = form.getValues('company_position');

    updatePositionName(currentPositionName);

    // Suscribirse a cambios en el campo company_position
    const subscription = form.watch((value, { name }) => {
      if (name === 'company_position') {
        // Buscar el ID del puesto usando el nombre
        const position = company_positions?.find((p) => p.name === value.company_position);
        if (position) {
          // Actualizar el formulario con el ID del puesto
          form.setValue('company_position', position.id);
          // Actualizar el nombre mostrado
          setDisplayedPositionName(position.name);
          // Cargar las nuevas aptitudes
          fetchAptitudesPorPuesto(position.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, company_positions]);

  // Efecto para depurar cambios en las aptitudes

  useEffect(() => {
    // Cuando cambie la posición jerárquica o se cargue el usuario
    const currentId = form.getValues('company_position');
    const newName = company_positions?.find((cp) => cp.id === currentId)?.name || '';
    setDisplayedPositionName(newName);
  }, [hierarchicalPositionId, user?.company_position]);

  const filteredPositions = company_positions
    ? company_positions
        .filter((cp) => (hierarchicalPositionId ? cp.hierarchical_position_id?.includes(hierarchicalPositionId) : true))
        .map((cp) => cp.name) // Usamos solo los nombres
    : [];

  const currentPositionName = company_positions?.find((cp) => cp.id === user?.company_position)?.name || '';
  const [accordion1Errors, setAccordion1Errors] = useState(false);
  const [accordion2Errors, setAccordion2Errors] = useState(false);
  const [accordion3Errors, setAccordion3Errors] = useState(false);
  const [readOnly, setReadOnly] = useState(accion === 'view' ? true : false);

  const provinceId = provincesOptions?.find((province: Province) => province.name.trim() === user?.province)?.id;

  useEffect(() => {
    if (provinceId) {
      fetchCityValues(provinceId);
    }

    const { errors } = form.formState;

    // Inicializa un nuevo estado de error para los acordeones
    const acordeon1 = [];
    const acordeon2 = [];
    const acordeon3 = [];

    // Itera sobre los errores de validación
    for (const error of Object.keys(errors)) {
      //Si todos los acordeones tienen errores parar de iterar

      if (PERSONALDATA.find((e) => e.name === error)) {
        acordeon1.push(error);
      }
      if (CONTACTDATA.find((e) => e.name === error)) {
        acordeon2.push(error);
      }
      if (LABORALDATA.find((e) => e.name === error)) {
        acordeon3.push(error);
      }
    }
    if (acordeon1?.length > 0) {
      setAccordion1Errors(true);
    } else {
      setAccordion1Errors(false);
    }
    if (acordeon2?.length > 0) {
      setAccordion2Errors(true);
    } else {
      setAccordion2Errors(false);
    }
    if (acordeon3?.length > 0) {
      setAccordion3Errors(true);
    } else {
      setAccordion3Errors(false);
    }
  }, [form.formState.errors, provinceId, employees, user]);

  const PERSONALDATA = [
    {
      label: 'Nombre',
      type: 'text',
      placeholder: 'Nombre',
      name: 'firstname',
    },
    {
      label: 'Apellido',
      type: 'text',
      placeholder: 'Apellido',
      name: 'lastname',
    },
    {
      label: 'Nacionalidad',
      type: 'select',
      placeholder: 'Nacionalidad',
      options: nacionaliOptionsENUM,
      name: 'nationality',
    },
    {
      label: 'Fecha de nacimiento',
      type: 'text',
      placeholder: 'Fecha de nacimiento',
      name: 'born_date',
    },
    {
      label: 'CUIL',
      type: 'text',
      placeholder: 'CUIL',
      name: 'cuil',
    },
    {
      label: 'Tipo de documento',
      type: 'select',
      placeholder: 'Tipo de documento',
      options: documentOptionsENUM,
      name: 'document_type',
    },
    {
      label: 'Numero de documento',
      type: 'text',
      placeholder: 'Numero de documento',
      name: 'document_number',
    },
    {
      label: 'País de nacimiento',
      type: 'select',
      placeholder: 'País de nacimiento',
      options: countryOptions,
      name: 'birthplace',
    },
    {
      label: 'Sexo',
      type: 'select',
      placeholder: 'Sexo',
      options: genderOptionsENUM,
      name: 'gender',
    },
    {
      label: 'Estado civil',
      type: 'select',
      placeholder: 'Estado civil',
      options: civilStateOptionsENUM,
      name: 'marital_status',
    },
    {
      label: 'Nivel de instrucción',
      type: 'select',
      placeholder: 'Nivel de instruccion',
      options: instrutionsOptionsENUM,
      name: 'level_of_education',
    },
    {
      label: 'Foto',
      type: 'file',
      placeholder: 'Foto',
      name: 'picture',
    },
  ];
  const CONTACTDATA = [
    {
      label: 'Calle',
      type: 'text',
      placeholder: 'Calle',
      name: 'street',
    },
    {
      label: 'Altura',
      type: 'text',
      placeholder: 'Altura',
      name: 'street_number',
    },
    {
      label: 'Provincia',
      type: 'select',
      placeholder: 'Provincia',
      options: provincesOptions,
      name: 'province',
    },
    {
      label: 'Ciudad',
      type: 'select',
      placeholder: 'Ciudad',
      options: citysOptions,
      name: 'city',
    },
    {
      label: 'Codigo postal',
      type: 'text',
      placeholder: 'Codigo postal',
      name: 'postal_code',
    },
    {
      label: 'Teléfono',
      type: 'text',
      placeholder: 'Teléfono',
      name: 'phone',
    },
    {
      label: 'Email',
      type: 'text',
      placeholder: 'Email',
      name: 'email',
    },
  ];
  const LABORALDATA = [
    {
      label: 'Legajo',
      type: 'number',
      placeholder: 'Legajo',
      name: 'file',
      pattern: '[0-9]+',
      required: true,
    },
    {
      label: 'Sector',
      type: 'select',
      placeholder: 'Sector',
      options: hierarchyOptions,
      name: 'hierarchical_position',
      required: true,
    },
    {
      label: 'Puesto en la empresa',
      type: 'select',
      placeholder: 'Selecciona un puesto',
      options: filteredPositions,
      name: 'company_position',
      value: currentPositionName, // Valor inicial mostrado
      // Agrega esta propiedad adicional
      extraData: {
        company_positions,
        currentId: user?.company_position,
      },
      required: true,
    },

    {
      label: 'Diagrama de trabajo',
      type: 'select',
      placeholder: 'Diagrama de trabajo',
      options: workDiagramOptions,
      name: 'workflow_diagram',
      required: true,
    },
    {
      label: 'Horas normales',
      type: 'number',
      placeholder: 'Horas normales',
      name: 'normal_hours',
      pattern: '[0-9]+',
      inputMode: 'numeric',
      required: false,
    },
    {
      label: 'Tipo de contrato',
      type: 'select',
      placeholder: 'Tipo de contrato',
      options: contract_types.map((contractType) => contractType.name),
      name: 'type_of_contract',
      required: false,
    },
    {
      label: 'Afectado A',
      type: 'select',
      placeholder: 'Afectado A',
      options: contractorCompanies,
      name: 'allocated_to',
      required: false,
    },
    {
      label: 'Fecha de ingreso',

      placeholder: 'Fecha de ingreso',
      name: 'date_of_admission',
      required: false,
    },
    {
      label: 'Sindicato',
      type: 'combobox',
      placeholder: 'Sindicato',
      options: guild,
      name: 'guild_id',
      required: false,
    },
    {
      label: 'Convenio',
      type: 'combobox',
      placeholder: 'Convenio',
      options: covenants
        ?.filter((e) => e.guild_id === form.getValues('guild_id'))
        .map((e) => {
          return {
            label: e.name,
            value: e.id,
          };
        }),
      name: 'covenants_id',
      required: false,
    },
    {
      label: 'Categoria',
      type: 'combobox',
      placeholder: 'Categoria',
      options: categories
        ?.filter((e) => e.covenant_id === form.getValues('covenants_id'))
        .map((e) => {
          return {
            label: e.name,
            value: e.id,
          };
        }),
      name: 'category_id',
      required: false,
    },
    {
      label: 'Centro de costo',
      type: 'combobox',
      placeholder: 'Centro de costo',
      options: cost_center.map((e) => ({
        label: e.name,
        value: e.id,
      })),
      name: 'cost_center_id',
      required: false,
    },
  ];

  const handleProvinceChange = (name: any) => {
    const provinceId = provincesOptions.find((province: Province) => province.name.trim() === name)?.id;
    fetchCityValues(provinceId);
  };

  async function onCreate(values: z.infer<typeof accordionSchema>) {
    //console.log(values);
    toast.promise(
      async () => {
        const { full_name, ...rest } = values;

        // Obtener el company_id de la cookie actualComp
        const companyId = Cookies.get('actualComp');
        //console.log(companyId);
        // Validar que el company_id sea un UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!companyId) {
          throw new Error(
            'No se pudo obtener el ID de la compañía. Por favor, asegúrate de haber seleccionado una empresa.'
          );
        }

        if (!uuidRegex.test(companyId)) {
          console.error('El ID de la compañía no tiene un formato UUID válido:', companyId);
          throw new Error('El ID de la compañía no es válido. Por favor, selecciona una empresa nuevamente.');
        }

        // Validar que los campos que requieren UUID tengan el formato correcto
        const provinceId = provincesOptions.find((e) => e.name.trim() === values.province)?.id;
        const birthplaceId = countryOptions.find((e) => e.name === values.birthplace)?.id;
        const cityId = citysOptions.find((e) => e.name.trim() === values.city)?.id;
        const hierarchicalPositionId = hierarchyOptions.find((e) => e.name === values.hierarchical_position)?.id;
        const workflowDiagramId = workDiagramOptions.find((e) => e.name === values.workflow_diagram)?.id;

        // Obtener el ID del puesto seleccionado
        //console.log(values.company_position);
        const companyPosition = company_positions?.find((p) => p.name === values.company_position);
        const companyPositionId = values.company_position;

        //console.log(provinceId);
        //console.log(birthplaceId);
        //console.log(cityId);
        //console.log(hierarchicalPositionId);
        //console.log(workflowDiagramId);
        //console.log(companyPositionId);

        if (
          !provinceId ||
          !birthplaceId ||
          !cityId ||
          !hierarchicalPositionId ||
          !workflowDiagramId ||
          !companyPositionId
        ) {
          throw new Error(
            'Error al validar los datos. Por favor, verifica que todos los campos estén completos correctamente.'
          );
        }

        const fileExtension = imageFile?.name.split('.').pop();
        const finalValues = {
          ...rest,
          company_id: companyId,
          date_of_admission:
            values.date_of_admission instanceof Date
              ? values.date_of_admission.toISOString()
              : values.date_of_admission,
          born_date: values.born_date instanceof Date ? values.born_date.toISOString() : values.born_date,
          province: String(provinceId),
          birthplace: String(birthplaceId),
          city: String(cityId),
          hierarchical_position: String(hierarchicalPositionId),
          company_position: companyPositionId, // Usar el ID del puesto en lugar del nombre
          workflow_diagram: String(workflowDiagramId),
          picture: fileExtension
            ? `${url}/${values.document_number}.${fileExtension}`.trim()
            : values.gender === 'Masculino'
              ? 'https://ui.shadcn.com/avatars/02.png'
              : 'https://ui.shadcn.com/avatars/05.png',
        };
        //console.log(finalValues);
        try {
          const applies = await createEmployee(finalValues as any);
          const documentsMissing: {
            applies: number;
            id_document_types: string;
            validity: string | null;
            user_id: string | undefined;
          }[] = [];

          mandatoryDocuments?.Persona?.forEach(async (document) => {
            documentsMissing.push({
              applies: applies[0].id,
              id_document_types: document.id,
              validity: null,
              user_id: loggedUser,
            });
          });

          const { data, error } = await supabase.from('documents_employees').insert(documentsMissing).select();

          if (error) throw error;

          // Guardar las aptitudes del nuevo empleado
          const nuevoEmpleadoId = applies?.[0]?.id;
          if (nuevoEmpleadoId) {
            await saveAptitudes(nuevoEmpleadoId);
          }

          await handleUpload();
          router.refresh();
          router.push('/dashboard/employee');
        } catch (error: PostgrestError | any) {
          throw new Error(handleSupabaseError(error.message));
        }
      },
      {
        loading: 'Agregando empleado...',
        success: 'Empleado agregado correctamente',
        error: (error) => {
          return error;
        },
      }
    );
  }

  // 2. Define a submit handler.
  // Función auxiliar para guardar aptitudes
  const saveAptitudes = async (employeeId: string) => {
    try {
      const operaciones = aptitudes.map((apt) => {
        if (apt.tiene_aptitud) {
          return supabase.from('empleado_aptitudes').upsert(
            {
              empleado_id: employeeId,
              aptitud_id: apt.id,
              tiene_aptitud: true,
              fecha_verificacion: new Date().toISOString(),
            },
            {
              onConflict: 'empleado_id,aptitud_id',
            }
          );
        } else {
          return supabase.from('empleado_aptitudes').delete().match({ empleado_id: employeeId, aptitud_id: apt.id });
        }
      });

      const results = await Promise.all(operaciones);
      const hasError = results.some((r) => r.error);
      if (hasError) throw new Error('Error al guardar aptitudes');
    } catch (error) {
      toast.error('Error al guardar las aptitudes');
      console.error('Error guardando aptitudes:', error);
      throw error; // Propagamos el error para que se capture en el catch principal
    }
  };

  async function onUpdate(values: z.infer<typeof accordionSchema>) {
    // Obtener el company_id de la cookie actualComp
    const companyId = Cookies.get('actualComp');

    if (!companyId) {
      throw new Error(
        'No se pudo obtener el ID de la compañía. Por favor, asegúrate de haber seleccionado una empresa.'
      );
    }

    function compareContractorEmployees(
      originalObj: z.infer<typeof accordionSchema>,
      modifiedObj: z.infer<typeof accordionSchema>
    ) {
      const originalSet = new Set(originalObj.allocated_to);
      const modifiedSet = new Set(modifiedObj.allocated_to);
      // Valores a eliminar
      const valuesToRemove = [...originalSet].filter((value) => !modifiedSet.has(value));

      // Valores a agregar
      const valuesToAdd = [...modifiedSet].filter((value) => !originalSet.has(value));

      // Valores que se mantienen
      const valuesToKeep = [...originalSet].filter((value) => modifiedSet.has(value));

      return {
        valuesToRemove,
        valuesToAdd,
        valuesToKeep,
      };
    }

    toast.promise(
      async () => {
        const { full_name, ...rest } = values;

        //console.log(values, 'values');
        //console.log(citysOptions, 'citysOptions');

        const finalValues = {
          ...rest,
          company_id: companyId,
          date_of_admission:
            values.date_of_admission instanceof Date
              ? values.date_of_admission.toISOString()
              : values.date_of_admission,
          born_date: values.born_date instanceof Date ? values.born_date.toISOString() : values.born_date,
          province: String(provincesOptions.find((e) => e.name.trim() === values.province)?.id),
          birthplace: String(countryOptions.find((e) => e.name === values.birthplace)?.id),
          city: String(citysOptions.find((e) => e.name.trim() === values.city.trim())?.id),
          hierarchical_position: String(hierarchyOptions.find((e) => e.name === values.hierarchical_position)?.id),
          company_position: values.company_position,
          workflow_diagram: String(
            workDiagramOptions.find((e) => e.name.trim() === values.workflow_diagram.trim())?.id
          ),
        };

        if ((!finalValues.city || finalValues.city === 'undefined') && values.city) {
          const { data } = await supabase.from('cities').select().ilike('name', `${values.city.trim()}%`);
          //console.log(data, 'data de city');
          if (data?.length) {
            finalValues.city = data[0].id;
          }
        }

        const result = compareContractorEmployees(user, finalValues as any);
        result.valuesToRemove.forEach(async (e) => {
          const { error } = await supabase
            .from('contractor_employee')
            .delete()
            .eq('employee_id', user.id)
            .eq('contractor_id', e);
          if (error) return handleSupabaseError(error.message);
        });

        const error2 = await Promise.all(
          result.valuesToAdd.map(async (e) => {
            if (!result.valuesToKeep.includes(e)) {
              const { error } = await supabase
                .from('contractor_employee')
                .insert({ employee_id: user.id, contractor_id: e });
              if (error) return handleSupabaseError(error.message);
            }
          })
        );

        if (error2 && typeof error2[0] === 'string') {
          throw new Error(error2[0]);
        }

        try {
          await updateEmployee(finalValues as any, user?.id);
          await saveAptitudes(user.id);
          await handleUpload();
          router.refresh();
        } catch (error: PostgrestError | any) {
          throw new Error(handleSupabaseError(error.message));
        }
      },
      {
        loading: 'Actualizando empleado...',
        success: 'Empleado actualizado correctamente',
        error: (error) => {
          return error;
        },
      }
    );
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setImageFile(file);
      // Convertir la imagen a base64
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setBase64Image(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    const document_number = form.getValues('document_number');

    // Si no hay archivo de imagen, no intentar subir nada
    if (!imageFile) {
      return;
    }

    const fileExtension = imageFile.name.split('.').pop();
    try {
      const renamedFile = new File([imageFile], `${document_number}.${fileExtension}`, {
        type: `image/${fileExtension?.replace(/\s/g, '')}`,
      });
      await uploadImage(renamedFile, 'employee-photos');
      const employeeImage = `${url}/employee-photos/${document_number}.${fileExtension}?timestamp=${Date.now()}`
        .trim()
        .replace(/\s/g, '');
      const { data, error } = await supabase
        .from('employees')
        .update({ picture: employeeImage })
        .eq('document_number', document_number);
    } catch (error: any) {
      // toast({
      //   variant: 'destructive',
      //   title: 'Error al subir la imagen',
      //   description:
      //     'No pudimos registrar la imagen, pero el ususario fue registrado correctamente',
      // })
    }
  };
  const today = new Date();
  const nextMonth = addMonths(new Date(), 1);
  const [month, setMonth] = useState<Date>(nextMonth);

  const yearsAhead = Array.from({ length: 70 }, (_, index) => {
    const year = today.getFullYear() - index - 1;
    return year;
  });
  const [years, setYear] = useState(today.getFullYear().toString());

  const formSchema = z.object({
    reason_for_termination: z.string({
      required_error: 'La razón de la baja es requerida.',
    }),
    termination_date: z.date({
      required_error: 'La fecha de baja es requerida.',
    }),
  });

  const [showModal, setShowModal] = useState(false);

  async function onDelete(values: z.infer<typeof formSchema>) {
    const data = {
      ...values,
      termination_date: format(values.termination_date, 'yyyy-MM-dd'),
    };

    try {
      await supabase
        .from('employees')
        .update({
          is_active: false,
          termination_date: data.termination_date,
          reason_for_termination: data.reason_for_termination,
        })
        .eq('document_number', user.document_number)
        .select();

      setShowModal(!showModal);

      toast('Emplead@ eliminado', { description: `El emplead@ ${user.full_name} ha sido eliminado` });
      setActivesEmployees();
      router.push('/dashboard/employee');
    } catch (error: any) {
      toast.error('Error al dar de baja al emplead@');
    }
  }
  const form2 = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason_for_termination: undefined,
    },
  });
  const guildId = useWatch({ control: form.control, name: 'guild_id' });
  const covenantsId = useWatch({ control: form.control, name: 'covenants_id' });
  // Definir el tipo para la respuesta de aptitudes_tecnicas_puestos
  interface AptitudPuesto {
    aptitud_id: string;
    aptitudes_tecnicas: {
      id: string;
      nombre: string;
    };
  }

  const fetchAptitudesPorPuesto = async (currentPositionId: string) => {
    setLoadingAptitudes(true);

    try {
      // Obtener aptitudes del puesto
      const { data: aptitudesPuesto, error } = (await supabase
        .from('aptitudes_tecnicas_puestos')
        .select(
          `
          aptitud_id,
          aptitudes_tecnicas!inner(
            id,
            nombre
          )
        `
        )
        .eq('puesto_id', currentPositionId)) as { data: AptitudPuesto[] | null; error: any };

      if (error) throw error;

      if (!aptitudesPuesto || aptitudesPuesto.length === 0) {
        setAptitudes([]);
        return;
      }

      // Obtener los IDs de las aptitudes del empleado desde las props
      const aptitudesEmpleado = employeeAptitudes?.map((a) => a.aptitud_id) || [];

      // Mapear las aptitudes con su estado
      const aptitudesConEstado = (aptitudesPuesto || [])
        .filter((ap) => ap.aptitudes_tecnicas !== null) // Filtrar aptitudes nulas
        .map((ap) => {
          const aptitud: Aptitud = {
            id: ap.aptitud_id,
            nombre: ap.aptitudes_tecnicas?.nombre || 'Aptitud desconocida',
            tiene_aptitud: aptitudesEmpleado.includes(ap.aptitud_id),
          };
          return aptitud;
        });

      setAptitudes(aptitudesConEstado);
    } catch (error) {
      toast.error('Error al cargar las aptitudes técnicas');
    } finally {
      setLoadingAptitudes(false);
    }
  };

  const handleAptitudChange = async (aptitudId: string, checked: boolean) => {
    // if (!user?.id) return;

    try {
      // Actualizar el estado local
      setAptitudes((prevAptitudes) =>
        prevAptitudes.map((apt) => (apt.id === aptitudId ? { ...apt, tiene_aptitud: checked } : apt))
      );

      // Actualizar en la base de datos
      // if (checked) {
      //   // Insertar o actualizar la relación empleado-aptitud
      //   const { error } = await supabase.from('empleado_aptitudes').upsert(
      //     {
      //       empleado_id: user.id,
      //       aptitud_id: aptitudId,
      //       tiene_aptitud: true,
      //       fecha_verificacion: new Date().toISOString(),
      //     },
      //     { onConflict: 'empleado_id,aptitud_id' }
      //   );

      //   if (error) throw error;
      // } else {
      //   // Eliminar la relación si se desmarca
      //   const { error } = await supabase.from('empleado_aptitudes').delete().match({
      //     empleado_id: user.id,
      //     aptitud_id: aptitudId,
      //   });

      //   if (error) throw error;
      // }

      // toast.success('Aptitud actualizada correctamente');
    } catch (error) {
      console.error('Error al actualizar aptitud:', error);
      toast.error('Error al actualizar la aptitud');
      // Revertir el cambio en caso de error
      if (form.getValues('company_position')) {
        fetchAptitudesPorPuesto(form.getValues('company_position'));
      }
    }
  };

  const handlePositionChange = async (currentPositionId: string) => {
    const selectedPosition = company_positions?.find((cp) => cp.id === currentPositionId);
    if (selectedPosition) {
      form.setValue('company_position', currentPositionId, { shouldValidate: true });
      setDisplayedPositionName(selectedPosition.name);

      // Obtener las nuevas aptitudes del puesto
      const { data: aptitudesPuesto, error } = await supabase
        .from('aptitudes_tecnicas_puestos')
        .select('aptitud_id')
        .eq('puesto_id', currentPositionId);

      if (error) throw error;

      const nuevasAptitudes = aptitudesPuesto?.map((ap) => ap.aptitud_id) || [];

      // Paso 1: Eliminar aptitudes anteriores que no están en las nuevas
      if (employeeId) {
        const { data: anterioresEmpleado, error: errorAnteriores } = await supabase
          .from('empleado_aptitudes')
          .select('aptitud_id')
          .eq('empleado_id', employeeId);

        if (errorAnteriores) throw errorAnteriores;

        const anteriores = anterioresEmpleado?.map((a) => a.aptitud_id) || [];

        const aptitudesAEliminar = anteriores.filter((id) => !nuevasAptitudes.includes(id));

        if (aptitudesAEliminar.length > 0) {
          const { error: errorDelete } = await supabase
            .from('empleado_aptitudes')
            .delete()
            .in('aptitud_id', aptitudesAEliminar)
            .eq('empleado_id', employeeId);

          if (errorDelete) throw errorDelete;
        }
      }

      // Paso 2: Agregar aptitudes nuevas si no están
      for (const apt of nuevasAptitudes) {
        const existe = employeeAptitudes?.some((ea) => ea.aptitud_id === apt);
        if (!existe) {
          await supabase.from('empleado_aptitudes').upsert({
            empleado_id: employeeId,
            aptitud_id: apt,
            tiene_aptitud: false,
            fecha_verificacion: new Date().toISOString(),
          });
        }
      }

      // Cargar aptitudes para el puesto seleccionado
      await fetchAptitudesPorPuesto(currentPositionId);
    } else {
      setAptitudes([]);
      setDisplayedPositionName('');
    }
  };

  return (
    <section>
      <header className="flex justify-between gap-4 flex-wrap">
        <CardHeader className="min-h-[152px] flex flex-row gap-4 justify-between items-center flex-wrap w-full bg-muted dark:bg-muted/50 border-b-2">
          {accion === 'edit' || accion === 'view' ? (
            <div className="flex gap-3 items-center">
              <CardTitle className=" font-bold tracking-tight">
                <Avatar className="size-[100px] rounded-full border-2 border-black/30">
                  <AvatarImage
                    className="object-cover rounded-full"
                    src={
                      user?.picture || 'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80'
                    }
                    alt="Imagen del empleado"
                  />
                  <AvatarFallback>
                    <Loader className="animate-spin" />
                  </AvatarFallback>
                </Avatar>
              </CardTitle>
              <CardDescription className="text-muted-foreground text-3xl flex items-center gap-4">
                {`${user?.lastname || 'cargando...'}
                ${user?.firstname || ''}`}{' '}
                {!user?.is_active && <Badge variant={'destructive'}>Dado de baja</Badge>}
              </CardDescription>
            </div>
          ) : (
            <h2 className="text-4xl">{accion === 'edit' ? 'Editar empleado' : 'Agregar empleado'}</h2>
          )}
          <div className="flex gap-2">
            {role !== 'Invitado' && readOnly && accion === 'view' && (
              <Button
                variant="default"
                onClick={() => {
                  setReadOnly(false);
                }}
              >
                Habilitar edición
              </Button>
            )}

            {!readOnly && accion !== 'new' && role !== 'Invitado' && (
              <div className="flex">
                <Dialog onOpenChange={() => setShowModal(!showModal)}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Dar de baja</Button>
                  </DialogTrigger>
                  {/* <BackButton /> */}
                  <DialogContent className="dark:bg-slate-950">
                    <DialogTitle>Dar de baja</DialogTitle>
                    <DialogDescription>
                      ¿Estás seguro de que deseas eliminar este empleado?
                      <br /> Completa los campos para continuar.
                    </DialogDescription>
                    <AlertDialogFooter>
                      <div className="w-full">
                        <Form {...form2}>
                          <form onSubmit={form2.handleSubmit(onDelete)} className="space-y-8">
                            <FormField
                              control={form2.control}
                              name="reason_for_termination"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Motivo de baja</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecciona la razón" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Despido sin causa">Despido sin causa</SelectItem>
                                      <SelectItem value="Renuncia">Renuncia</SelectItem>
                                      <SelectItem value="Despido con causa">Despido con causa</SelectItem>
                                      <SelectItem value="Acuerdo de partes">Acuerdo de partes</SelectItem>
                                      <SelectItem value="Fin de contrato">Fin de contrato</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Elige la razón por la que deseas eliminar al empleado
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form2.control}
                              name="termination_date"
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel>Fecha de baja</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant={'outline'}
                                          className={cn(
                                            ' pl-3 text-left font-normal',
                                            !field.value && 'text-muted-foreground'
                                          )}
                                        >
                                          {field.value ? (
                                            format(field.value, 'PPP', {
                                              locale: es,
                                            })
                                          ) : (
                                            <span>Elegir fecha</span>
                                          )}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" align="start">
                                      <Select
                                        onValueChange={(e) => {
                                          setMonth(new Date(e));
                                          setYear(e);
                                          const newYear = parseInt(e, 10);
                                          const dateWithNewYear = new Date(field.value);
                                          dateWithNewYear.setFullYear(newYear);
                                          field.onChange(dateWithNewYear);
                                          setMonth(dateWithNewYear);
                                        }}
                                        value={years || today.getFullYear().toString()}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Elegir año" />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                          <SelectItem
                                            value={today.getFullYear().toString()}
                                            disabled={years === today.getFullYear().toString()}
                                          >
                                            {today.getFullYear().toString()}
                                          </SelectItem>
                                          {yearsAhead?.map((year) => (
                                            <SelectItem key={year} value={`${year}`}>
                                              {year}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Calendar
                                        month={month}
                                        onMonthChange={setMonth}
                                        toDate={today}
                                        locale={es}
                                        mode="single"
                                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                        selected={new Date(field.value) || today}
                                        onSelect={(e) => {
                                          field.onChange(e);
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <FormDescription>Fecha en la que se terminó el contrato</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-4 justify-end">
                              <Button variant="destructive" type="submit">
                                Eliminar
                              </Button>
                              <DialogClose>Cancelar</DialogClose>
                            </div>
                          </form>
                        </Form>
                      </div>
                    </AlertDialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            <BackButton />
          </div>
        </CardHeader>
      </header>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(accion === 'edit' || accion === 'view' ? onUpdate : onCreate)}
          className="w-full"
        >
          <Tabs defaultValue="personalData" className="w-full m-4">
            <TabsList>
              <TabsTrigger value={'personalData'} className={cn(accordion1Errors && 'bg-red-300 text-red-50')}>
                Datos Personales
              </TabsTrigger>
              <TabsTrigger value={'contactData'} className={cn(accordion2Errors && 'bg-red-300 text-red-50')}>
                Datos de Contacto
              </TabsTrigger>
              <TabsTrigger value={'workData'} className={cn(accordion3Errors && 'bg-red-300 text-red-50')}>
                Datos Laborales
              </TabsTrigger>
              {user && <TabsTrigger value="documents">Documentación</TabsTrigger>}
              {user && <TabsTrigger value="diagrams">Diagramas</TabsTrigger>}
            </TabsList>
            <TabsContent value="personalData" className="px-2 py-2">
              {accordion1Errors && (
                <Badge className="h-6 hover:no-underline" variant="destructive">
                  Falta corregir algunos campos
                </Badge>
              )}
              <div className="min-w-full max-w-sm flex flex-wrap gap-8 items-center">
                {PERSONALDATA?.map((data, index) => {
                  if (data.name === 'born_date') {
                    return (
                      // <div key={crypto.randomUUID()} className="w-[300px] flex flex-col gap-2">
                      <div key={data.name} className="w-[300px] flex flex-col gap-2">
                        <FormField
                          control={form.control}
                          name="born_date"
                          render={({ field }) => (
                            <FormItem className="">
                              <FormLabel>
                                Fecha de nacimiento <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormDatePicker field={field} disabled={readOnly} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  }
                  if (data.type === 'file') {
                    return (
                      // <div key={crypto.randomUUID()} className="w-[300px] flex  gap-2">
                      <div key={data.name} className="w-[300px] flex  gap-2">
                        <FormField
                          control={form.control}
                          name={data.name as names}
                          render={({ field }) => (
                            <FormItem className="">
                              <FormControl>
                                <div className="flex lg:items-center flex-wrap md:flex-nowrap flex-col lg:flex-row gap-8">
                                  <ImageHander
                                    labelInput="Subir foto"
                                    handleImageChange={handleImageChange}
                                    base64Image={base64Image} //nueva
                                    disabled={readOnly}
                                    inputStyle={{
                                      width: '400px',
                                      maxWidth: '300px',
                                    }}
                                  />
                                </div>
                              </FormControl>

                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  }
                  if (data.type === 'select') {
                    return (
                      // <div key={crypto.randomUUID()} className="w-[300px] flex flex-col gap-2">
                      <div key={data.name} className="w-[300px] flex flex-col gap-2">
                        <FormField
                          control={form.control}
                          name={data.name as names}
                          render={({ field }) => {
                            return (
                              <FormItem>
                                <FormLabel>
                                  {data.label}
                                  <span style={{ color: 'red' }}> *</span>
                                </FormLabel>

                                <SelectWithData
                                  disabled={readOnly}
                                  placeholder={data.placeholder}
                                  options={data.options}
                                  onChange={field.onChange}
                                  editing={true}
                                  value={field.value || ''}
                                  field={{ ...field }}
                                />

                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    );
                  } else {
                    return (
                      // <div key={crypto.randomUUID()} className="w-[300px] flex flex-col gap-2 ">
                      <div key={data.name} className="w-[300px] flex flex-col gap-2 ">
                        <FormField
                          control={form.control}
                          name={data.name as names}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {data.label}
                                <span style={{ color: 'red' }}> *</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled={readOnly}
                                  type={data.type}
                                  id={data.label}
                                  placeholder={data.placeholder}
                                  className="w-[300px"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  }
                })}
              </div>
            </TabsContent>
            <TabsContent value="contactData" className="px-2 py-2">
              {accordion2Errors && (
                <Badge className="h-6" variant="destructive">
                  Falta corregir algunos campos
                </Badge>
              )}
              <div className="min-w-full max-w-sm flex flex-wrap gap-8">
                {CONTACTDATA?.map((data, index) => {
                  if (data.type === 'select') {
                    return (
                      // <div key={crypto.randomUUID()} className="w-[300px] flex flex-col gap-2">
                      <div key={data.name} className="w-[300px] flex flex-col gap-2">
                        <FormField
                          control={form.control}
                          name={data.name as names}
                          render={({ field }) => {
                            return (
                              <FormItem>
                                <FormLabel>
                                  {data.label}
                                  <span style={{ color: 'red' }}> *</span>
                                </FormLabel>
                                <FormControl>
                                  <SelectWithData
                                    disabled={readOnly}
                                    placeholder={data.placeholder}
                                    field={{ ...field }}
                                    options={data.options}
                                    editing={true}
                                    value={field.value || ''}
                                    handleProvinceChange={data.label === 'Provincia' ? handleProvinceChange : undefined}
                                    onChange={(event) => {
                                      if (data.name === 'province') {
                                        handleProvinceChange(event);
                                      }

                                      field.onChange(event);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    );
                  } else {
                    return (
                      // <div key={crypto.randomUUID()} className="w-[300px] flex flex-col gap-2">
                      <div key={data.name} className="w-[300px] flex flex-col gap-2">
                        <FormField
                          control={form.control}
                          name={data.name as names}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {data.label}
                                <span style={{ color: 'red' }}> *</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled={readOnly}
                                  type={data.type}
                                  id={data.label}
                                  placeholder={data.placeholder}
                                  className="w-[300px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  }
                })}
              </div>
            </TabsContent>
            <TabsContent value="workData" className="px-2 py-2">
              {accordion3Errors && (
                <Badge className="h-6" variant="destructive">
                  Faltan corregir algunos campos
                </Badge>
              )}
              <div className="min-w-full max-w-sm flex flex-wrap gap-8">
                {LABORALDATA?.map((data, index) => {
                  if (data.name === 'company_position') {
                    const filteredPositions =
                      company_positions?.filter((cp) =>
                        hierarchicalPositionId ? cp.hierarchical_position_id?.includes(hierarchicalPositionId) : true
                      ) || [];

                    return (
                      <div key={data.name} className="w-[300px] flex flex-col gap-2">
                        <FormField
                          control={form.control}
                          name="company_position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Puesto en la empresa
                                <span style={{ color: 'red' }}> *</span>
                              </FormLabel>
                              <SelectWithData
                                disabled={readOnly}
                                placeholder="Selecciona un puesto"
                                options={filteredPositions.map((p) => p.name) || []}
                                onChange={(value) => {
                                  const selectedPosition = company_positions?.find((p) => p.name === value);
                                  if (selectedPosition) {
                                    field.onChange(selectedPosition.id);
                                    handlePositionChange(selectedPosition.id);
                                  }
                                }}
                                value={company_positions?.find((p) => p.id === field.value)?.name || ''}
                                field={{
                                  ...field,
                                  value: company_positions?.find((p) => p.id === field.value)?.name || '',
                                }}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  }
                  if (data.name === 'date_of_admission') {
                    return (
                      <div key={data.name} className="w-[300px] flex flex-col gap-2 mb-22justify-center">
                        <FormField
                          control={form.control}
                          name="date_of_admission"
                          render={({ field }) => (
                            <FormItem className="">
                              <FormLabel>
                                Fecha de ingreso <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormDatePicker field={field} disabled={readOnly} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  }
                  if (data.type === 'select') {
                    const isMultiple = data.name === 'allocated_to' ? true : false;

                    if (isMultiple) {
                      return (
                        // <div key={crypto.randomUUID()}>
                        <div key={data.name}>
                          {role === 'Invitado' ? null : (
                            <div className="w-[300px] flex flex-col gap-2 justify-center">
                              <FormField
                                control={form.control}
                                name={data.name as names}
                                render={({ field }) => (
                                  <CheckboxDefaultValues
                                    disabled={readOnly}
                                    options={data.options}
                                    required={true}
                                    field={field}
                                    placeholder="Afectado a"
                                    defaultValues={user?.contractor_employee}
                                  />
                                )}
                              />
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      // <div key={crypto.randomUUID()} className="w-[300px] flex flex-col gap-2">
                      <div key={data.name} className="w-[300px] flex flex-col gap-2">
                        <FormField
                          control={form.control}
                          name={data.name as names}
                          render={({ field }) => {
                            return (
                              <FormItem>
                                <FormLabel>
                                  {data.label}
                                  <span style={{ color: 'red' }}> *</span>
                                </FormLabel>
                                <FormControl>
                                  <SelectWithData
                                    disabled={readOnly}
                                    placeholder={data.placeholder}
                                    isMultiple={isMultiple}
                                    options={data.options}
                                    field={{ ...field }}
                                    onChange={(event) => {
                                      field.onChange(event);
                                    }}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    );
                  } else if (data.type === 'combobox') {
                    return (
                      <FormField
                        // key={crypto.randomUUID()}
                        key={data.name}
                        control={form.control}
                        name={data.name as names}
                        render={({ field }) => {
                          let disabled = readOnly;

                          if (field.name === 'guild_id') {
                            // guild_id está habilitado a menos que readOnly sea true
                            disabled = readOnly;
                          } else if (field.name === 'covenants_id') {
                            // covenants_id está habilitado solo si guild_id tiene un valor
                            disabled = readOnly || !guildId;
                          } else if (field.name === 'category_id') {
                            // category_id está habilitado solo si covenants_id tiene un valor
                            disabled = readOnly || !covenantsId;
                          }
                          let selectedCovenantInfo = [{ name: '', id: '' }];
                          const selectedGuildInfo =
                            guild
                              ?.filter((e) => e.value === guildId)
                              ?.map((e) => {
                                selectedCovenantInfo = [{ name: '', id: '' }];
                                return {
                                  name: e.label,
                                  id: e.value,
                                };
                              }) || [];
                          selectedCovenantInfo =
                            covenants
                              ?.filter((e) => e.id === covenantsId)
                              .map((e) => {
                                return {
                                  name: e.name,
                                  id: e.id,
                                };
                              }) || [];

                          return (
                            <FormItem className="flex flex-col w-[300px]">
                              <FormLabel>{data.label}</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      disabled={disabled}
                                      value={field.value || ''}
                                      className={cn(
                                        'w-[300px] justify-between truncate',
                                        !field.value && 'text-muted-foreground'
                                      )}
                                    >
                                      {field.value
                                        ? (data?.options?.find((option: any) => option.value === field.value) as any)
                                            ?.label || field.value
                                        : `Seleccionar ${data.label}`}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 " />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="p-0">
                                  <Command>
                                    <CommandInput placeholder={`Buscar ${data.label}...`} />
                                    <CommandList>
                                      <CommandEmpty>Sin resultados</CommandEmpty>
                                      <CommandGroup>
                                        {data?.options?.map((option: any) => (
                                          <CommandItem
                                            value={option.label}
                                            key={option.value}
                                            onSelect={() => {
                                              form.setValue(`${data.name as names}`, option.value);
                                              if (field.name === 'guild_id') {
                                                form.setValue('covenants_id', '');
                                                form.setValue('category_id', '');
                                              }
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                'mr-2 h-4 w-4',
                                                option.value === field.value ? 'opacity-100' : 'opacity-0'
                                              )}
                                            />
                                            {option.label}
                                          </CommandItem>
                                        ))}
                                        <CommandItem>
                                          {(field.name === 'guild_id' && <AddGuildModal fromEmployee />) ||
                                            (field.name === 'covenants_id' && (
                                              <AddCovenantModal fromEmployee guildInfo={selectedGuildInfo[0]} />
                                            )) ||
                                            (field.name === 'category_id' && (
                                              <AddCategoryModal fromEmployee covenantInfo={selectedCovenantInfo[0]} />
                                            ))}
                                        </CommandItem>
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    );
                  } else {
                    return (
                      // <div key={crypto.randomUUID()} className="w-[300px] flex flex-col gap-2">
                      <div key={data.name} className="w-[300px] flex flex-col gap-2">
                        <FormField
                          control={form.control}
                          name={data.name as names}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {data.label}
                                {data.required && <span style={{ color: 'red' }}> *</span>}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled={readOnly}
                                  type={data.type}
                                  id={data.label}
                                  placeholder={data.placeholder}
                                  pattern={data.pattern}
                                  className="w-[300px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  }
                })}

                {/* Sección de Aptitudes Técnicas */}
                {form.watch('company_position') && (
                  <div className="w-full mt-6">
                    <h3 className="text-lg font-medium mb-4">Aptitudes Técnicas</h3>
                    {loadingAptitudes ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Cargando aptitudes...</span>
                      </div>
                    ) : aptitudes.length > 0 ? (
                      <div className="grid grid-cols-1 w-full md:grid-cols-2 lg:grid-cols-3 gap-1 p-1 overflow-x-auto scrollbar-hide min-w-fit">
                        {aptitudes.map((aptitud) => (
                          <div key={aptitud.id} className="flex items-center space-x-1 min-w-fit">
                            <Checkbox
                              id={`aptitud-${aptitud.id}`}
                              checked={aptitud.tiene_aptitud}
                              onCheckedChange={(checked) => handleAptitudChange(aptitud.id, checked === true)}
                              disabled={accion === 'view' && readOnly}
                            />
                            <label
                              htmlFor={`aptitud-${aptitud.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {aptitud.nombre}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay aptitudes técnicas definidas para este puesto.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="documents" className="px-2 py-2">
              {children}
            </TabsContent>
            <TabsContent value="diagrams" className="px-2 py-2">
              <DiagramDetailEmployeeView
                role={role}
                historyData={historyData}
                diagrams={diagrams as any}
                diagrams_types={diagrams_types}
                activeEmploees={activeEmploees}
              />
            </TabsContent>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="w-fit">
                    {accion !== 'view' || !readOnly ? (
                      <Button type="submit" className="mt-5 ml-2">
                        {accion === 'edit' || accion === 'view' ? 'Guardar cambios' : 'Agregar empleado'}
                      </Button>
                    ) : null}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  {!accordion1Errors && !accordion2Errors && !accordion3Errors
                    ? '¡Todo listo para agregar el empleado!'
                    : '¡Completa todos los campos para agregar el empleado'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Tabs>
        </form>
      </Form>
    </section>
  );
}
