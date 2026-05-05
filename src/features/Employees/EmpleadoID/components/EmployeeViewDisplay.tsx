'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import moment from 'moment';
import type { EmployeeDetailData } from '../actions.server';

interface EmployeeViewDisplayProps {
  employee: NonNullable<EmployeeDetailData>;
  activeTab: string;
}

// ─── Helper de campo ─────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || '-'}</p>
    </div>
  );
}

// ─── Tab: Datos Personales ────────────────────────────────────────────────────

function PersonalDataView({ employee }: { employee: NonNullable<EmployeeDetailData> }) {
  return (
    <div className="space-y-6">
      {/* Foto del empleado */}
      {employee.picture && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Foto del empleado</p>
          <img
            src={employee.picture}
            alt="Foto del empleado"
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Field label="Nombre" value={employee.firstname} />
        <Field label="Apellido" value={employee.lastname} />
        <Field label="Nacionalidad" value={employee.nationality} />
        <Field
          label="Fecha de nacimiento"
          value={employee.born_date ? moment(employee.born_date).format('DD/MM/YYYY') : null}
        />
        <Field label="CUIL" value={employee.cuil} />
        <Field label="Tipo de documento" value={employee.document_type} />
        <Field label="Número de documento" value={employee.document_number} />
        <Field label="País de nacimiento" value={employee.countries?.name} />
        <Field label="Sexo" value={employee.gender} />
        <Field label="Estado civil" value={employee.marital_status} />
        <Field label="Nivel de instrucción" value={employee.level_of_education} />
      </div>
    </div>
  );
}

// ─── Tab: Datos de Contacto ───────────────────────────────────────────────────

function ContactDataView({ employee }: { employee: NonNullable<EmployeeDetailData> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Field label="Calle" value={employee.street} />
      <Field label="Altura" value={employee.street_number} />
      <Field label="Provincia" value={employee.provinces?.name} />
      <Field label="Ciudad" value={employee.cities?.name} />
      <Field label="Código postal" value={employee.postal_code} />
      <Field label="Teléfono" value={employee.phone} />
      <Field label="Email" value={employee.email} />
    </div>
  );
}

// ─── Tab: Datos Laborales ─────────────────────────────────────────────────────

function WorkDataView({ employee }: { employee: NonNullable<EmployeeDetailData> }) {
  const contractors = employee.contractor_employee
    .map((ce) => ce.customers)
    .filter((c): c is NonNullable<typeof c> => c != null);

  const aptitudes = employee.empleado_aptitudes
    .map((ea) => ea.aptitudes_tecnicas)
    .filter((a): a is NonNullable<typeof a> => a != null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Field label="Legajo" value={employee.file} />
        <Field label="Sector" value={employee.hierarchy?.name} />
        <Field label="Puesto" value={employee.company_positions?.name} />
        <Field label="Diagrama de trabajo" value={employee.work_diagram?.name} />
        <Field label="Horas normales" value={employee.normal_hours != null ? String(employee.normal_hours) : null} />
        <Field label="Tipo de contrato" value={employee.types_of_contract?.name} />
        <Field
          label="Fecha de ingreso"
          value={employee.date_of_admission ? moment(employee.date_of_admission).format('DD/MM/YYYY') : null}
        />
        <Field label="Gremio" value={employee.guild?.name} />
        <Field label="Convenio" value={employee.covenant?.name} />
        <Field label="Categoría" value={employee.category?.name} />
        <Field label="Centro de costo" value={employee.cost_center?.name} />
        <Field label="Tipo de costo" value={employee.cost_type} />
        <Field
          label="Sectores de taller"
          value={
            employee.employee_workshop_sectors
              ?.map((ews) => ews.workshop_sectors?.name)
              .filter(Boolean)
              .join(', ') || undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contratistas asignados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asignado a contratistas</CardTitle>
          </CardHeader>
          <CardContent>
            {contractors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contractors.map((contractor) => (
                  <Badge key={contractor.id} variant="secondary">
                    {contractor.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin asignar</p>
            )}
          </CardContent>
        </Card>

        {/* Aptitudes técnicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aptitudes Técnicas</CardTitle>
          </CardHeader>
          <CardContent>
            {aptitudes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aptitudes.map((aptitud) => (
                  <Badge key={aptitud.id} variant="secondary">
                    {aptitud.nombre}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin aptitudes</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function EmployeeViewDisplay({ employee, activeTab }: EmployeeViewDisplayProps) {
  if (activeTab === 'personalData') {
    return <PersonalDataView employee={employee} />;
  }

  if (activeTab === 'contactData') {
    return <ContactDataView employee={employee} />;
  }

  if (activeTab === 'workData') {
    return <WorkDataView employee={employee} />;
  }

  return null;
}
