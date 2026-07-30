'use server';

import { checkPermissionServer } from '@/features/Permissions/actionsServer';
import type {
  document_type_enum,
  gender_enum,
  level_of_education_enum,
  marital_status_enum,
  nationality_enum,
} from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { getCachedSession } from '@/shared/lib/cached-session';
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { assertTransition, type PreEmployeeStatus, type PreEmployeeTransitionAction } from '../lib/state-machine';
import { rejectPreEmployeeSchema, type PreEmployeeFormData } from '../schemas/pre-employee-schema';

const logger = new Logger('features/PreLegajos');

const PRE_LEGAJOS_ROUTE = '/dashboard/employee';
const PRE_LEGAJO_DETAIL_ROUTE = '/dashboard/employee/pre-legajo';

/** Devuelve la empresa activa del usuario. Nunca se toma del formulario. */
async function getActiveCompanyId(): Promise<string> {
  const session = await getCachedSession();
  const companyId = session?.user?.app_metadata?.company;

  if (!companyId) throw new Error('No se encontró la empresa activa del usuario');

  return companyId as string;
}

/** Convierte el payload del formulario al shape que espera Prisma. */
function toPrismaData(data: PreEmployeeFormData) {
  const { province, city, ...rest } = data;

  return {
    ...rest,
    province: BigInt(province),
    city: city != null ? BigInt(city) : null,
    // El formulario maneja los enums como string
    nationality: rest.nationality as nationality_enum,
    document_type: rest.document_type as document_type_enum,
    gender: rest.gender as gender_enum,
    marital_status: rest.marital_status as marital_status_enum,
    level_of_education: rest.level_of_education as level_of_education_enum,
    // Las FK opcionales nunca viajan como string vacío a una columna uuid
    proposed_hierarchical_position: rest.proposed_hierarchical_position || null,
    proposed_company_position: rest.proposed_company_position || null,
  };
}

// ─── Lecturas ─────────────────────────────────────────────────────────────────

/**
 * Obtiene un pre legajo por ID con las relaciones necesarias para el detalle.
 * Wrapped con React.cache() para deduplicar llamadas dentro del mismo request.
 */
export const getPreEmployeeByIdCached = cache(async (preEmployeeId: string) => {
  logger.debug('Obteniendo pre legajo por ID', { data: { preEmployeeId } });

  try {
    return await prisma.pre_employees.findUnique({
      where: { id: preEmployeeId },
      select: {
        id: true,
        pre_file_number: true,
        status: true,
        firstname: true,
        lastname: true,
        cuil: true,
        document_type: true,
        document_number: true,
        born_date: true,
        nationality: true,
        birthplace: true,
        gender: true,
        marital_status: true,
        level_of_education: true,
        picture: true,
        street: true,
        street_number: true,
        province: true,
        city: true,
        postal_code: true,
        phone: true,
        email: true,
        proposed_hierarchical_position: true,
        proposed_company_position: true,
        rejection_reason: true,
        reviewed_at: true,
        employee_id: true,
        created_at: true,
        hierarchy: { select: { id: true, name: true } },
        company_positions: { select: { id: true, name: true } },
        countries: { select: { id: true, name: true } },
        reviewed_by_profile: { select: { id: true, fullname: true } },
        created_by_profile: { select: { id: true, fullname: true } },
        employees: { select: { id: true, file: true } },
      },
    });
  } catch (error) {
    logger.error('Error al obtener el pre legajo', { data: { error, preEmployeeId } });
    throw error;
  }
});

export type PreEmployeeDetailData = NonNullable<Awaited<ReturnType<typeof getPreEmployeeByIdCached>>>;

/**
 * Verifica el DNI/CUIL antes de guardar.
 * - Contra `employees`: BLOQUEA (esas columnas son unique; al aprobar fallaría igual).
 * - Contra otros pre legajos: solo AVISA.
 */
export async function checkPreEmployeeIdentity(documentNumber: string, cuil: string, excludeId?: string) {
  logger.debug('Verificando identidad del pre legajo', { data: { documentNumber, cuil, excludeId } });

  try {
    const [employee, preEmployee] = await Promise.all([
      prisma.employees.findFirst({
        where: { OR: [{ document_number: documentNumber }, { cuil }] },
        select: { id: true, file: true, firstname: true, lastname: true, is_active: true },
      }),
      prisma.pre_employees.findFirst({
        where: {
          OR: [{ document_number: documentNumber }, { cuil }],
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true, pre_file_number: true, firstname: true, lastname: true, status: true },
      }),
    ]);

    return {
      blockingEmployee: employee,
      warningPreEmployee: preEmployee,
    };
  } catch (error) {
    logger.error('Error al verificar la identidad', { data: { error, documentNumber, cuil } });
    throw error;
  }
}

export type PreEmployeeIdentityCheck = Awaited<ReturnType<typeof checkPreEmployeeIdentity>>;

// ─── Mutaciones ───────────────────────────────────────────────────────────────

