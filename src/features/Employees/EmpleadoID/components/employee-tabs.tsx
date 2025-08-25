'use client';

import { getEmployeeById } from '@/app/server/GET/actions';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchAllAptitudesTecnicas, fetchAllContractTypes } from '@/features/Empresa/RRHH/actions/actions';
import { cn } from '@/lib/utils';
import { fetchCountrys } from '@/shared/actions/employees.actions';
import { useEmployeeFormReset } from '@/store/employeeFormReset';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, Briefcase, FileText, Lock, Phone, User } from 'lucide-react';
import moment from 'moment';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
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
} from '../lib/actions/catalog-actions';
import { EmployeeForm, EmployeeFormData, employeeFormSchema } from './forms/employee-form';

interface EmployeeTabsProps {
  employeeId?: string;
  mode: 'new' | 'edit' | 'view';
  employee: Awaited<ReturnType<typeof getEmployeeById>> | null;

  //Componentes
  documentsComponent: React.ReactNode;
  diagramsComponent: React.ReactNode;

  //Props para las opciones
  countriesPromise: ReturnType<typeof fetchCountrys>;
  costCentersPromise: ReturnType<typeof fetchAllCostCenters>;
  hierarchicalPositionsPromise: ReturnType<typeof fetchHierarchicalPositions>;
  companyPositionsPromise: ReturnType<typeof fetchCompanyPositions>;
  workflowDiagramsPromise: ReturnType<typeof fetchWorkflowDiagrams>;
  guildsPromise: ReturnType<typeof fetchGuilds>;
  covenantsPromise: ReturnType<typeof fetchCovenants>;
  categoriesPromise: ReturnType<typeof fetchCategories>;
  contractorCompaniesPromise: ReturnType<typeof fetchContractorCompanies>;
  provincesPromise: ReturnType<typeof fetchProvinces>;
  citiesPromise: ReturnType<typeof fetchCitiesByProvinceId>;
  typeOfContractsPromise: ReturnType<typeof fetchAllContractTypes>;
  aptitudesPromise: ReturnType<typeof fetchAllAptitudesTecnicas>;
}

