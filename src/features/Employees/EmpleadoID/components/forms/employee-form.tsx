'use client';

import { getEmployeeById } from '@/app/server/GET/actions';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Logger } from '@/lib/logger';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { createEmployee, updateEmployee } from '../../actions.server';
import { EmployeeContactDataForm } from './employee-contact-data-form';
import { EmployeePersonalDataForm } from './employee-personal-data-form';
import { EmployeeWorkDataForm } from './employee-work-data-form';

const logger = new Logger('EmployeeForm');

export const employeeFormSchema = z.object({
  // Datos Personales
  firstname: z.string().min(1, 'Nombre es requerido'),
  lastname: z.string().min(1, 'Apellido es requerido'),
  nationality: z.string().min(1, 'Nacionalidad es requerida'),
  born_date: z.string().min(1, 'Fecha de nacimiento es requerida'),
  cuil: z.string().min(1, 'CUIL es requerido'),
  document_type: z.string().min(1, 'Tipo de documento es requerido'),
  document_number: z.string().min(1, 'Número de documento es requerido'),
  birthplace: z.string().min(1, 'País de nacimiento es requerido'),
  gender: z.string().min(1, 'Sexo es requerido'),
  marital_status: z.string().min(1, 'Estado civil es requerido'),
  level_of_education: z.string().min(1, 'Nivel de instrucción es requerido'),
  picture: z.string().optional(),

  // Datos de Contacto
  street: z.string().min(1, 'Calle es requerida'),
  street_number: z.string().min(1, 'Altura es requerida'),
  province: z.number().min(1, 'Provincia es requerida'),
  city: z.number().min(1, 'Ciudad es requerida'),
  postal_code: z.string().min(1, 'Código postal es requerido'),
  phone: z.string().min(1, 'Teléfono es requerido'),
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),

  // Datos Laborales
  file: z.string().min(1, 'Legajo es requerido'),
  hierarchical_position: z.string().min(1, 'Sector es requerido'),
  company_position: z.string().min(1, 'Puesto en la empresa es requerido'),
  workflow_diagram: z.string().min(1, 'Diagrama de trabajo es requerido'),
  normal_hours: z.string().optional(),
  type_of_contract: z.string().optional(),
  aptitudes: z.array(z.string()).optional(),
  allocated_to: z.array(z.string()).optional(),
  date_of_admission: z.string().optional(),
  guild_id: z.string().optional(),
  covenants_id: z.string().optional(),
  category_id: z.string().optional(),
  cost_center_id: z.string().optional(),
  cost_type: z.string().optional(),
  workshop_sector_id: z.string().optional(),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  employee: Awaited<ReturnType<typeof getEmployeeById>> | null;
  activeTab: 'personalData' | 'contactData' | 'workData';
  mode: 'new' | 'edit' | 'view';
  form: UseFormReturn<EmployeeFormData>;
  onSave?: (data: EmployeeFormData) => void;
  onErrorsChange?: (errors: { personalData: boolean; contactData: boolean; workData: boolean }) => void;
}

export function EmployeeForm({ employee, mode, onSave, form, activeTab }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const refresh = (createdEmployeeId?: string | undefined) => {
    if (!createdEmployeeId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('action', 'view');
      router.refresh();
      router.push(`${pathname}?${params.toString()}`);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set('action', 'view');
      params.set('employee_id', createdEmployeeId.toString());
      router.refresh();
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);

    let createdEmployeeId;
    try {
      if (mode === 'new') {
        const createdEmployee = await createEmployee(data);
        createdEmployeeId = createdEmployee.id;
      } else if (mode === 'edit' && employee?.id) {
        await updateEmployee(employee.id, data);
      }
      refresh(createdEmployeeId);
    } catch (error) {
      logger.error('Error saving employee', { data: { error } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        {/* Tabs component wrapping TabsContent */}
        <Tabs defaultValue={activeTab} className="w-full">
          {/* Tab Datos Personales */}
          <TabsContent value="personalData" className="px-2 py-2">
            <EmployeePersonalDataForm form={form} />
          </TabsContent>

          <TabsContent value="contactData" className="px-2 py-2">
            <EmployeeContactDataForm form={form} />
          </TabsContent>

          <TabsContent value="workData" className="px-2 py-2">
            <EmployeeWorkDataForm form={form} />
          </TabsContent>
        </Tabs>
        {/* Botón de envío visible en todas las tabs del formulario */}
        {
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-fit">
                  {mode !== 'view' && (
                    <Button type="submit" className="mt-5 ml-2" disabled={isSubmitting}>
                      {isSubmitting ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Agregar empleado'}
                    </Button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                {form.formState.isValid ? '¡Todo listo para guardar!' : 'Completa todos los campos requeridos'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      </form>
    </Form>
  );
}
