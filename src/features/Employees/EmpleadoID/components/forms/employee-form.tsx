'use client';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Logger } from '@/lib/logger';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ContactDataFields } from '../../../shared/forms/ContactDataFields';
import { PersonalDataFields } from '../../../shared/forms/PersonalDataFields';
import { createEmployee, getEmployeeByIdCached, updateEmployee } from '../../actions.server';
import type { EmployeeFormData } from '../../schemas/employee-schema';
import { EmployeeWorkDataForm } from './employee-work-data-form';

const logger = new Logger('EmployeeForm');

// Los schemas viven en `../../schemas/employee-schema` (modulo sin 'use client') para que
// tambien puedan usarse desde el servidor. Se re-exportan para no romper los imports de
// componentes de cliente que ya los tomaban desde aca.
export {
  employeeFormSchema,
  employeeWorkDataSchema,
  type EmployeeFormData,
  type EmployeeWorkDataValues,
} from '../../schemas/employee-schema';

interface EmployeeFormProps {
  employee: Awaited<ReturnType<typeof getEmployeeByIdCached>> | null;
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
    const params = new URLSearchParams(searchParams.toString());
    params.set('action', 'view');
    if (createdEmployeeId) {
      params.set('employee_id', createdEmployeeId.toString());
    }
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
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
            <PersonalDataFields />
          </TabsContent>

          <TabsContent value="contactData" className="px-2 py-2">
            <ContactDataFields />
          </TabsContent>

          <TabsContent value="workData" className="px-2 py-2">
            <EmployeeWorkDataForm />
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
