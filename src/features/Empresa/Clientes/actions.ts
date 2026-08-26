'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { cookies } from 'next/headers';

const logger = new Logger('features/Empresa/Clientes/assignments');

/**
 * Cambios explicitos sobre una afectacion M:M cliente <-> recurso.
 *
 * IMPORTANTE: estas acciones NUNCA infieren bajas por ausencia. Se borra unicamente
 * lo que viene listado en `remove` y se inserta unicamente lo que viene en `add`.
 * Enviar un conjunto "final" y dejar que el servidor calcule la diferencia fue la causa
 * del incidente de Vista Oil: una preseleccion vacia en el modal borro las afectaciones
 * de todos los demas recursos del cliente.
 */
export interface AssignmentChanges {
  add: string[];
  remove: string[];
}

export type AssignmentUpdateResult =
  | { success: true; added: number; removed: number }
  | { success: false; error: string };

/** Normaliza una lista de ids: descarta vacios/nulos y deduplica. */
function normalizeIds(ids: string[] | undefined | null): string[] {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean)));
}

async function getActualCompanyId(): Promise<string> {
  const cookiesStore = await cookies();
  const companyId = cookiesStore.get('actualComp')?.value;
  if (!companyId) throw new Error('No hay una empresa seleccionada');
  return companyId;
}

/** Valida que el cliente exista y pertenezca a la empresa activa. */
async function assertCustomerBelongsToCompany(customerId: string, companyId: string): Promise<void> {
  const customer = await prisma.customers.findFirst({
    where: { id: customerId, company_id: companyId },
    select: { id: true },
  });
  if (!customer) throw new Error('Cliente no encontrado');
}

/**
 * Afectaciones vigentes de empleados para un cliente.
 *
 * Es la fuente de verdad para la preseleccion del modal: se consulta directo contra la
 * tabla pivote, sin depender del estado de la pantalla (que puede estar todavia cargando).
 */
export async function getCustomerEmployeeAssignments(customerId: string): Promise<string[]> {
  try {
    const rows = await prisma.contractor_employee.findMany({
      where: { contractor_id: customerId },
      select: { employee_id: true },
    });
    return rows.map((row) => row.employee_id).filter((id): id is string => Boolean(id));
  } catch (error) {
    logger.error('Error al obtener las afectaciones de empleados del cliente', { data: { error, customerId } });
    throw error;
  }
}

/** Afectaciones vigentes de equipos para un cliente. */
export async function getCustomerEquipmentAssignments(customerId: string): Promise<string[]> {
  try {
    const rows = await prisma.contractor_equipment.findMany({
      where: { contractor_id: customerId },
      select: { equipment_id: true },
    });
    return rows.map((row) => row.equipment_id).filter((id): id is string => Boolean(id));
  } catch (error) {
    logger.error('Error al obtener las afectaciones de equipos del cliente', { data: { error, customerId } });
    throw error;
  }
}

/**
 * Aplica altas y bajas puntuales de empleados sobre un cliente.
 * Solo se borran los `remove` y solo se insertan los `add`; el resto queda intacto.
 */
