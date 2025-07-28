'use client';
import { fetchallResources, fettchExistingEntries, updateDocumentType } from '@/app/server/GET/actions';
import {
  Condition,
  baseEmployeePropertiesConfig,
  baseVehiclePropertiesConfig,
  getEmployeePropertyValue,
  getVehiclePropertyValue,
  normalizeString,
  relationMeta,
} from '@/components/NewDocumentType';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select-combobox-condition';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { handleSupabaseError } from '@/lib/errorHandler';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useCountriesStore } from '@/store/countries';
import { Equipo } from '@/zodSchemas/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import cookies from 'js-cookie';
import { PlusCircle, Truck, User, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type Props = {
  Equipo: Equipo[0];
  employeeMockValues: Record<string, string[] | []>;
  vehicleMockValues: Record<string, string[] | []>;
  employees: EmployeeDetailed[];
  vehicles: VehicleWithBrand[];
};
export function EditModal({ Equipo, employeeMockValues, vehicleMockValues, employees, vehicles }: Props) {
  const supabase = supabaseBrowser();
  const [special, setSpecial] = useState(false);
  const [allResources, setAllResources] = useState<any[]>([]);
  const router = useRouter();
  const fetchDocumentTypes = useCountriesStore((state) => state.documentTypes);
  const actualCompany = cookies.get('actualComp');
  // console.log(actualCompany);
  const [showEmployeePreview, setShowEmployeePreview] = useState(false);
  const [showVehiclePreview, setShowVehiclePreview] = useState(false);
  const [showAlertsUpdateModal, setShowAlertsUpdateModal] = useState(false);
  const [resourcesNeedingAlerts, setResourcesNeedingAlerts] = useState<any[]>([]);
  const [resourcesNeedingDeletion, setResourcesNeedingDeletion] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conditions, setConditions] = useState<Condition[]>(() => {
    return (
      Equipo?.conditions?.map((c) => ({
        id: crypto.randomUUID(),
        property:
          c.property_label || baseVehiclePropertiesConfig.find((p) => p.accessor_key === c.property_key)?.label || '',
        values: c.reference_values?.length ? c.reference_values?.map((v) => v.value) : c.values || c.ids || [],
      })) || []
    );
  });

  const [matchingEmployees, setMatchingEmployees] = useState<EmployeeDetailed[]>([]);
  const [matchingVehicles, setMatchingVehicles] = useState<VehicleWithBrand[]>([]);
  // Estado para mantener las propiedades con sus valores dinámicos
  const [employeePropertiesConfig, setEmployeePropertiesConfig] = useState(
    baseEmployeePropertiesConfig?.map((prop) => ({ ...prop, values: [] as string[] }))
  );
  const [vehiclePropertiesConfig, setVehiclePropertiesConfig] = useState(
    baseVehiclePropertiesConfig?.map((prop) => ({ ...prop, values: [] as string[] }))
  );
  const FormSchema = z.object({
    name: z
      .string({ required_error: 'Este campo es requerido' })
      .min(3, { message: 'El nombre debe contener mas de 3 caracteres' })
      .max(50, { message: 'El nombre debe contener menos de 50 caracteres' }),
    applies: z.enum(['Persona', 'Equipos', 'Empresa'], {
      required_error: 'Este campo es requerido',
    }),
    multiresource: z.boolean({
      required_error: 'Se debe seleccionar una opcion',
    }),
    mandatory: z.boolean({ required_error: 'Se debe seleccionar una opcion' }),
    explired: z.boolean({ required_error: 'Se debe seleccionar una opcion' }),
    special: z.boolean({ required_error: 'Este campo es requerido' }),
    description: special ? z.string({ required_error: 'Este campo es requerido' }) : z.string().optional(),
    is_it_montlhy: z.boolean({ required_error: 'Se debe seleccionar una opcion' }).optional(),
    private: z.boolean({ required_error: 'Se debe seleccionar una opcion' }).optional(),
    down_document: z.boolean({ required_error: 'Este campo es requerido' }),
  });
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: Equipo.name,
      multiresource: Equipo.multiresource,
      mandatory: Equipo.mandatory,
      explired: Equipo.explired,
      special: Equipo.special,
      applies: Equipo.applies as 'Persona' | 'Equipos' | 'Empresa' | undefined,
      description: Equipo.description || '',
      is_it_montlhy: Equipo.is_it_montlhy as boolean,
      private: Equipo.private as boolean,
      down_document: Equipo.down_document as boolean,
    },
  });

  const itemsTotales = [
    {
      id: 'multiresource',
      label: 'Es multirecurso?',
      tooltip: 'Si el documento aplica a mas de una persona o equipo',
    },
    {
      id: 'mandatory',
      label: 'Es mandatorio?',
      tooltip: 'Si el documento es obligatorio, se crearan alertas para su cumplimiento',
    },
    { id: 'explired', label: 'Expira?', tooltip: 'Si el documento expira' },
    {
      id: 'special',
      label: 'Es especial?',
      tooltip: 'Si el documento requiere documentacion especial',
    },
    {
      id: 'is_it_montlhy',
      label: 'Es mensual?',
      tooltip: 'Si el documento vence mensualmente',
    },
    {
      id: 'private',
      label: 'Es privado?',
      tooltip: 'Si el documento es privado no sera visible para los usuarios con el rol invitado',
    },
    {
      id: 'down_document',
      label: 'Es un documento de baja?',
      tooltip: 'Si el documento es de baja solo se pedira cuando el empleado este dado de baja',
    },
  ];
  const [items, setItems] = useState(() => {
    return Equipo.applies !== 'Empresa'
      ? itemsTotales
      : itemsTotales.filter((e) => e.id === 'is_it_montlhy' || e.id === 'private' || e.id === 'explired');
  });

  function prepareConditionsForStorage() {
    // Ignorar condiciones vacías
    const validConditions = conditions.filter((c) => c.property && c.values && c.values.length > 0);

    if (validConditions.length === 0) {
      return null;
    }

    return validConditions
      .map((condition) => {
        // Encuentra la configuración de esta propiedad
        const propConfig = employeePropertiesConfig.find((p) => p.label === condition.property);
        if (!propConfig) return null;

        // Determina si es una relación (propiedades que son objetos o arrays)
        const isRelation = [
          'contractor_employee',
          'province',
          'hierarchical_position',
          'category',
          'guild',
          'covenant',
          'city',
        ].includes(propConfig.accessor_key);

        // Tipo especial para contractor_employee (array de relaciones)
        const relationsColumns = ['contractor_employee'];
        const isArrayRelation = relationsColumns.includes(propConfig.accessor_key);

        let reference_values: { id: string; value: string }[] = [];
        if (isRelation) {
          // Buscar FIRST employee que contenga el valor para obtener su ID (si está presente)
          reference_values = condition.values.map((value) => {
            const emp = employees.find((e) => {
              const empVal = getEmployeePropertyValue(e, propConfig.accessor_key);
              return empVal?.toLowerCase() === value.toLowerCase();
            });
            // Para relaciones 1:N el objeto suele estar directamente en la propiedad
            const relatedObj = (emp ? (emp[propConfig.accessor_key as keyof EmployeeDetailed] as any) : null) as any;
            const relatedId = relatedObj?.id ?? relatedObj ?? '';

            return {
              id: relatedId[0]?.customers?.id ? relatedId[0].customers.id : relatedId,
              value,
            };
          });
        }

        // Añadir metadatos de relación para uso en BD
        const meta = relationMeta[propConfig.accessor_key] || null;

        return {
          property_key: propConfig.accessor_key,
          values: condition.values,
          reference_values: reference_values,
          ids: reference_values.length ? reference_values.map((r) => r.id) : condition.values, // Para direct, usar los valores mismos
          is_relation: isRelation,
          is_array_relation: isArrayRelation,
          relation_type: meta ? meta.relation_type : 'direct',
          relation_table: meta?.relation_table || null,
          column_on_employees: meta?.column_on_employees || null,
          column_on_relation: meta?.column_on_relation || null,
          filter_column: meta?.filter_column || propConfig.accessor_key,
          property_label: condition.property,
        };
      })
      .filter(Boolean); // Eliminar nulls
  }

  // Serializar condiciones de vehículos para almacenamiento
  function prepareVehicleConditionsForStorage() {
    const validConditions = conditions.filter((c) => c.property && c.values.length);
    if (validConditions.length === 0) {
      return null;
    }

    // Definir relaciones (igual que en empleados)
    const relationKeys = ['contractor_equipment', 'brand', 'model', 'type', 'types_of_vehicles'];
    const arrayRelationKeys = ['contractor_equipment'];

    return validConditions
      .map((condition) => {
        const propConfig = vehiclePropertiesConfig.find((p) => p.label === condition.property);
        if (!propConfig) return null;

        const isRelation = relationKeys.includes(propConfig.accessor_key);
        const isArrayRelation = arrayRelationKeys.includes(propConfig.accessor_key);

        let reference_values: { id: string; value: string }[] = [];
        if (isRelation) {
          reference_values = condition.values.map((value) => {
            const veh = vehicles.find((v) => {
              const vehVal = getVehiclePropertyValue(v, propConfig.accessor_key);
              return vehVal?.toLowerCase() === value.toLowerCase();
            }) as any;
            // Para contractor_equipment es array, para otros puede ser objeto
            if (isArrayRelation && veh && Array.isArray(veh.contractor_equipment)) {
              // Busca el contractor_id correspondiente al valor
              const contractor = veh.contractor_equipment.find(
                (r: any) => r.contractor_id?.name?.toLowerCase() === value.toLowerCase()
              );
              return { id: contractor?.contractor_id?.id || '', value };
            } else if (veh && propConfig.accessor_key.includes('.')) {
              // Para relaciones 1:N anidadas (ej: brand.name)
              const [main, sub] = propConfig.accessor_key.split('.');
              return { id: veh[main as any]?.id || '', value };
            } else if (veh && veh[propConfig.accessor_key]) {
              return { id: veh[propConfig.accessor_key]?.id || '', value };
            }
            return { id: '', value };
          });
        }

        const meta = relationMeta[propConfig.accessor_key] || null;

        return {
          property_key: propConfig.accessor_key,
          values: condition.values,
          ids: reference_values.length ? reference_values.map((r) => r.id) : condition.values,
          is_relation: !!meta,
          is_array_relation: isArrayRelation,
          relation_type: meta?.relation_type || 'direct',
          relation_table: meta?.relation_table || null,
          column_on_vehicles: meta?.column_on_vehicles || null,
          column_on_relation: meta?.column_on_relation || null,
          filter_column: meta?.filter_column || propConfig.accessor_key,
        };
      })
      .filter(Boolean);
  }

  async function checkAlertsStatus() {
    if (!Equipo.special) {
      // Si no es un documento especial, simplemente actualizamos sin revisar alertas
      await performUpdate(false);
      return;
    }

    // Para documentos especiales, verificamos si hay cambios en las alertas
    let newResourcesToAlert: any[] = [];
    let resourcesToRemoveAlert: any[] = [];

    // Obtenemos las entradas existentes
    const existingEntries: any = await fettchExistingEntries(Equipo.applies, Equipo.id);

    if (Equipo.applies === 'Persona') {
      // Determinar qué empleados necesitan alertas y cuáles necesitan eliminarlas
      if (matchingEmployees.length > 0) {
        // Empleados que cumplen condiciones pero no tienen alertas (necesitan alertas nuevas)
        newResourcesToAlert = matchingEmployees.filter(
          (employee) => !existingEntries.some((entry: any) => entry.applies.id === employee.id)
        );

        // Empleados con alertas que ya no cumplen condiciones (necesitan eliminar alertas)
        resourcesToRemoveAlert = existingEntries
          .filter((entry: any) => !matchingEmployees.some((employee) => employee.id === entry.applies.id))
          .map((entry: any) => entry.applies);
      } else {
        // Si no hay empleados que cumplan, todos los que tienen alertas necesitan eliminarlas
        resourcesToRemoveAlert = existingEntries.map((entry: any) => entry.applies);
      }
    } else if (Equipo.applies === 'Equipos') {
      // Determinar qué vehículos necesitan alertas y cuáles necesitan eliminarlas
      if (matchingVehicles.length > 0) {
        // Vehículos que cumplen condiciones pero no tienen alertas (necesitan alertas nuevas)
        newResourcesToAlert = matchingVehicles.filter(
          (vehicle) => !existingEntries.some((entry: any) => entry.applies.id === vehicle.id)
        );

        // Vehículos con alertas que ya no cumplen condiciones (necesitan eliminar alertas)
        resourcesToRemoveAlert = existingEntries
          .filter((entry: any) => !matchingVehicles.some((vehicle) => vehicle.id === entry.applies.id))
          .map((entry: any) => entry.applies);
      } else {
        // Si no hay vehículos que cumplan, todos los que tienen alertas necesitan eliminarlas
        resourcesToRemoveAlert = existingEntries.map((entry: any) => entry.applies);
      }
    }

    // Verificamos si hay cambios en las alertas
    if (newResourcesToAlert.length > 0 || resourcesToRemoveAlert.length > 0) {
      // Guardamos los recursos que necesitan cambios
      setResourcesNeedingAlerts(newResourcesToAlert);
      setResourcesNeedingDeletion(resourcesToRemoveAlert);
      // Abrimos el modal de confirmación
      setShowAlertsUpdateModal(true);
    } else {
      // Si no hay cambios en las alertas, simplemente actualizamos
      await performUpdate(false);
    }
  }

  async function handleAlertsUpdate(manageAlerts: boolean) {
    setShowAlertsUpdateModal(false);
    await performUpdate(manageAlerts);
  }

  async function performUpdate(manageAlerts: boolean) {
    setIsLoading(true);

    // 1. Preparar valores para actualizar el documento
    // Convertir las condiciones a formato serializable
    const serializedConditions =
      form.getValues('applies') === 'Equipos' ? prepareVehicleConditionsForStorage() : prepareConditionsForStorage();
    const formattedValues = {
      ...form.getValues(),
      name: formatName(form.getValues('name')),
      description: formatDescription(form.getValues('description')),
      conditions: serializedConditions,
    };

    try {
      // console.log(formattedValues);
      // 2. Actualizar el documento
      // const { error: updateError } = await supabase.from('document_types').update(formattedValues).eq('id', Equipo.id);
      const updateError = await updateDocumentType(Equipo.id, formattedValues);

      if (updateError) {
        //console.log(updateError);
        throw new Error(handleSupabaseError(updateError.message));
      }

      // 3. Manejar alertas si es necesario
      if (manageAlerts && Equipo.special) {
        const tableNames = {
          Equipos: 'documents_equipment',
          Persona: 'documents_employees',
          Empresa: 'documents_company',
        };
        const table = tableNames[Equipo.applies as 'Equipos' | 'Persona' | 'Empresa'];

        // 3.1 Eliminar alertas que ya no aplican (solo si document_path es null)
        if (resourcesNeedingDeletion.length > 0) {
          // Obtenemos todos los IDs de recursos que necesitan eliminación
          const resourceIds = resourcesNeedingDeletion.map((resource) => resource.id);

          // Primero obtenemos los IDs de las alertas con document_path null
          const { data: alertsToDelete } = await supabase
            .from(table as 'documents_equipment' | 'documents_employees' | 'documents_company')
            .select('id')
            .eq('id_document_types', Equipo.id)
            .in('applies', resourceIds)
            .is('document_path', null);

          if (alertsToDelete && alertsToDelete.length > 0) {
            // Extraemos los IDs de las alertas a eliminar
            const alertIds = alertsToDelete.map((alert) => alert.id);

            // Eliminamos todas las alertas en una sola operación
            const { error: deleteError } = await supabase
              .from(table as 'documents_equipment' | 'documents_employees' | 'documents_company')
              .delete()
              .in('id', alertIds);

            if (deleteError) {
              console.error('Error al eliminar alertas en bulk:', deleteError);
            }
          }
        }

        // 3.2 Generar nuevas alertas
        if (resourcesNeedingAlerts.length > 0) {
          // Obtenemos los IDs de recursos que necesitan alertas
          const resourceIds = resourcesNeedingAlerts.map((resource) => resource.id);

          // Verificamos qué recursos ya tienen alertas para no duplicar
          const { data: existingAlerts } = await supabase
            .from(table as 'documents_equipment' | 'documents_employees' | 'documents_company')
            .select('applies')
            .eq('id_document_types', Equipo.id)
            .in('applies', resourceIds);

          const existingAlertIds = existingAlerts?.map((alert) => alert.applies) || [];

          // Filtramos solo recursos que no tengan alertas ya existentes
          const resourcesToInsert = resourcesNeedingAlerts.filter(
            (resource) => !existingAlertIds.includes(resource.id)
          );

          if (resourcesToInsert.length > 0) {
            const user = await supabase.auth.getUser();
            // Preparamos los datos para inserción masiva
            const newEntries = resourcesToInsert.map((resource) => ({
              id_document_types: Equipo.id,
              applies: resource.id,
              is_active: true,
              // insertedAt: new Date().toISOString(),
              document_path: null,
              user_id: user?.data.user?.id,
            }));

            // Insertamos todas las alertas nuevas en una sola operación
            const { error: insertError } = await supabase
              .from(table as 'documents_equipment' | 'documents_employees' | 'documents_company')
              .insert(newEntries);

            if (insertError) {
              console.error('Error al generar alertas en bulk:', insertError);
            }
          }
        }
      }

      // 4. Actualizar la interfaz
      fetchDocumentTypes(actualCompany);
      toast.success('Documento actualizado correctamente');
      document.getElementById('cerrar-editor-modal')?.click();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el documento');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof FormSchema>) {
    // Este método se mantiene por compatibilidad, pero ahora usamos performUpdate
    toast.promise(
      async () => {
        const error = await updateDocumentType(Equipo.id, values);

        if (error) {
          throw new Error(error.message);
        }
        fetchDocumentTypes(actualCompany);
      },
      {
        loading: 'Actualizando...',
        success: (data) => {
          document.getElementById('close_document_modal')?.click();
          return 'El documento se ha actualizado correctamente';
        },
        error: (error) => {
          return error;
        },
      }
    );
    fetchDocumentTypes(actualCompany);
    router.refresh();
  }

  function formatName(name: string): string {
    // Capitalize first letter and convert the rest to lowercase
    return name.charAt(0)?.toUpperCase() + name.slice(1).toLowerCase();
  }

  function formatDescription(description: string | undefined): string | undefined {
    if (description) {
      // Capitalize first letter and convert the rest to lowercase
      return description.charAt(0)?.toUpperCase() + description.slice(1).toLowerCase();
    }
    return description;
  }

  async function handleDeleteDocumentType() {
    toast.promise(
      async () => {
        // const { error } = await supabase.from('document_types').update({ is_active: false }).eq('id', Equipo.id);

        const error = await updateDocumentType(Equipo.id, { is_active: false });

        await handleDeleteAlerts(); //!probar

        if (error) {
          throw new Error(handleSupabaseError(error.message));
        }
      },
      {
        loading: 'Eliminando...',
        success: (data) => {
          document.getElementById('close_document_modal')?.click();
          fetchDocumentTypes(actualCompany);

          return 'El documento se ha eliminado correctamente';
        },
        error: (error) => {
          return error;
        },
      }
    );
  }

  // async function fetchallResources() {
  //   if (Equipo.applies === 'Persona') {
  //     const { data, error } = await supabase
  //       .from('employees')
  //       .select('firstname,lastname, cuil,id')
  //       .eq('company_id', actualCompany || '');

  //     if (error) {
  //       console.error('Error al obtener datos adicionales:', error);
  //     } else {
  //       setAllResources(data);
  //     }
  //   } else if (Equipo.applies === 'Equipos') {
  //     const { data, error } = await supabase
  //       .from('vehicles')
  //       .select('domain, serie, intern_number,id')
  //       .eq('company_id', actualCompany || '');

  //     if (error) {
  //       console.error('Error al obtener datos adicionales:', error);
  //     } else {
  //       setAllResources(data);
  //     }
  //   }
  // }
  const [existingEntries, setExistingEntries] = useState<any[]>([]);
  const [selectedDeleteMode, setSelectedDeleteMode] = useState<'all' | 'nonMatching'>('all');

  // async function fettchExistingEntries() {
  //   const tableNames = {
  //     Equipos: 'documents_equipment',
  //     Persona: 'documents_employees',
  //   };
  //   const table = tableNames[Equipo.applies as 'Equipos' | 'Persona'];

  //   console.log(actualCompany);
  //   console.log(Equipo.id);

  //   const { data: existingEntries, error: existingEntriesError } = await supabase
  //     .from(table as 'documents_equipment' | 'documents_employees')
  //     .select('applies(*),id')
  //     .eq('id_document_types', Equipo.id)
  //     .eq('applies.company_id', actualCompany || '')
  //     .not('applies', 'is', null);

  //   if (existingEntriesError) {
  //     console.error('Error al obtener los recursos con documentos:', existingEntriesError);
  //     return;
  //   }
  //   setExistingEntries(existingEntries);
  // }
  // Filtrar los recursos que no tienen una entrada en la tabla correspondiente
  const existingResourceIds = existingEntries.map((entry: any) => entry.applies.id);
  let filteredResources: any[] = allResources;
  if (Equipo.special) {
    if (Equipo.applies === 'Persona') {
      filteredResources = matchingEmployees;
    } else if (Equipo.applies === 'Equipos') {
      filteredResources = matchingVehicles;
    }
  }
  const resourcesToInsert = filteredResources.filter(
    (resource: { id: string }) => !existingResourceIds.includes(resource.id)
  );

  async function handleGenerateAlerts() {
    toast.promise(
      async () => {
        const tableNames = {
          Equipos: 'documents_equipment',
          Persona: 'documents_employees',
        };
        const table = tableNames[Equipo.applies as 'Equipos' | 'Persona'];

        // Si es especial, solo generar alertas para matchingEmployees/vehicles
        let alertResources = resourcesToInsert;
        if (Equipo.special) {
          if (Equipo.applies === 'Persona') {
            alertResources = resourcesToInsert.filter((r: any) => matchingEmployees.some((m) => m.id === r.id));
          } else if (Equipo.applies === 'Equipos') {
            alertResources = resourcesToInsert.filter((r: any) => matchingVehicles.some((m) => m.id === r.id));
          }
        }

        if (alertResources.length > 0) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            return;
          }

          const alerts = alertResources.map((resource: { id: string }) => ({
            id_document_types: Equipo.id,
            user_id: user.id,
            applies: resource.id,
          }));

          const { error: insertError } = await supabase.from(table as any).insert(alerts);

          if (insertError) {
            throw new Error(handleSupabaseError(insertError.message));
          }
        } else {
          throw new Error('No hay recursos a los que se les deba generar una alerta');
        }
      },
      {
        loading: 'Generando alertas...',
        success: (data) => {
          fetchDocumentTypes(actualCompany);
          return 'Se han generado las alertas!';
        },
        error: (error) => {
          return error;
        },
      }
    );
    router.refresh();
  }
  // Referencia para cerrar el modal de eliminación de alertas
  const closeAlertModalRef = useRef<HTMLButtonElement>(null);

  async function handleDeleteAlerts() {
    const tableNames = {
      Equipos: 'documents_equipment',
      Persona: 'documents_employees',
      Empresa: 'documents_company',
    };
    const table = tableNames[Equipo.applies as 'Equipos' | 'Persona' | 'Empresa'];

    try {
      // Si es un documento especial y el modo es 'nonMatching', solo eliminar las alertas que no cumplen con las condiciones
      if (Equipo.special && selectedDeleteMode === 'nonMatching') {
        // Identificar recursos que no cumplen con las condiciones actuales
        const matchingIds =
          Equipo.applies === 'Persona' ? matchingEmployees.map((e) => e.id) : matchingVehicles.map((v) => v.id);

        // Obtener IDs de recursos con alertas que NO están en la lista de matching
        const nonMatchingEntries = existingEntries.filter((entry) => !matchingIds.includes(entry.applies.id));

        if (nonMatchingEntries.length === 0) {
          toast.error('No hay alertas para eliminar que no cumplan con las condiciones actuales');
          return;
        }

        // Obtenemos los IDs de las alertas a eliminar
        const nonMatchingResourceIds = nonMatchingEntries.map((entry) => entry.id);

        // Eliminar solo las alertas de recursos que no cumplen con las condiciones actuales
        const { error } = await supabase
          .from(table as any)
          .delete()
          .in('id', nonMatchingResourceIds)
          .is('document_path', null);

        if (error) {
          throw new Error(handleSupabaseError(error.message));
        }
      } else {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('id_document_types', Equipo.id)
          .is('document_path', null);

        if (error) {
          throw new Error(handleSupabaseError(error.message));
        }
      }

      // Si llegamos aquí, la operación fue exitosa
      fetchDocumentTypes(actualCompany);
      router.refresh();

      // Cerrar el modal de eliminación de alertas
      closeAlertModalRef.current?.click();

      // Mostrar mensaje de éxito
      toast.success(
        selectedDeleteMode === 'nonMatching'
          ? 'Se han eliminado las alertas que no cumplen con las condiciones actuales!'
          : 'Se han eliminado todas las alertas!'
      );

      // Actualizar la lista de entradas existentes después de eliminar
      const existingEntries2 = await fettchExistingEntries(Equipo.applies, Equipo.id);
      if (existingEntries2) {
        setExistingEntries(existingEntries2);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar alertas');
    }
  }

  // 2. Función que filtra empleados según las condiciones
  function filterEmployeesByConditions(empleados: any[], condiciones: any[], propConfig: any[]) {
    // Si no hay condiciones, mostrar todos los empleados
    if (!condiciones.length) return empleados;

    return empleados.filter((employee) => {
      // El empleado debe cumplir TODAS las condiciones (AND entre condiciones)
      const cumple = condiciones.every((condition) => {
        // Si la condición no tiene propiedad o valores, se omite
        if (!condition.property || !condition.values?.length) return true;

        // Buscar la configuración de la propiedad
        const propertyConfig = propConfig.find((config) => config.label === condition.property);
        if (!propertyConfig) return true;

        // Caso especial para clientes (contractor_employee)
        if (propertyConfig.accessor_key === 'contractor_employee') {
          const contractorEmployees = employee.contractor_employee || [];

          // Verificar si el empleado tiene al menos uno de los clientes seleccionados
          const tieneAlgunClienteSeleccionado = condition.values.some((clienteSeleccionado: string) => {
            return contractorEmployees.some(
              (contrato: any) =>
                contrato &&
                contrato.customers &&
                normalizeString(contrato.customers.name) === normalizeString(clienteSeleccionado)
            );
          });
          return tieneAlgunClienteSeleccionado;
        }

        // Para el resto de propiedades, comportamiento normal
        const employeeValue = getEmployeePropertyValue(employee, propertyConfig.accessor_key);

        // El empleado cumple si coincide con AL MENOS UNO de los valores (OR entre valores)
        const resultado = condition.values.some((v: string) => {
          // Usar normalizeString para una comparación más robusta
          const match = normalizeString(employeeValue) === normalizeString(v);
          return match;
        });

        return resultado;
      });

      return cumple;
    });
  }

  // 2.5. Función que filtra vehículos según las condiciones
  function filterVehiclesByConditions(vehs: any[], condiciones: Condition[], propConfig: any[]) {
    if (!condiciones.length) return vehs;
    return vehs.filter((v) =>
      condiciones.every((c) => {
        if (!c.property || !c.values?.length) return true;
        const cfg = propConfig.find((p) => p.label === c.property);
        if (!cfg) return true;
        const val = getVehiclePropertyValue(v, cfg.accessor_key);
        return c.values.some((x) => normalizeString(val) === normalizeString(x));
      })
    );
  }

  // 3. Aplicar filtros cuando cambien las condiciones
  useEffect(() => {
    // Solo aplicar filtros si ya se han cargado empleados
    if (employees?.length > 0) {
      const filtered = filterEmployeesByConditions(employees, conditions, employeePropertiesConfig);
      setMatchingEmployees(filtered);
    }
    if (vehicles?.length > 0) {
      setMatchingVehicles(filterVehiclesByConditions(vehicles, conditions, vehiclePropertiesConfig));
    }
  }, [conditions, employees, employeePropertiesConfig, vehicles, vehiclePropertiesConfig]);

  useEffect(() => {
    const fetchAndSetupEmployees = async () => {
      try {
        // Extraer valores únicos para cada propiedad
        const updatedConfig = baseEmployeePropertiesConfig.map((prop) => {
          const defaultVals = employeeMockValues[prop.accessor_key] || [];
          const values =
            defaultVals.length > 0
              ? defaultVals
              : Array.from(
                  new Set(
                    employees
                      .map((employee) => getEmployeePropertyValue(employee, prop.accessor_key))
                      .filter((v) => v !== undefined && v !== null && v !== '')
                  )
                );
          return { ...prop, values };
        });
        setEmployeePropertiesConfig(updatedConfig);
        setMatchingEmployees(employees);
      } catch (error) {
        console.error('Error al cargar empleados:', error);
      }
    };

    // 1.5. Cargar vehículos (solo una vez al montar el componente)
    const fetchAndSetupVehicles = async () => {
      const updated = baseVehiclePropertiesConfig.map((prop) => {
        const defaultVals = vehicleMockValues[prop.accessor_key] || [];
        const vals =
          defaultVals.length > 0
            ? defaultVals
            : Array.from(new Set(vehicles.map((v) => getVehiclePropertyValue(v, prop.accessor_key)).filter((v) => v)));
        return { ...prop, values: vals };
      });
      setVehiclePropertiesConfig(updated);
      setMatchingVehicles(vehicles);
    };

    fetchAndSetupEmployees();
    fetchAndSetupVehicles();
  }, [vehicles, employees]);

  const addCondition = () => {
    setConditions((prev) => [...prev, { property: '', values: [], id: Date.now().toString() }]);
  };

  // Actualiza los valores de una condición existente
  const updateConditionValues = (id: string, values: string[]) => {
    setConditions((prev) => prev.map((condition) => (condition.id === id ? { ...condition, values } : condition)));
  };

  const updateCondition = (id: string, field: 'property' | 'value', value: string) => {
    setConditions(
      conditions.map((condition) => {
        if (condition.id === id) {
          return { ...condition, [field]: value };
        }
        return condition;
      })
    );
  };
  // Elimina una condición por su ID
  const removeCondition = (id: string) => {
    setConditions(conditions.filter((condition) => condition.id !== id));
  };

  // Cerca de la línea 587, donde están los otros estados
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState('');

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          onClick={async () => {
            const data = await fetchallResources(Equipo.applies);
            setAllResources(data as any[]);
            const existingEntries = await fettchExistingEntries(Equipo.applies, Equipo.id);
            if (existingEntries) {
              setExistingEntries(existingEntries);
            }
          }}
          id="close-edit-modal-documentypes"
          variant="outline"
        >
          Editar
        </Button>
      </SheetTrigger>
      <SheetContent className="border-l-4 border-l-muted flex flex-col justify-between overflow-y-auto sm:max-w-screen-md">
        <AlertDialog open={showConfirmDeleteModal} onOpenChange={setShowConfirmDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>{confirmDeleteMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: 'destructive' })}
                onClick={() => handleDeleteAlerts()}
              >
                Confirmar eliminación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div>
          <SheetHeader>
            <SheetTitle>Editar tipo de documento</SheetTitle>
            <SheetDescription>
              Puedes editar el tipo de documento seleccionado, los documentos creados por defecto no son editables
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="w-full rounded-md border p-4 shadow"
                          placeholder="Nombre del documento"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applies"
                  render={({ field }) => (
                    <FormItem>
                      <div>
                        <FormLabel>Aplica a</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Personas, Equipos o Empresa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Persona">Persona</SelectItem>
                            <SelectItem value="Equipos">Equipos</SelectItem>
                            <SelectItem value="Empresa">Empresa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid md:grid-cols-2 grid-cols-1 gap-6 items-stretch justify-between">
                  <TooltipProvider delayDuration={150}>
                    {items?.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name={item.id as 'name' | 'applies' | 'multiresource' | 'mandatory' | 'explired' | 'special'}
                        render={({ field }) => (
                          <FormItem>
                            <div className="">
                              <FormLabel className="flex gap-1 items-center mb-2">{item.label}</FormLabel>
                              <FormControl>
                                <div className="flex flex-col space-x-2">
                                  <div className="flex gap-3">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={field.value === true}
                                        onCheckedChange={(value) => {
                                          field.onChange(value ? true : false);
                                          if (item.id === 'special') {
                                            setSpecial(true);
                                          }
                                          if (item.id === 'is_it_montlhy') {
                                            form.setValue('explired', value ? false : true);
                                          }
                                          if (item.id === 'explired') {
                                            form.setValue('is_it_montlhy', value ? false : true);
                                          }
                                        }}
                                      />
                                      <span>Sí</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={field.value === false}
                                        onCheckedChange={(value) => {
                                          field.onChange(value ? false : true);
                                          if (item.id === 'special') {
                                            setSpecial(false);
                                          }
                                          if (item.id === 'is_it_montlhy') {
                                            form.setValue('explired', false);
                                          }
                                          if (item.id === 'explired') {
                                            form.setValue('is_it_montlhy', false);
                                          }
                                        }}
                                      />
                                      <span>No</span>
                                    </div>
                                  </div>
                                  <FormMessage />
                                </div>
                              </FormControl>
                              <div className="space-y-1 leading-none"></div>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </TooltipProvider>
                </div>
                {form.getValues('special') === true && (
                  <div className="mt-4 border rounded-lg p-4 ">
                    <div className="flex justify-between flex-col items-center mb-4">
                      <h3 className="font-semibold text-lg mb-2">Condiciones Especiales</h3>
                      <div className="flex justify-around w-full">
                        {form.getValues('applies') === 'Persona' && (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => setShowEmployeePreview(!showEmployeePreview)}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            {showEmployeePreview ? 'Ocultar' : 'Ver'} Empleados ({matchingEmployees.length})
                          </Button>
                        )}
                        {form.getValues('applies') === 'Equipos' && (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => setShowVehiclePreview(!showVehiclePreview)}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            {showVehiclePreview ? 'Ocultar' : 'Ver'} Equipos ({matchingVehicles.length})
                          </Button>
                        )}
                        <Button variant="outline" size="sm" type="button" onClick={addCondition}>
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Añadir Condición
                        </Button>
                      </div>
                    </div>

                    {conditions.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>Añade condiciones para especificar a qué empleados aplica este documento.</p>
                        <Button variant="outline" className="mt-2" type="button" onClick={addCondition}>
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Añadir Primera Condición
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {conditions.map((condition) => (
                          <Card key={crypto.randomUUID()}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={condition.property}
                                  onValueChange={(value) => updateCondition(condition.id, 'property', value)}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Seleccionar propiedad" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {form.getValues('applies') === 'Equipos'
                                      ? vehiclePropertiesConfig.map((prop) => (
                                          <SelectItem key={crypto.randomUUID()} value={prop.label}>
                                            {prop.label}
                                          </SelectItem>
                                        ))
                                      : employeePropertiesConfig.map((prop) => (
                                          <SelectItem key={crypto.randomUUID()} value={prop.label}>
                                            {prop.label}
                                          </SelectItem>
                                        ))}
                                  </SelectContent>
                                </Select>
                                {condition.property && (
                                  <MultiSelect
                                    options={
                                      form.getValues('applies') === 'Equipos'
                                        ? vehiclePropertiesConfig
                                            .find((prop) => prop.label === condition.property)
                                            ?.values.map((value: string) => ({
                                              label: value,
                                              value: value,
                                            })) || []
                                        : employeePropertiesConfig
                                            .find((prop) => prop.label === condition.property)
                                            ?.values.map((value: string) => ({
                                              label: value,
                                              value: value,
                                            })) || []
                                    }
                                    selectedValues={condition.values}
                                    setSelectedValues={(values: string[]) =>
                                      updateConditionValues(condition.id, values)
                                    }
                                    emptyMessage="No hay valores disponibles"
                                    placeholder="Seleccionar valores"
                                  />
                                )}

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => removeCondition(condition.id)}
                                  className="ml-auto"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {conditions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-sm font-medium">Resumen:</span>
                            {conditions.map((condition) => {
                              const propertyLabel = condition.property;

                              return condition.property && condition?.values?.length ? (
                                <Badge key={crypto.randomUUID()} variant="outline" className="text-xs">
                                  {propertyLabel}: {condition.values.join(', ')}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {(showEmployeePreview && form.getValues('applies') === 'Persona') ||
                    (showVehiclePreview && form.getValues('applies') === 'Equipos') ? (
                      <Accordion type="single" collapsible className="mt-4">
                        <AccordionItem value="employees">
                          <AccordionTrigger>
                            {form.getValues('applies') === 'Persona'
                              ? `Empleados que cumplen las condiciones (${matchingEmployees.length})`
                              : `Equipos que cumplen las condiciones (${matchingVehicles.length})`}
                          </AccordionTrigger>
                          <AccordionContent>
                            <ScrollArea className="h-[200px] rounded-md border p-2">
                              {(form.getValues('applies') === 'Persona' && matchingEmployees.length === 0) ||
                              (form.getValues('applies') === 'Equipos' && matchingVehicles.length === 0) ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  No hay {form.getValues('applies') === 'Persona' ? 'empleados' : 'equipos'} que cumplan
                                  todas las condiciones seleccionadas
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {/* Renderizado de empleados que cumplen con las condiciones */}
                                  {(form.getValues('applies') === 'Persona' ? matchingEmployees : matchingVehicles).map(
                                    (employee: any) => {
                                      return (
                                        <div
                                          key={crypto.randomUUID()}
                                          className="flex items-center gap-2 p-2 rounded-md"
                                        >
                                          {form.getValues('applies') === 'Persona' ? (
                                            <Avatar>
                                              <AvatarImage
                                                src={employee.picture || '/placeholder.svg'}
                                                alt={employee.firstname}
                                              />
                                              <AvatarFallback>{employee.firstname.substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                          ) : (
                                            <Avatar>
                                              <AvatarImage
                                                src={employee.picture || '/placeholder.svg'}
                                                alt={employee.brand.name}
                                              />
                                              <AvatarFallback>{employee.brand.name.substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                          )}
                                          <div>
                                            <p className="font-medium">
                                              {form.getValues('applies') === 'Persona'
                                                ? `${employee.firstname} ${employee.lastname}`
                                                : `${employee.brand.name} ${employee.model.name}`}
                                            </p>
                                            <div className="flex gap-1 flex-wrap">
                                              {conditions
                                                .filter((condition) => condition.property && condition.values.length)
                                                .flatMap((condition) => {
                                                  const propertyConfig =
                                                    form.getValues('applies') === 'Persona'
                                                      ? employeePropertiesConfig.find(
                                                          (config) => config.label === condition.property
                                                        )
                                                      : vehiclePropertiesConfig.find(
                                                          (config) => config.label === condition.property
                                                        );
                                                  if (!propertyConfig) return [];
                                                  const employeeValue =
                                                    form.getValues('applies') === 'Persona'
                                                      ? getEmployeePropertyValue(employee, propertyConfig.accessor_key)
                                                      : getVehiclePropertyValue(employee, propertyConfig.accessor_key);
                                                  const badges = condition.values
                                                    .filter((v) => employeeValue.toLowerCase() === v.toLowerCase())
                                                    .map((v) => (
                                                      <Badge
                                                        key={crypto.randomUUID()}
                                                        variant="outline"
                                                        className="text-xs"
                                                      >
                                                        {condition.property}: {v}
                                                      </Badge>
                                                    ));
                                                  return badges;
                                                })}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            </ScrollArea>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ) : null}
                  </div>
                )}
                <SheetFooter className="flex justify-between flex-wrap">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant={'destructive'}>Eliminar tipo de documento</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Estas seguro que deseas eliminar el tipo de documento {Equipo.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta accion no puede revertirse, y eliminara todos los documentos asociados a este tipo.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} asChild>
                          <Button onClick={() => handleDeleteDocumentType()} variant={'destructive'}>
                            Eliminar tipo de documento
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    onClick={async () => {
                      if (Equipo.special) {
                        await checkAlertsStatus();
                      } else {
                        // Si no es especial, se actualiza directamente
                        await performUpdate(false);
                      }
                    }}
                    disabled={isLoading}
                    type="button"
                  >
                    {isLoading ? 'Procesando...' : 'Guardar cambios'}
                  </Button>
                  <SheetClose id="cerrar-editor-modal" />
                </SheetFooter>
              </form>
            </Form>
          </div>
        </div>
        <Separator className="mb-2 mt-0" />
        <div className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant={'destructive'} className="self-end">
                Eliminar alertas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminación de alertas</AlertDialogTitle>
                {!Equipo.special ? (
                  // Modal para documentos NO especiales (funcionalidad original)
                  <>
                    <AlertDialogDescription>
                      Esta acción eliminará la alerta de todos los recursos a los que no se les haya subido el
                      documento. Los documentos ya subidos y vinculados a este tipo de documento permanecerán intactos.
                    </AlertDialogDescription>
                    <div className="mt-4">
                      {existingEntries.length > 0 ? (
                        <ScrollArea className="h-48">
                          <div className="p-4 border rounded-md">
                            <CardTitle className="text-md mb-3">Recursos con alertas pendientes:</CardTitle>
                            {existingEntries.map((entry) => {
                              const resource = entry.applies;
                              if (Equipo.applies === 'Equipos') {
                                return (
                                  <div key={resource.id} className="py-1 flex items-center gap-2">
                                    <Truck className="size-5" /> {resource.domain} {resource.serie} -{' '}
                                    {resource.intern_number}
                                  </div>
                                );
                              }
                              if (Equipo.applies === 'Persona') {
                                return (
                                  <div key={resource.id} className="py-1 flex items-center gap-2">
                                    <User className="size-5" /> {resource.lastname} {resource.firstname} -{' '}
                                    {resource.cuil}
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="p-4 border rounded-md text-center">No hay alertas pendientes para eliminar</div>
                      )}
                    </div>
                  </>
                ) : (
                  // Modal para documentos especiales (nuevo diseño de dos columnas)
                  <>
                    <AlertDialogDescription className="mb-4">
                      Seleccione qué alertas desea eliminar. Puede ver el listado completo o solo los recursos que ya no
                      cumplen con las condiciones definidas.
                    </AlertDialogDescription>

                    {/* Botones para ejecutar acciones directamente */}
                    <div className="flex gap-4 mb-4 justify-center">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedDeleteMode('all');
                          setConfirmDeleteMessage(
                            `¿Estás seguro de que deseas eliminar todas las alertas (${existingEntries.length})?`
                          );
                          setShowConfirmDeleteModal(true);
                        }}
                        disabled={existingEntries.length === 0}
                        className="flex-1"
                      >
                        Eliminar todas ({existingEntries.length})
                      </Button>

                      {(() => {
                        const matchingIds =
                          Equipo.applies === 'Persona'
                            ? matchingEmployees.map((e) => e.id)
                            : matchingVehicles.map((v) => v.id);

                        const nonMatchingEntries = existingEntries.filter(
                          (entry) => !matchingIds.includes(entry.applies.id)
                        );

                        return (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setSelectedDeleteMode('nonMatching');
                              setConfirmDeleteMessage(
                                `¿Estás seguro de que deseas eliminar las alertas fuera de condiciones (${nonMatchingEntries.length})?`
                              );
                              setShowConfirmDeleteModal(true);
                            }}
                            disabled={nonMatchingEntries.length === 0}
                            className="flex-1"
                          >
                            Eliminar fuera de condiciones ({nonMatchingEntries.length})
                          </Button>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Columna 1: Todos los recursos con alertas */}
                      <div>
                        <Accordion type="single" collapsible className="w-full" defaultValue="all-resources">
                          <AccordionItem value="all-resources">
                            <AccordionTrigger className="font-semibold">
                              Todos los recursos ({existingEntries.length})
                            </AccordionTrigger>
                            <AccordionContent>
                              <ScrollArea className="h-48 mt-2">
                                <DialogDescription className="px-2">
                                  {existingEntries.length > 0 ? (
                                    existingEntries.map((entry) => {
                                      const resource = entry.applies;
                                      if (Equipo.applies === 'Equipos') {
                                        return (
                                          <div key={resource.id} className="py-1 flex items-center gap-2">
                                            <Truck className="size-5" /> {resource.domain} {resource.serie} -{' '}
                                            {resource.intern_number}
                                          </div>
                                        );
                                      }
                                      if (Equipo.applies === 'Persona') {
                                        return (
                                          <div key={resource.id} className="py-1 flex items-center gap-2">
                                            <User className="size-5" />
                                            {resource.lastname} {resource.firstname} - {resource.cuil}
                                          </div>
                                        );
                                      }
                                    })
                                  ) : (
                                    <div className="text-center py-4">No hay alertas para mostrar</div>
                                  )}
                                </DialogDescription>
                              </ScrollArea>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>

                      {/* Columna 2: Recursos que no cumplen con las condiciones actuales */}
                      <div>
                        {(() => {
                          const matchingIds =
                            Equipo.applies === 'Persona'
                              ? matchingEmployees.map((e) => e.id)
                              : matchingVehicles.map((v) => v.id);

                          const nonMatchingEntries = existingEntries.filter(
                            (entry) => !matchingIds.includes(entry.applies.id)
                          );

                          return (
                            <Accordion type="single" collapsible className="w-full" defaultValue="non-matching">
                              <AccordionItem value="non-matching">
                                <AccordionTrigger className="font-semibold">
                                  Recursos fuera de condiciones ({nonMatchingEntries.length})
                                </AccordionTrigger>
                                <AccordionContent>
                                  <ScrollArea className="h-48 mt-2">
                                    <DialogDescription className="px-2">
                                      {nonMatchingEntries.length > 0 ? (
                                        nonMatchingEntries.map((entry) => {
                                          const resource = entry.applies;
                                          if (Equipo.applies === 'Equipos') {
                                            return (
                                              <div key={resource.id} className="py-1 flex items-center gap-2">
                                                <Truck className="size-5" /> {resource.domain} {resource.serie} -{' '}
                                                {resource.intern_number}
                                              </div>
                                            );
                                          }
                                          if (Equipo.applies === 'Persona') {
                                            return (
                                              <div key={resource.id} className="py-1 flex items-center gap-2">
                                                <User className="size-5" /> {resource.lastname} {resource.firstname} -{' '}
                                                {resource.cuil}
                                              </div>
                                            );
                                          }
                                        })
                                      ) : (
                                        <div className="text-center py-4">
                                          Todos los recursos con alertas cumplen las condiciones actuales
                                        </div>
                                      )}
                                    </DialogDescription>
                                  </ScrollArea>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel ref={closeAlertModalRef}>Cancelar</AlertDialogCancel>
                {!Equipo.special && (
                  <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} asChild>
                    <Button variant={'destructive'} onClick={() => handleDeleteAlerts()}>
                      Eliminar todas las alertas
                    </Button>
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger disabled={!(resourcesToInsert.length > 0) || Equipo.applies === 'Empresa'} asChild>
              <Button className="self-end">
                {!(resourcesToInsert.length > 0) || Equipo.applies === 'Empresa'
                  ? 'Todos los recursos ya tienen alerta'
                  : 'Generar Alertas'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle>Estas totalmente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción generara una alerta en todos los recursos que no las tengan generadas.
                </AlertDialogDescription>
                <AlertDialogDescription>
                  {resourcesToInsert.length > 0 ? (
                    <>
                      <CardTitle className="text-md underline mb-1">
                        Los siguientes recursos no tienen la alerta generada:
                      </CardTitle>
                      {resourcesToInsert.map((resource) => {
                        if (Equipo.applies === 'Equipos') {
                          return (
                            <div key={resource.id} className="py-1 flex items-center gap-2">
                              <Truck className="size-5" /> {resource.domain} {resource.serie} - {resource.intern_number}
                            </div>
                          );
                        }
                        if (Equipo.applies === 'Persona') {
                          return (
                            <div key={resource.id}>
                              {resource.lastname} {resource.firstname} - {resource.cuil}
                            </div>
                          );
                        }
                      })}
                    </>
                  ) : (
                    <CardTitle className="text-md underline mb-1">
                      Todos los recursos tienen la alerta generada
                    </CardTitle>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button onClick={() => handleGenerateAlerts()}>Generar alertas</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Modal para confirmar actualización con manejo de alertas */}
          <AlertDialog open={showAlertsUpdateModal} onOpenChange={setShowAlertsUpdateModal}>
            <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle>Actualizar documento y gestionar alertas</AlertDialogTitle>
                <AlertDialogDescription>
                  Al modificar las condiciones del documento, se han detectado cambios en las alertas. Por favor,
                  seleccione cómo desea proceder:
                </AlertDialogDescription>

                {/* Contenido del modal */}
                <DialogDescription className="mt-4 space-y-4">
                  {/* Recursos que necesitan alertas nuevas */}
                  {resourcesNeedingAlerts.length > 0 && (
                    <div className="border p-4 rounded-md">
                      <CardTitle className="text-md underline mb-1">
                        Recursos que necesitan alertas nuevas ({resourcesNeedingAlerts.length}):
                      </CardTitle>
                      <div className="max-h-[200px] overflow-y-auto">
                        {resourcesNeedingAlerts.map((resource) => {
                          if (Equipo.applies === 'Equipos') {
                            return (
                              <div
                                key={resource.id}
                                className="py-1 px-2 border-b last:border-b-0 flex items-center gap-2"
                              >
                                <Truck className="size-5" /> {resource.domain} {resource.serie} -{' '}
                                {resource.intern_number}
                              </div>
                            );
                          }
                          if (Equipo.applies === 'Persona') {
                            return (
                              <div
                                key={resource.id}
                                className="py-1 px-2 border-b last:border-b-0 flex items-center gap-2"
                              >
                                <User className="size-5" /> {resource.lastname} {resource.firstname} - {resource.cuil}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recursos que necesitan eliminar alertas */}
                  {resourcesNeedingDeletion.length > 0 && (
                    <div className="border p-4 rounded-md">
                      <CardTitle className="text-md mb-2">
                        Recursos que perderán alertas ({resourcesNeedingDeletion.length}):
                      </CardTitle>
                      <div className="max-h-[200px] overflow-y-auto">
                        {resourcesNeedingDeletion.map((resource) => {
                          if (Equipo.applies === 'Equipos') {
                            return (
                              <div
                                key={resource.id}
                                className="py-1 px-2 border-b last:border-b-0 flex items-center gap-2"
                              >
                                <Truck className="size-5" /> {resource.domain} {resource.serie} -{' '}
                                {resource.intern_number}
                              </div>
                            );
                          }
                          if (Equipo.applies === 'Persona') {
                            return (
                              <div
                                key={resource.id}
                                className="py-1 px-2 border-b last:border-b-0 flex items-center gap-2"
                              >
                                <User className="size-5" /> {resource.lastname} {resource.firstname} - {resource.cuil}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </DialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <Button variant="outline" onClick={() => handleAlertsUpdate(false)}>
                  {resourcesNeedingAlerts.length > 0 && resourcesNeedingDeletion.length > 0
                    ? 'Modificar sin manejar alertas'
                    : resourcesNeedingDeletion.length > 0
                      ? 'Modificar sin eliminar alertas'
                      : resourcesNeedingAlerts.length > 0
                        ? 'Modificar sin crear alertas'
                        : 'Modificar'}
                </Button>
                <Button variant="destructive" onClick={() => handleAlertsUpdate(true)}>
                  {resourcesNeedingAlerts.length > 0 && resourcesNeedingDeletion.length > 0
                    ? 'Modificar y manejar alertas'
                    : resourcesNeedingDeletion.length > 0
                      ? 'Modificar y eliminar alertas'
                      : resourcesNeedingAlerts.length > 0
                        ? 'Modificar y crear alertas'
                        : 'Modificar'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
