'use client';

import { fetchAllEmployees } from '@/shared/actions/employees.actions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';
import { BadgeCheck, Briefcase, Building, ClipboardSignature, CreditCard, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { createFilterOptions, formatEmployeesForTable } from '../../utils/utils';
import { employeeColumns } from './columns';
import { EmployeeTableData } from './types';

interface EmployeesTableProps {
  onRowClick?: (employee: EmployeeTableData) => void;
  className?: string;
  employeesPromise?: ReturnType<typeof fetchAllEmployees>;
  tableId?: string;
  savedVisibility: VisibilityState;
  row_classname?: string;
  savedFilters?: string[];
  transformedEmployees?: Awaited<ReturnType<typeof fetchAllEmployees>>;
}

// Función especial para propiedades anidadas complejas como las afectaciones
export const createNestedFilterOptions = <T extends any>(
  data: T[] | undefined,
  accessor: (item: T) => any[],
  icon: React.ComponentType<{ className?: string }>
) => {
  const uniqueValues = Array.from(
    new Set(
      data
        ?.map((item) => accessor(item))
        .flat()
        .filter(Boolean)
    )
  );

  return uniqueValues.map((value) => ({
    label: value || '',
    value: value || '',
    icon,
  }));
};

export function EmployeesTableReusable({
  onRowClick,
  className,
  employeesPromise,
  tableId = 'employees-table',
  savedVisibility,
  row_classname,
  transformedEmployees,

  savedFilters,
}: EmployeesTableProps) {
  const router = useRouter();
  const employees2 = employeesPromise ? use(employeesPromise) : transformedEmployees;
  const employees = formatEmployeesForTable(employees2 as any);

  // Generar todas las opciones de filtro utilizando las funciones utilitarias
  const positions = createFilterOptions(
    employees,
    (employee) => employee?.hierarchy?.name,
    Briefcase // Icono de maletín para cargos/posiciones
  );

  const afectacionesOpciones = createNestedFilterOptions(
    employees?.filter((employee) => employee?.contractor_employee?.length > 0),
    (employee) => employee?.contractor_employee.map((contractor) => contractor?.customers?.name).filter(Boolean) || [],
    Building // Icono de edificio para afectaciones/contratistas
  );

  const contractTypes = createFilterOptions(
    employees,
    (employee) => employee?.type_of_contract,
    ClipboardSignature // Icono de contrato/firma para tipos de contrato
  );

  const statuses = createFilterOptions(
    employees,
    (employee) => employee?.status,
    BadgeCheck // Icono de insignia para estados
  );

  const tiposDocumento = createFilterOptions(
    employees,
    (employee) => employee?.document_type,
    CreditCard // Icono de tarjeta para tipos de documento
  );

  const cuils = createFilterOptions(
    employees,
    (employee) => employee?.cuil,
    FileText // Icono de documento para números de CUIL
  );

  const nationality = createFilterOptions(
    employees,
    (employee) => employee?.nationality,
    FileText // Icono para nacionalidad
  );

  const gender = createFilterOptions(
    employees,
    (employee) => employee?.gender,
    FileText // Icono para género
  );
  const documenNumber = createFilterOptions(employees, (employee) => employee?.document_number);
  const maritalStatus = createFilterOptions(employees, (employee) => employee?.marital_status);
  const levelOfEducation = createFilterOptions(employees, (employee) => employee?.level_of_education);
  const street = createFilterOptions(employees, (employee) => employee?.street);
  const streetNumber = createFilterOptions(employees, (employee) => employee?.street_number);

  const city = createFilterOptions(employees, (employee) => employee?.cities?.name);
  const postalCode = createFilterOptions(employees, (employee) => employee?.postal_code);
  const phone = createFilterOptions(employees, (employee) => employee?.phone);
  const email = createFilterOptions(employees, (employee) => employee?.email);
  const legajo = createFilterOptions(employees, (employee) => employee?.file);
  const sector = createFilterOptions(employees, (employee) => employee?.hierarchy?.name);
  const puesto = createFilterOptions(employees, (employee) => employee?.company_positions?.name);
  const diagram = createFilterOptions(employees, (employee) => employee?.work_diagram?.name);
  const normalHours = createFilterOptions(employees, (employee) => employee?.normal_hours);
  const costCenter = createFilterOptions(employees, (employee) => employee?.cost_center_name);
  const provinces = createFilterOptions(employees, (employee) => employee?.provinces?.name);
  const affiliateStatus = createFilterOptions(employees, (employee) => employee?.affiliate_status);
  const status = createFilterOptions(employees, (employee) => employee?.affiliate_status);
  const nombres = createFilterOptions(employees, (employee) => employee?.lastname + ' ' + employee?.firstname);
  const handleRowClick = (employee: EmployeeTableData) => {
    if (onRowClick) {
      onRowClick(employee);
    } else {
      router.push(`/dashboard/employee/action?action=view&employee_id=${employee.id}`);
    }
  };

  return (
    <BaseDataTable
      columns={employeeColumns as any}
      data={(employees as any) || []}
      onRowClick={handleRowClick}
      className={className}
      tableId={tableId}
      savedVisibility={savedVisibility}
      toolbarOptions={{
        showFilterOptions: true,
        initialVisibleFilters: savedFilters || [],
        filterableColumns: [
          {
            columnId: 'Nombre',
            title: 'Nombre',
            options: nombres,
          },
          {
            columnId: 'Nacionalidad',
            title: 'Nacionalidad',
            options: nationality,
          },
          {
            columnId: 'Cuil',
            title: 'Cuil',
            options: cuils,
          },
          {
            columnId: 'Estado',
            title: 'Estado',
            options: statuses,
          },
          {
            columnId: 'Tipo de Documento',
            title: 'Tipo de Documento',
            options: tiposDocumento,
          },
          {
            columnId: 'Sector',
            title: 'Sector',
            options: positions,
          },
          {
            columnId: 'Tipo de Contrato',
            title: 'Tipo de Contrato',
            options: contractTypes,
          },
          {
            columnId: 'Afectaciones',
            title: 'Afectaciones',
            options: afectacionesOpciones,
          },
          {
            columnId: 'Genero',
            title: 'Genero',
            options: gender,
          },
          {
            columnId: 'Documento',
            title: 'Documento',
            options: documenNumber,
          },
          {
            columnId: 'Estado Civil',
            title: 'Estado Civil',
            options: maritalStatus,
          },
          {
            columnId: 'Nivel de Educacion',
            title: 'Nivel de Educacion',
            options: levelOfEducation,
          },
          {
            columnId: 'Calle',
            title: 'Domicilio',
            options: street,
          },
          {
            columnId: 'Altura',
            title: 'Altura',
            options: streetNumber,
          },
          {
            columnId: 'Ciudad',
            title: 'Ciudad',
            options: city,
          },
          {
            columnId: 'CP',
            title: 'Codigo Postal',
            options: postalCode,
          },
          {
            columnId: 'Teléfono',
            title: 'Telefono',
            options: phone,
          },
          {
            columnId: 'Email',
            title: 'Email',
            options: email,
          },
          {
            columnId: 'Legajo',
            title: 'Legajo',
            options: legajo,
          },
          {
            columnId: 'Sector',
            title: 'Sector',
            options: sector,
          },
          {
            columnId: 'Puesto',
            title: 'Puesto',
            options: puesto,
          },
          {
            columnId: 'Diagrama',
            title: 'Diagrama',
            options: diagram,
          },
          {
            columnId: 'Horas',
            title: 'Horas',
            options: normalHours,
          },
          {
            columnId: 'Centro de costo',
            title: 'Centro de Costo',
            options: costCenter,
          },
          {
            columnId: 'Estado',
            title: 'Estado',
            options: status,
          },
          {
            columnId: 'Provincia',
            title: 'Provincia',
            options: provinces,
          },
          {
            columnId: 'Estado de afiliación',
            title: 'Estado de afiliado',
            options: affiliateStatus,
          },
        ],
        // searchableColumns: [{ columnId: 'Nombre', placeholder: 'Buscar empleado...' }],
        showViewOptions: true,
      }}
    />
  );
}