export function EmployeeTabs({
  employeeId,
  mode,
  employee,

  //Componentes
  documentsComponent,
  diagramsComponent,

  //Props para las opciones
  countriesPromise,
  categoriesPromise,
  contractorCompaniesPromise,
  covenantsPromise,
  costCentersPromise,
  companyPositionsPromise,
  guildsPromise,
  hierarchicalPositionsPromise,
  workflowDiagramsPromise,
  provincesPromise,
  citiesPromise,
  typeOfContractsPromise,
  aptitudesPromise,
}: EmployeeTabsProps) {
  // const [activeTab, setActiveTab] = useState("personalData")
  const [errors, setErrors] = useState<{
    personalData: boolean;
    contactData: boolean;
    workData: boolean;
  }>({
    personalData: false,
    contactData: false,
    workData: false,
  });

  const { resetTrigger } = useEmployeeFormReset();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstname: employee?.firstname || undefined,
      lastname: employee?.lastname || undefined,
      nationality: employee?.nationality || undefined,
      born_date: employee?.born_date ? moment(employee?.born_date).format('YYYY-MM-DD') : undefined,
      cuil: employee?.cuil || undefined,
      document_type: employee?.document_type || undefined,
      document_number: employee?.document_number || undefined,
      birthplace: employee?.countries?.id || undefined,
      gender: employee?.gender || undefined,
      marital_status: employee?.marital_status || undefined,
      level_of_education: employee?.level_of_education || undefined,
      picture: employee?.picture || undefined,
      street: employee?.street || undefined,
      street_number: employee?.street_number || undefined,
      province: employee?.provinces?.id,
      city: employee?.cities?.id,
      postal_code: employee?.postal_code || undefined,
      phone: employee?.phone || undefined,
      email: employee?.email || undefined,
      hierarchical_position: employee?.hierarchical_position || undefined,
      file: employee?.file || undefined,
      company_position: employee?.company_position || undefined,
      workflow_diagram: employee?.workflow_diagram || undefined,
      normal_hours: employee?.normal_hours || undefined,
      type_of_contract: employee?.type_of_contract || undefined,
      allocated_to: employee?.allocated_to || [],
      aptitudes: employee?.aptitudes || [],
      date_of_admission: employee?.date_of_admission || undefined,
      guild_id: employee?.guild_id || undefined,
      covenants_id: employee?.covenants_id || undefined,
      category_id: employee?.category_id || undefined,
      cost_center_id: employee?.cost_center_id || undefined,
    },
  });

  // useEffect para manejar el reset del formulario
  useEffect(() => {
    if (resetTrigger > 0) {
      form.reset();
    }
  }, [resetTrigger]);

  useEffect(() => {
    const personalDataFields = [
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
    const contactDataFields = ['street', 'street_number', 'province', 'city', 'postal_code', 'phone', 'email'];
    const workDataFields = ['file', 'hierarchical_position', 'company_position', 'workflow_diagram'];

    const errors = form.formState.errors;

    const personalDataErrors = personalDataFields.some((field) => errors[field as keyof typeof errors]);
    const contactDataErrors = contactDataFields.some((field) => errors[field as keyof typeof errors]);
    const workDataErrors = workDataFields.some((field) => errors[field as keyof typeof errors]);

    setErrors({
      personalData: personalDataErrors,
      contactData: contactDataErrors,
      workData: workDataErrors,
    });
  }, [form.formState.errors]);

  return (
    <Tabs defaultValue="personalData" className="w-full p-4">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger
          value="personalData"
          className={cn('flex items-center gap-2', errors?.personalData && 'bg-red-300 text-red-50')}
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Datos Personales</span>
        </TabsTrigger>

        <TabsTrigger
          value="contactData"
          className={cn('flex items-center gap-2', errors?.contactData && 'bg-red-300 text-red-50')}
        >
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">Datos de Contacto</span>
        </TabsTrigger>

        <TabsTrigger
          value="workData"
          className={cn('flex items-center gap-2', errors?.workData && 'bg-red-300 text-red-50')}
        >
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Datos Laborales</span>
        </TabsTrigger>

        {employeeId && (
          <div
            className={cn('w-full flex items- justify-center gap-2', mode === 'new' ? 'hover:cursor-not-allowed' : '')}
          >
            <TabsTrigger value="documents" disabled={mode === 'new'} className="flex items-center gap-2">
              {mode === 'new' ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              <span className="hidden sm:inline">Documentación</span>
            </TabsTrigger>
          </div>
        )}

        {employeeId && (
          <div
            className={cn('w-full flex items- justify-center gap-2', mode === 'new' ? 'hover:cursor-not-allowed' : '')}
          >
            <TabsTrigger
              value="diagrams"
              disabled={mode === 'new'}
              className={cn('flex items-center gap-2', mode === 'new' ? 'hover:cursor-not-allowed opacity-50' : '')}
            >
              {mode === 'new' ? <Lock className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
              <span className="hidden sm:inline">Diagramas</span>
            </TabsTrigger>
          </div>
        )}
      </TabsList>

      {/* Tabs del formulario */}
      <TabsContent value="personalData" className="">
        {errors?.personalData && (
          <Badge className="h-6 hover:no-underline mb-4" variant="destructive">
            Falta corregir algunos campos
          </Badge>
        )}
        <EmployeeForm
          options={{
            personalData: {
              countriesPromise,
            },
            contactData: {
              provincesPromise,
              citiesPromise,
            },
            workData: {
              costCentersPromise,
              hierarchicalPositionsPromise,
              companyPositionsPromise,
              workflowDiagramsPromise,
              guildsPromise,
              covenantsPromise,
              categoriesPromise,
              contractorCompaniesPromise,
              typeOfContractsPromise,
              aptitudesPromise,
            },
          }}
          form={form}
          employee={employee}
          activeTab="personalData"
          mode={mode}
        />
      </TabsContent>

      <TabsContent value="contactData" className="">
        {errors?.contactData && (
          <Badge className="h-6 hover:no-underline mb-4" variant="destructive">
            Falta corregir algunos campos
          </Badge>
        )}
        <EmployeeForm
          options={{
            personalData: {
              countriesPromise,
            },
            contactData: {
              provincesPromise,
              citiesPromise,
            },
            workData: {
              costCentersPromise,
              hierarchicalPositionsPromise,
              companyPositionsPromise,
              workflowDiagramsPromise,
              guildsPromise,
              covenantsPromise,
              categoriesPromise,
              contractorCompaniesPromise,
              typeOfContractsPromise,
              aptitudesPromise,
            },
          }}
          activeTab="contactData"
          form={form}
          employee={employee}
          mode={mode}
        />
      </TabsContent>

      <TabsContent value="workData" className="">
        {errors?.workData && (
          <Badge className="h-6 hover:no-underline mb-4" variant="destructive">
            Faltan corregir algunos campos
          </Badge>
        )}
        <EmployeeForm
          options={{
            personalData: {
              countriesPromise,
            },
            contactData: {
              provincesPromise,
              citiesPromise,
            },
            workData: {
              costCentersPromise,
              hierarchicalPositionsPromise,
              companyPositionsPromise,
              workflowDiagramsPromise,
              guildsPromise,
              covenantsPromise,
              categoriesPromise,
              contractorCompaniesPromise,
              typeOfContractsPromise,
              aptitudesPromise,
            },
          }}
          activeTab="workData"
          form={form}
          employee={employee}
          mode={mode}
        />
      </TabsContent>

      {/* Tabs independientes */}
      {employeeId && (
        <TabsContent value="documents" className="">
          {documentsComponent}
        </TabsContent>
      )}

      {employeeId && (
        <TabsContent value="diagrams" className="">
          {diagramsComponent}
        </TabsContent>
      )}
    </Tabs>
  );
}