export async function updateCustomerEmployeeAssignments(
  customerId: string,
  changes: AssignmentChanges
): Promise<AssignmentUpdateResult> {
  try {
    const toAdd = normalizeIds(changes?.add);
    const addSet = new Set(toAdd);
    // Un mismo id no puede pedirse de alta y de baja a la vez: prevalece el alta.
    const toRemove = normalizeIds(changes?.remove).filter((id) => !addSet.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return { success: true, added: 0, removed: 0 };
    }

    const companyId = await getActualCompanyId();
    await assertCustomerBelongsToCompany(customerId, companyId);

    const involvedIds = Array.from(new Set([...toAdd, ...toRemove]));
    const foundEmployees = await prisma.employees.findMany({
      where: { id: { in: involvedIds }, company_id: companyId },
      select: { id: true },
    });
    if (foundEmployees.length !== involvedIds.length) {
      throw new Error('Uno o más empleados no existen o no pertenecen a la empresa');
    }

    const { added, removed } = await prisma.$transaction(async (tx) => {
      let removedCount = 0;
      let addedCount = 0;

      if (toRemove.length > 0) {
        const result = await tx.contractor_employee.deleteMany({
          where: { contractor_id: customerId, employee_id: { in: toRemove } },
        });
        removedCount = result.count;
      }

      if (toAdd.length > 0) {
        const result = await tx.contractor_employee.createMany({
          data: toAdd.map((employeeId) => ({ contractor_id: customerId, employee_id: employeeId })),
          skipDuplicates: true,
        });
        addedCount = result.count;
      }

      return { added: addedCount, removed: removedCount };
    });

    logger.info('Afectaciones de empleados actualizadas', {
      data: { customerId, added, removed, requestedAdd: toAdd.length, requestedRemove: toRemove.length },
    });

    // 358 / M:M: re-verificar los documentos de los empleados afectados (altas Y bajas).
    // Sus documentos especiales pueden depender de la afectacion a cliente.
    if (involvedIds.length > 0) {
      await prisma.$executeRaw`
        SELECT controlar_alertas_documentos_single_employee(employee_id, ${companyId}::uuid)
        FROM unnest(${involvedIds}::uuid[]) AS employee_id`;
    }

    return { success: true, added, removed };
  } catch (error) {
    logger.error('Error al actualizar las afectaciones de empleados', { data: { error, customerId, changes } });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Aplica altas y bajas puntuales de equipos sobre un cliente.
 * Mismo criterio que empleados: solo se toca lo que viene explicitamente listado.
 */
export async function updateCustomerEquipmentAssignments(
  customerId: string,
  changes: AssignmentChanges
): Promise<AssignmentUpdateResult> {
  try {
    const toAdd = normalizeIds(changes?.add);
    const addSet = new Set(toAdd);
    const toRemove = normalizeIds(changes?.remove).filter((id) => !addSet.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return { success: true, added: 0, removed: 0 };
    }

    const companyId = await getActualCompanyId();
    await assertCustomerBelongsToCompany(customerId, companyId);

    const involvedIds = Array.from(new Set([...toAdd, ...toRemove]));
    const foundEquipments = await prisma.vehicles.findMany({
      where: { id: { in: involvedIds }, company_id: companyId },
      select: { id: true },
    });
    if (foundEquipments.length !== involvedIds.length) {
      throw new Error('Uno o más equipos no existen o no pertenecen a la empresa');
    }

    const { added, removed } = await prisma.$transaction(async (tx) => {
      let removedCount = 0;
      let addedCount = 0;

      if (toRemove.length > 0) {
        const result = await tx.contractor_equipment.deleteMany({
          where: { contractor_id: customerId, equipment_id: { in: toRemove } },
        });
        removedCount = result.count;
      }

      if (toAdd.length > 0) {
        const result = await tx.contractor_equipment.createMany({
          data: toAdd.map((equipmentId) => ({ contractor_id: customerId, equipment_id: equipmentId })),
          skipDuplicates: true,
        });
        addedCount = result.count;
      }

      return { added: addedCount, removed: removedCount };
    });

    logger.info('Afectaciones de equipos actualizadas', {
      data: { customerId, added, removed, requestedAdd: toAdd.length, requestedRemove: toRemove.length },
    });

    if (involvedIds.length > 0) {
      await prisma.$executeRaw`
        SELECT controlar_alertas_documentos_single_vehicle(equipment_id, ${companyId}::uuid)
        FROM unnest(${involvedIds}::uuid[]) AS equipment_id`;
    }

    return { success: true, added, removed };
  } catch (error) {
    logger.error('Error al actualizar las afectaciones de equipos', { data: { error, customerId, changes } });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
