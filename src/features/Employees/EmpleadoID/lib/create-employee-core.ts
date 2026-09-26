import type {
  cost_type_enum,
  document_type_enum,
  gender_enum,
  level_of_education_enum,
  marital_status_enum,
  nationality_enum,
  Prisma,
} from '@/generated/prisma/client';
import { callVoid } from '@/shared/lib/sql';
import type { EmployeeFormData } from '../schemas/employee-schema';

/**
 * Crea un empleado con sus relaciones M:M y dispara el recalculo de documentos.
 *
 * Vive fuera de `actions.server.ts` (que es un modulo `'use server'`) porque recibe el
 * cliente transaccional de Prisma: los argumentos de una server action deben ser
 * serializables, y `tx` no lo es.
 *
 * La comparten dos flujos: el alta normal de empleado (`createEmployee`) y la conversion
 * de un candidato en legajo (`approvePreEmployee`, ticket 505). Asi ambos caminos crean
 * al empleado exactamente igual.
 */
export async function createEmployeeCore(
  tx: Prisma.TransactionClient,
  data: EmployeeFormData,
  companyId: string
): Promise<{ id: string }> {
  const { allocated_to, aptitudes, workshop_sector_ids, province, city, date_of_admission, ...scalarData } = data;

  // Crear el empleado principal
  const created = await tx.employees.create({
    data: {
      ...scalarData,
      company_id: companyId,
      province: BigInt(province),
      city: city != null ? BigInt(city) : null,
      // date_of_admission es requerido en BD (NOT NULL); el form lo tiene como optional
      // para el modo edit, pero en create siempre llega. Fallback a fecha actual.
      date_of_admission: date_of_admission ? new Date(date_of_admission) : new Date(),
      // Castings de enums: el formulario usa string, Prisma espera los tipos de enum
      nationality: scalarData.nationality as nationality_enum,
      document_type: scalarData.document_type as document_type_enum,
      gender: scalarData.gender as gender_enum,
      marital_status: scalarData.marital_status as marital_status_enum,
      level_of_education: scalarData.level_of_education as level_of_education_enum,
      cost_type: scalarData.cost_type ? (scalarData.cost_type as cost_type_enum) : undefined,
      // allocated_to es un array denormalizado en BD; se mantiene en sincronía
      // con la tabla pivot contractor_employee que es la fuente de verdad para M:M
      allocated_to: allocated_to ?? [],
    },
    select: { id: true },
  });

  // M:M — afectaciones a contratistas
  if (allocated_to && allocated_to.length > 0) {
    await tx.contractor_employee.createMany({
      data: allocated_to.map((contractorId) => ({
        employee_id: created.id,
        contractor_id: contractorId,
      })),
      skipDuplicates: true,
    });
  }

  // M:M — aptitudes técnicas
  if (aptitudes && aptitudes.length > 0) {
    await tx.empleado_aptitudes.createMany({
      data: aptitudes.map((aptitudId) => ({
        empleado_id: created.id,
        aptitud_id: aptitudId,
      })),
      skipDuplicates: true,
    });
  }

  // M:M — sectores de taller asignados
  if (workshop_sector_ids && workshop_sector_ids.length > 0) {
    await tx.employee_workshop_sectors.createMany({
      data: workshop_sector_ids.map((sectorId) => ({
        employee_id: created.id,
        workshop_sector_id: sectorId,
      })),
      skipDuplicates: true,
    });
  }

  // 358 / M:M: generar los documentos requeridos con el estado FINAL. Los contratistas/aptitudes
  // se insertan DESPUES del INSERT escalar, por lo que el trigger AFTER INSERT los ve vacios.
  // Este recalculo explicito usa el estado ya completo (función void → callVoid / $executeRaw).
  await callVoid('controlar_alertas_documentos_single_employee', [{ uuid: created.id }, { uuid: companyId }], tx);

  return created;
}
