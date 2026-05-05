'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { TabsManagerClientSide } from '@/features/TabsManager/TabsManagerClientSide';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, BarChart3, Briefcase, FileText, Lock, Pencil, Phone, Shirt, User, X } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import type { EmployeeDetailData } from '../actions.server';
import { createEmployee, updateEmployee } from '../actions.server';
import { EmployeeViewDisplay } from './EmployeeViewDisplay';
import { EmployeeQuickActions } from './employee-quick-actions';
import { EmployeeContactDataForm } from './forms/employee-contact-data-form';
import { employeeFormSchema, type EmployeeFormData } from './forms/employee-form';
import { EmployeePersonalDataForm } from './forms/employee-personal-data-form';
import { EmployeeWorkDataForm } from './forms/employee-work-data-form';

const logger = new Logger('EmployeeDetailClient');

// ─── Fields agrupados por tab (para derivar errores sin useEffect) ───────────
const PERSONAL_DATA_FIELDS: (keyof EmployeeFormData)[] = [
  'firstname',
  'lastname',
  'nationality',
  'born_date',
  'cuil',
  'document_type',
  'document_number',
  'birthplace',
  'gender',
  'marital_status',
  'level_of_education',
];

const CONTACT_DATA_FIELDS: (keyof EmployeeFormData)[] = [
  'street',
  'street_number',
  'province',
  'city',
  'postal_code',
  'phone',
  'email',
];

const WORK_DATA_FIELDS: (keyof EmployeeFormData)[] = [
  'file',
  'hierarchical_position',
  'company_position',
  'workflow_diagram',
];

