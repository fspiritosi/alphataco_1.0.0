'use client';

import { getEmployeeById } from '@/app/server/GET/actions';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchAllAptitudesTecnicas } from '@/features/Empresa/RRHH/actions/actions';
import { fetchAllContractTypes } from '@/features/Empresa/RRHH/components/TypeContract/actions/actions';
import { Logger } from '@/lib/logger';
import { fetchCountrys } from '@/shared/actions/employees.actions';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import {
  fetchActiveWorkshopSectors,
  fetchAllCostCenters,
  fetchCategories,
  fetchCitiesByProvinceId,
  fetchCompanyPositions,
  fetchContractorCompanies,
  fetchCovenants,
  fetchGuilds,
  fetchHierarchicalPositions,
  fetchProvinces,
  fetchWorkflowDiagrams,
} from '../../lib/actions/catalog-actions';
import { createEmployee, updateEmployee } from '../../lib/actions/employee-actions';
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
type FetchCountries = ReturnType<typeof fetchCountrys>;

export type Options = {
  personalData: {
    countriesPromise: FetchCountries;
  };
  contactData: {
    // agrega props cuando existan
    provincesPromise: ReturnType<typeof fetchProvinces>;
    citiesPromise: ReturnType<typeof fetchCitiesByProvinceId>;
  };
  workData: {
    costCentersPromise: ReturnType<typeof fetchAllCostCenters>;
    hierarchicalPositionsPromise: ReturnType<typeof fetchHierarchicalPositions>;
    companyPositionsPromise: ReturnType<typeof fetchCompanyPositions>;
    workflowDiagramsPromise: ReturnType<typeof fetchWorkflowDiagrams>;
    guildsPromise: ReturnType<typeof fetchGuilds>;
    covenantsPromise: ReturnType<typeof fetchCovenants>;
    categoriesPromise: ReturnType<typeof fetchCategories>;
    contractorCompaniesPromise: ReturnType<typeof fetchContractorCompanies>;
    typeOfContractsPromise: ReturnType<typeof fetchAllContractTypes>;
    aptitudesPromise: ReturnType<typeof fetchAllAptitudesTecnicas>;
    workshopSectorsPromise: ReturnType<typeof fetchActiveWorkshopSectors>;
  };
};

interface EmployeeFormProps {
  employee: Awaited<ReturnType<typeof getEmployeeById>> | null;
  activeTab: 'personalData' | 'contactData' | 'workData'; // vuelve a ser independiente
  mode: 'new' | 'edit' | 'view';
  form: UseFormReturn<EmployeeFormData>;
  onSave?: (data: EmployeeFormData) => void;
  onErrorsChange?: (errors: { personalData: boolean; contactData: boolean; workData: boolean }) => void;
  options: Options;
}
export function EmployeeForm({ employee, mode, onSave, form, options, activeTab }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const readOnly = mode === 'view';
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
        const emnployee = await createEmployee(data as any);
        createdEmployeeId = emnployee.id;
      } else if (mode === 'edit' && employee?.id) {
        await updateEmployee(employee.id, data as any);
      }
      // onSave?.(data)
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
            <EmployeePersonalDataForm options={options.personalData} form={form} readOnly={readOnly} />
          </TabsContent>

          <TabsContent value="contactData" className="px-2 py-2">
            <EmployeeContactDataForm options={options.contactData} form={form} readOnly={readOnly} />
          </TabsContent>

          <TabsContent value="workData" className="px-2 py-2">
            <EmployeeWorkDataForm options={options.workData} form={form} readOnly={readOnly} />
          </TabsContent>
        </Tabs>
        {/* Botón de envío visible en todas las tabs del formulario */}
        {
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-fit">
                  {!readOnly && (
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
