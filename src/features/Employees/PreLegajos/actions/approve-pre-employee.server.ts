'use server';

import { checkPermissionServer } from '@/features/Permissions/actionsServer';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { getCachedSession } from '@/shared/lib/session';
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createEmployeeCore } from '../../EmpleadoID/lib/create-employee-core';
import { employeeFormSchema, type EmployeeWorkDataValues } from '../../EmpleadoID/schemas/employee-schema';
import { assertTransition } from '../lib/state-machine';

const logger = new Logger('features/PreLegajos/approve');

export interface ApprovePreEmployeeResult {
  employeeId: string;
  /** Documentos del checklist que se incorporaron al legajo. */
  transferredDocuments: number;
  /** Documentos que el empleado final no requiere: quedan solo en el historial del pre legajo. */
  skippedDocuments: number;
}

/**
 * Convierte un pre legajo en un legajo de empleado (ticket 505).
 *
 * Los datos personales y de contacto salen del pre legajo; los laborales, del formulario
 * de aprobacion (legajo definitivo, diagrama, convenio, etc.). El empleado se crea con
 * `createEmployeeCore`, el mismo camino que el alta normal, asi que el motor de alertas
 * genera sus documentos requeridos igual que siempre.
 *
 * Los documentos ya cargados en el pre legajo se transfieren a las alertas que
 * correspondan. Si el empleado final NO requiere alguno (sus `conditions` no aplican a la
 * funcion asignada), NO se fuerza dentro del legajo: queda en el historial del pre legajo.
 */
export async function approvePreEmployee(
  preEmployeeId: string,
  workData: EmployeeWorkDataValues
): Promise<ApprovePreEmployeeResult> {
  logger.debug('Aprobando pre legajo', { data: { preEmployeeId } });

  const hasPermission = await checkPermissionServer('empleados', 'pre-legajos', 'approve');
  if (!hasPermission) throw new Error('No tenés permiso para aprobar pre legajos');

  const [profile, session] = await Promise.all([requireServerAuthProfile(), getCachedSession()]);
  const companyId = session?.user?.app_metadata?.company as string | undefined;
  if (!companyId) throw new Error('No se encontró la empresa activa del usuario');

  const preEmployee = await prisma.pre_employees.findUniqueOrThrow({
    where: { id: preEmployeeId },
    include: {
      documents_pre_employees: {
        select: { id: true, document_type_id: true, document_path: true, validity: true, user_id: true },
      },
    },
  });

  // Valida contra la maquina de estados: solo se aprueba desde "pre ingreso"
  assertTransition(preEmployee.status, 'approve');

  // Los datos personales y de contacto del pre legajo + los laborales del formulario de
  // aprobacion tienen que formar un legajo valido. Si falta algo, Zod lo dice con precision.
  const employeeData = employeeFormSchema.parse({
    firstname: preEmployee.firstname,
    lastname: preEmployee.lastname,
    nationality: preEmployee.nationality ?? '',
    born_date: preEmployee.born_date ?? '',
    cuil: preEmployee.cuil,
    document_type: preEmployee.document_type ?? '',
    document_number: preEmployee.document_number,
    birthplace: preEmployee.birthplace,
    gender: preEmployee.gender ?? '',
    marital_status: preEmployee.marital_status ?? '',
    level_of_education: preEmployee.level_of_education ?? '',
    picture: preEmployee.picture ?? undefined,
    street: preEmployee.street,
    street_number: preEmployee.street_number,
    province: Number(preEmployee.province),
    city: preEmployee.city != null ? Number(preEmployee.city) : undefined,
    postal_code: preEmployee.postal_code ?? '',
    phone: preEmployee.phone,
    email: preEmployee.email ?? '',
    ...workData,
  });

  // Revalidacion de duplicados: pudo pasar tiempo desde que se cargo el pre legajo y
  // `employees.cuil` / `employees.document_number` son unique.
  const existingEmployee = await prisma.employees.findFirst({
    where: { OR: [{ cuil: employeeData.cuil }, { document_number: employeeData.document_number }] },
    select: { id: true, file: true, firstname: true, lastname: true },
  });

  if (existingEmployee) {
    throw new Error(
      `Ya existe un empleado con ese DNI o CUIL: ${existingEmployee.lastname} ${existingEmployee.firstname} (legajo ${existingEmployee.file})`
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock optimista: si otro usuario lo aprobo o lo rechazo mientras tanto, no afecta filas
      const claimed = await tx.pre_employees.updateMany({
        where: { id: preEmployeeId, status: 'pre_ingreso', employee_id: null },
        data: { status: 'legajo' },
      });

      if (claimed.count === 0) {
        throw new Error('El pre legajo ya fue procesado por otro usuario');
      }

      // Mismo camino que el alta normal de empleado: crea escalares + M:M y recalcula
      // los documentos que le corresponden segun sus conditions
      const employee = await createEmployeeCore(tx, employeeData, companyId);

      // Transferencia de los documentos ya cargados en el pre legajo
      let transferredDocuments = 0;
      let skippedDocuments = 0;

      for (const document of preEmployee.documents_pre_employees) {
        const updated = await tx.documents_employees.updateMany({
          where: { applies: employee.id, id_document_types: document.document_type_id },
          data: {
            document_path: document.document_path,
            state: 'presentado',
            validity: document.validity,
            user_id: document.user_id,
            archived_at: null,
          },
        });

        if (updated.count > 0) {
          transferredDocuments += 1;
        } else {
          // El empleado final no requiere este tipo: no se fuerza dentro del legajo.
          // El archivo sigue accesible desde el historial del pre legajo.
          skippedDocuments += 1;
        }
      }

      await tx.pre_employees.update({
        where: { id: preEmployeeId },
        data: {
          employee_id: employee.id,
          reviewed_by: profile.id,
          reviewed_at: new Date(),
          rejection_reason: null,
        },
      });

      return { employeeId: employee.id, transferredDocuments, skippedDocuments };
    });

    logger.info('Pre legajo convertido en legajo', { data: { preEmployeeId, ...result } });

    revalidatePath('/dashboard/employee');
    revalidatePath('/dashboard/employee/pre-legajo');

    return result;
  } catch (error) {
    logger.error('Error al aprobar el pre legajo', { data: { error, preEmployeeId } });
    throw error;
  }
}