/** Crea un pre legajo. Los datos personales y de contacto llegan completos (ticket 505). */
export async function createPreEmployee(data: PreEmployeeFormData) {
  logger.debug('Creando pre legajo', { data: { pre_file_number: data.pre_file_number } });

  const [companyId, profile] = await Promise.all([getActiveCompanyId(), requireServerAuthProfile()]);

  const { blockingEmployee } = await checkPreEmployeeIdentity(data.document_number, data.cuil);
  if (blockingEmployee) {
    throw new Error(
      `Ya existe un empleado con ese DNI o CUIL: ${blockingEmployee.lastname} ${blockingEmployee.firstname} (legajo ${blockingEmployee.file})`
    );
  }

  try {
    const created = await prisma.pre_employees.create({
      data: {
        ...toPrismaData(data),
        company_id: companyId,
        created_by: profile.id,
      },
      select: { id: true },
    });

    logger.info('Pre legajo creado', { data: { preEmployeeId: created.id } });
    revalidatePath(PRE_LEGAJOS_ROUTE);
    return created;
  } catch (error) {
    logger.error('Error al crear el pre legajo', { data: { error } });
    throw error;
  }
}

/** Actualiza los datos de un pre legajo. Solo mientras es editable (en proceso / pre ingreso). */
export async function updatePreEmployee(preEmployeeId: string, data: PreEmployeeFormData) {
  logger.debug('Actualizando pre legajo', { data: { preEmployeeId } });

  const current = await prisma.pre_employees.findUniqueOrThrow({
    where: { id: preEmployeeId },
    select: { status: true },
  });

  if (current.status === 'legajo') {
    throw new Error('El pre legajo ya fue convertido en legajo y no se puede modificar');
  }

  if (current.status === 'rechazado') {
    throw new Error('El pre legajo está rechazado: hay que reabrirlo antes de poder editarlo');
  }

  const { blockingEmployee } = await checkPreEmployeeIdentity(data.document_number, data.cuil);
  if (blockingEmployee) {
    throw new Error(
      `Ya existe un empleado con ese DNI o CUIL: ${blockingEmployee.lastname} ${blockingEmployee.firstname} (legajo ${blockingEmployee.file})`
    );
  }

  try {
    const updated = await prisma.pre_employees.update({
      where: { id: preEmployeeId },
      data: toPrismaData(data),
      select: { id: true },
    });

    logger.info('Pre legajo actualizado', { data: { preEmployeeId } });
    revalidatePath(PRE_LEGAJOS_ROUTE);
    revalidatePath(PRE_LEGAJO_DETAIL_ROUTE);
    return updated;
  } catch (error) {
    logger.error('Error al actualizar el pre legajo', { data: { error, preEmployeeId } });
    throw error;
  }
}

/**
 * Aplica una transicion de estado validandola contra la maquina de estados y los permisos.
 * `approve` no pasa por aca: vive en approve-pre-employee.server.ts porque ademas
 * materializa el empleado.
 */
async function applyTransition(
  preEmployeeId: string,
  action: Exclude<PreEmployeeTransitionAction, 'approve'>,
  reason?: string
) {
  const current = await prisma.pre_employees.findUniqueOrThrow({
    where: { id: preEmployeeId },
    select: { status: true },
  });

  const transition = assertTransition(current.status, action);

  const hasPermission = await checkPermissionServer('empleados', 'pre-legajos', transition.requiredPermissionAction);
  if (!hasPermission) {
    throw new Error(`No tenés permiso para ${transition.label.toLowerCase()}`);
  }

  const profile = await requireServerAuthProfile();

  let rejectionReason: string | null = null;
  if (transition.requiresReason) {
    rejectionReason = rejectPreEmployeeSchema.parse({ rejection_reason: reason }).rejection_reason;
  }

  const updated = await prisma.pre_employees.update({
    where: { id: preEmployeeId },
    data: {
      status: transition.to,
      // El motivo se limpia al reabrir: solo se conserva el del rechazo vigente
      rejection_reason: transition.requiresReason ? rejectionReason : null,
      reviewed_by: transition.requiredPermissionAction === 'approve' ? profile.id : undefined,
      reviewed_at: transition.requiredPermissionAction === 'approve' ? new Date() : undefined,
    },
    select: { id: true, status: true },
  });

  logger.info('Transición aplicada al pre legajo', {
    data: { preEmployeeId, from: current.status, to: transition.to },
  });

  revalidatePath(PRE_LEGAJOS_ROUTE);
  revalidatePath(PRE_LEGAJO_DETAIL_ROUTE);
  return updated;
}

/** en proceso -> pre ingreso (documentacion lista, pasa a decision de gerencia). */
export async function submitPreEmployee(preEmployeeId: string) {
  return applyTransition(preEmployeeId, 'submit');
}

/** en proceso | pre ingreso -> rechazado. El motivo es obligatorio. */
export async function rejectPreEmployee(preEmployeeId: string, reason: string) {
  return applyTransition(preEmployeeId, 'reject', reason);
}

/** rechazado -> en proceso (para poder reingresar al postulante). */
export async function reopenPreEmployee(preEmployeeId: string) {
  return applyTransition(preEmployeeId, 'reopen');
}

/** Estados disponibles para la UI (labels de los filtros de la bandeja). */
export async function getPreEmployeeStatuses(): Promise<PreEmployeeStatus[]> {
  return ['en_proceso', 'pre_ingreso', 'rechazado', 'legajo'];
}