// ─── Builder de defaultValues ─────────────────────────────────────────────────
function buildDefaultValues(employee: EmployeeDetailData | null): DefaultValues<EmployeeFormData> {
  if (!employee) {
    // Modo new: todos los campos como undefined para que react-hook-form los inicie vacíos
    return {
      aptitudes: [],
      allocated_to: [],
    };
  }

  return {
    firstname: employee.firstname || undefined,
    lastname: employee.lastname || undefined,
    nationality: employee.nationality || undefined,
    born_date: employee.born_date ? moment(employee.born_date).format('YYYY-MM-DD') : undefined,
    cuil: employee.cuil || undefined,
    document_type: employee.document_type || undefined,
    document_number: employee.document_number || undefined,
    birthplace: employee.countries?.id || undefined,
    gender: employee.gender || undefined,
    marital_status: employee.marital_status || undefined,
    level_of_education: employee.level_of_education || undefined,
    picture: employee.picture || undefined,
    street: employee.street || undefined,
    street_number: employee.street_number || undefined,
    province: employee.province ? Number(employee.province) : undefined,
    city: employee.city ? Number(employee.city) : undefined,
    postal_code: employee.postal_code || undefined,
    phone: employee.phone || undefined,
    email: employee.email || undefined,
    hierarchical_position: employee.hierarchical_position || undefined,
    file: employee.file || undefined,
    company_position: employee.company_position || undefined,
    workflow_diagram: employee.workflow_diagram || undefined,
    normal_hours: employee.normal_hours ? String(employee.normal_hours) : undefined,
    type_of_contract: employee.types_of_contract?.id || undefined,
    allocated_to: (employee.contractor_employee?.map((ce) => ce.customers?.id).filter(Boolean) as string[]) || [],
    aptitudes: (employee.empleado_aptitudes?.map((ea) => ea.aptitudes_tecnicas?.id).filter(Boolean) as string[]) || [],
    date_of_admission: employee.date_of_admission ? moment(employee.date_of_admission).format('YYYY-MM-DD') : undefined,
    guild_id: employee.guild_id || undefined,
    covenants_id: employee.covenants_id || undefined,
    category_id: employee.category_id || undefined,
    cost_center_id: employee.cost_center_id || undefined,
    cost_type: employee.cost_type || undefined,
    workshop_sector_ids:
      (employee.employee_workshop_sectors?.map((ews) => ews.workshop_sectors?.id).filter(Boolean) as string[]) ?? [],
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmployeeDetailClientProps {
  employee: EmployeeDetailData | null;
  employeeId: string;
  initialMode: 'view' | 'edit' | 'new';
  companyId: string;
  /** Server Component pre-renderizado con el header del empleado */
  header: React.ReactNode;
  /** Slot de documentos (Server Component pre-renderizado) */
  documentsSlot: React.ReactNode;
  /** Slot de diagramas envuelto en Suspense (Server Component pre-renderizado) */
  diagramsSlot: React.ReactNode;
  /** Slot de indumentaria/EPP envuelto en Suspense (Server Component pre-renderizado) */
  clothingSlot: React.ReactNode;
}

type ActiveTab = 'personalData' | 'contactData' | 'workData';

// ─── Componente ───────────────────────────────────────────────────────────────

export function EmployeeDetailClient({
  employee,
  employeeId,
  initialMode,
  companyId: _companyId,
  header,
  documentsSlot,
  diagramsSlot,
  clothingSlot,
}: EmployeeDetailClientProps) {
  const [currentMode, setCurrentMode] = useState<'view' | 'edit' | 'new'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { canView } = usePermissions();

  // ─── Form único compartido entre las 3 tabs de datos ─────────────────────
  // Vive en el padre inmediato de las tabs para que el estado se preserve
  // aunque las tabs inactivas se desmonten del DOM (comportamiento por defecto
  // de Radix TabsContent). Los campos usan shouldUnregister: false por defecto,
  // así que los valores permanecen en el form state cuando los inputs se desmontan.
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: buildDefaultValues(employee),
  });

  // ─── Errores por tab derivados directamente (sin useEffect) ──────────────
  const formErrors = form.formState.errors;
  const tabErrors = {
    personalData: PERSONAL_DATA_FIELDS.some((f) => f in formErrors),
    contactData: CONTACT_DATA_FIELDS.some((f) => f in formErrors),
    workData: WORK_DATA_FIELDS.some((f) => f in formErrors),
  };

  // Verificar acceso a la tab de diagramas (alguna de sus subtabs)
  const hasDiagramAccess = canView('empleados', 'diagramas-empleado') || canView('empleados', 'new');

  // Verificar acceso a la tab de indumentaria
  const hasClothingAccess = canView('empleados', 'indumentaria_empleado');

  // ─── Handlers de modo ──────────────────────────────────────────────────────
  const switchToEdit = () => {
    setCurrentMode('edit');
    window.history.replaceState(null, '', `?action=edit&employee_id=${employeeId}`);
  };

  const switchToView = () => {
    setCurrentMode('view');
    window.history.replaceState(null, '', `?action=view&employee_id=${employeeId}`);
  };

  const handleSaved = (newEmployeeId?: string) => {
    if (newEmployeeId) {
      // Nuevo empleado creado: full reload para cargar los datos del servidor
      window.location.href = `?action=view&employee_id=${newEmployeeId}`;
    } else {
      switchToView();
      // Refrescar datos del servidor sin perder el estado de la URL
      router.refresh();
    }
  };

  // ─── Submit del form ──────────────────────────────────────────────────────
  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      if (currentMode === 'new') {
        const created = await createEmployee(data);
        handleSaved(created.id);
      } else if (currentMode === 'edit' && employee?.id) {
        await updateEmployee(employee.id, data);
        handleSaved();
      }
    } catch (error) {
      logger.error('Error al guardar empleado', { data: { error } });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Construcción de tabs ─────────────────────────────────────────────────
  const isFormMode = currentMode === 'edit' || currentMode === 'new';

  const buildTabLabel = (icon: React.ReactNode, text: string, hasError: boolean) => (
    <div className={cn('flex items-center gap-2', hasError && 'text-destructive')}>
      {icon}
      <span className="hidden sm:inline">{text}</span>
      {hasError && <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-label="Errores en esta pestaña" />}
    </div>
  );

  const tabs = [
    {
      value: 'personalData',
      label: buildTabLabel(<User className="h-4 w-4" />, 'Datos Personales', isFormMode && tabErrors.personalData),
      moduleSlug: 'empleados' as const,
      tabSlug: 'datos-personales' as const,
      content: isFormMode ? (
        <EmployeePersonalDataForm form={form} />
      ) : employee ? (
        <EmployeeViewDisplay employee={employee} activeTab="personalData" />
      ) : null,
    },
    {
      value: 'contactData',
      label: buildTabLabel(<Phone className="h-4 w-4" />, 'Datos de Contacto', isFormMode && tabErrors.contactData),
      moduleSlug: 'empleados' as const,
      tabSlug: 'datos-contacto' as const,
      content: isFormMode ? (
        <EmployeeContactDataForm form={form} />
      ) : employee ? (
        <EmployeeViewDisplay employee={employee} activeTab="contactData" />
      ) : null,
    },
    {
      value: 'workData',
      label: buildTabLabel(<Briefcase className="h-4 w-4" />, 'Datos Laborales', isFormMode && tabErrors.workData),
      moduleSlug: 'empleados' as const,
      tabSlug: 'datos-laborales' as const,
      content: isFormMode ? (
        <EmployeeWorkDataForm form={form} />
      ) : employee ? (
        <EmployeeViewDisplay employee={employee} activeTab="workData" />
      ) : null,
    },
    {
      value: 'documents',
      label: (
        <div className="flex items-center gap-2">
          {currentMode === 'new' ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          <span className="hidden sm:inline">Documentación</span>
        </div>
      ),
      moduleSlug: 'documentacion' as const,
      tabSlug: 'documentos-de-empleados' as const,
      disabled: currentMode === 'new',
      content: documentsSlot,
    },
    // Tab de diagramas: solo si el usuario tiene acceso y no es modo new
    ...(hasDiagramAccess && currentMode !== 'new'
      ? [
          {
            value: 'diagrams',
            label: (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Diagramas</span>
              </div>
            ),
            // Sin moduleSlug/tabSlug: la visibilidad la controlan sus subtabs internas
            disabled: false,
            content: diagramsSlot,
          },
        ]
      : []),
    // Tab de indumentaria: solo si el usuario tiene acceso
    ...(hasClothingAccess
      ? [
          {
            value: 'clothing',
            label: (
              <div className="flex items-center gap-2">
                {currentMode === 'new' ? <Lock className="h-4 w-4" /> : <Shirt className="h-4 w-4" />}
                <span className="hidden sm:inline">Indumentaria</span>
              </div>
            ),
            moduleSlug: 'empleados' as const,
            tabSlug: 'indumentaria_empleado' as const,
            disabled: currentMode === 'new',
            content: clothingSlot,
          },
        ]
      : []),
  ];

  // ─── Bloque de tabs (común a ambos modos) ────────────────────────────────
  const tabsBlock = (
    <div className="px-6 pb-6">
      <TabsManagerClientSide<'empresa' | 'empleados' | 'documentacion'>
        paramName="tab"
        defaultTab="personalData"
        tabs={tabs}
        listClassName="grid w-full grid-cols-6"
        triggerClassName="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      />
    </div>
  );

  // ─── Badge de error global (visible en modo form) ────────────────────────
  const hasAnyError = tabErrors.personalData || tabErrors.contactData || tabErrors.workData;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Header: pre-renderizado en el servidor */}
      {header}

      {/* Barra de acciones */}
      <div className={cn('flex items-center justify-between px-6 pb-4', !header && 'pt-4')}>
        {/* Botón volver */}
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Volver</span>
        </Button>

        {/* Acciones del empleado */}
        <div className="flex items-center gap-2">
          {/* Quick actions (solo en modo view con empleado existente) */}
          {currentMode === 'view' && employee && (
            <EmployeeQuickActions
              employeeId={employeeId}
              isActive={employee.is_active ?? true}
              email={employee.email ?? undefined}
            />
          )}

          {/* Botón Editar (solo en modo view) */}
          {currentMode === 'view' && (
            <PermissionGuard module="empleados" tab="employees" action="update">
              <Button size="sm" onClick={switchToEdit} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            </PermissionGuard>
          )}

          {/* Botón Cancelar (solo en modo edit) */}
          {currentMode === 'edit' && (
            <Button variant="outline" size="sm" onClick={switchToView} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Cancelar</span>
            </Button>
          )}
        </div>
      </div>

      {/* En modo form envolvemos todo en <Form> + <form> para que el submit
          recoja los valores de todas las tabs desde el único form state. */}
      {isFormMode ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
            {tabsBlock}

            {/* Badge de error global + botón de submit (siempre visibles, fuera de los tabs) */}
            <div className="flex flex-col gap-3 px-6 pb-6">
              {hasAnyError && (
                <Badge className="h-6 w-fit hover:no-underline" variant="destructive">
                  Falta corregir algunos campos en{' '}
                  {[
                    tabErrors.personalData && 'Datos Personales',
                    tabErrors.contactData && 'Datos de Contacto',
                    tabErrors.workData && 'Datos Laborales',
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Badge>
              )}
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-fit">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting
                          ? 'Guardando...'
                          : currentMode === 'edit'
                            ? 'Guardar cambios'
                            : 'Agregar empleado'}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    {form.formState.isValid ? '¡Todo listo para guardar!' : 'Completa todos los campos requeridos'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </form>
        </Form>
      ) : (
        tabsBlock
      )}
    </div>
  );
}
