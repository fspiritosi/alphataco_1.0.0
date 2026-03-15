'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import moment from 'moment';
import { useState } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import type { EmployeeDetailData } from '../actions.server';
import { createEmployee, updateEmployee } from '../actions.server';
import { EmployeeContactDataForm } from './forms/employee-contact-data-form';
import { employeeFormSchema, type EmployeeFormData } from './forms/employee-form';
import { EmployeePersonalDataForm } from './forms/employee-personal-data-form';
import { EmployeeWorkDataForm } from './forms/employee-work-data-form';

const logger = new Logger('EmployeeFormWrapper');

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
    workshop_sector_id: employee.workshop_sector_id || undefined,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface EmployeeFormWrapperProps {
  employee: EmployeeDetailData | null;
  mode: 'edit' | 'new';
  companyId: string;
  /**
   * Callback invocado tras guardar exitosamente.
   * - En modo 'new': se pasa el ID del empleado creado para que el padre redirija.
   * - En modo 'edit': se llama sin argumentos para que el padre vuelva al modo view.
   */
  onSaved?: (newEmployeeId?: string) => void;
  activeTab: 'personalData' | 'contactData' | 'workData';
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function EmployeeFormWrapper({ employee, mode, onSaved, activeTab }: EmployeeFormWrapperProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // ─── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      if (mode === 'new') {
        const created = await createEmployee(data);
        onSaved?.(created.id);
      } else if (mode === 'edit' && employee?.id) {
        await updateEmployee(employee.id, data);
        onSaved?.();
      }
    } catch (error) {
      logger.error('Error al guardar empleado', { data: { error } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        {/* Badge de error para la tab activa */}
        {activeTab === 'personalData' && tabErrors.personalData && (
          <Badge className="h-6 hover:no-underline mb-4" variant="destructive">
            Falta corregir algunos campos
          </Badge>
        )}
        {activeTab === 'contactData' && tabErrors.contactData && (
          <Badge className="h-6 hover:no-underline mb-4" variant="destructive">
            Falta corregir algunos campos
          </Badge>
        )}
        {activeTab === 'workData' && tabErrors.workData && (
          <Badge className="h-6 hover:no-underline mb-4" variant="destructive">
            Faltan corregir algunos campos
          </Badge>
        )}

        {/* Sub-form correspondiente a la tab activa */}
        <div className="px-2 py-2">
          {activeTab === 'personalData' && <EmployeePersonalDataForm form={form} />}
          {activeTab === 'contactData' && <EmployeeContactDataForm form={form} />}
          {activeTab === 'workData' && <EmployeeWorkDataForm form={form} />}
        </div>

        {/* Botón de submit */}
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-fit">
                <Button type="submit" className="mt-5 ml-2" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Agregar empleado'}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px]">
              {form.formState.isValid ? '¡Todo listo para guardar!' : 'Completa todos los campos requeridos'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </form>
    </Form>
  );
}
