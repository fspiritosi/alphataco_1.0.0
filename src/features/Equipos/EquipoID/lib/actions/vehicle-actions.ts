'use server';

import { Prisma } from '@/generated/prisma/client';
import { condition_enum } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getSessionUserId } from '@/shared/lib/session';
import { callVoid } from '@/shared/lib/sql';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { revalidatePath } from 'next/cache';
import { fromDateOnly, toDateOnly } from '@/shared/lib/date-only';
import { pickDuplicateRaceWinner, raceWindowStart } from '../duplicate-domain';
import { buildVehicleStatusUpdate, canChangeConditionFromHeader } from '../vehicle-status';
import { vehicleInputSchema, type ParsedVehicleInput, type VehicleInput } from '../../schemas/vehicle';

const logger = new Logger('features/Equipos/vehicle-actions');

/** Id de "Vehículos" en `types_of_vehicles`: los vehículos nacen "en preparación". */
const VEHICLES_TYPE_OF_VEHICLE_NAME = 'Vehículos';

type VehicleClient = Prisma.TransactionClient | typeof prisma;

async function requireActor(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Sesión requerida');
  return userId;
}

// ────────────────────────────────────────────────────────────────────────────
// Lectura
// ────────────────────────────────────────────────────────────────────────────

const vehicleDetailSelect = {
  id: true,
  created_at: true,
  picture: true,
  type_of_vehicle: true,
  domain: true,
  chassis: true,
  engine: true,
  serie: true,
  intern_number: true,
  year: true,
  brand: true,
  model: true,
  is_active: true,
  termination_date: true,
  reason_for_termination: true,
  user_id: true,
  company_id: true,
  type: true,
  status: true,
  allocated_to: true,
  condition: true,
  kilometer: true,
  cost_center_id: true,
  type_operative_id: true,
  subType: true,
  owner_id: true,
  type_of_contract: true,
  contract_expiration_date: true,
  contract_start_date: true,
  contract_number: true,
  has_certification: true,
  certification_expiration_date: true,
  certification_number: true,
  currency: true,
  price: true,
  cost_type: true,
  sector: true,
  engine_hours: true,
  tire_template_id: true,
  brand_vehicles: { select: { id: true, name: true } },
  model_vehicles: { select: { id: true, name: true } },
  types_of_vehicles: { select: { id: true, name: true } },
  type_vehicles_typeTotype: {
    select: {
      id: true,
      name: true,
      is_active: true,
      company_id: true,
      has_hitch: true,
      is_tractor_unit: true,
      applies_to: true,
      generates_qr: true,
      is_operative: true,
    },
  },
  sub_type: { select: { id: true, name: true, tire_template_id: true } },
  equipment_owners: { select: { id: true, name: true } },
  contractor_equipment: { select: { customers: { select: { id: true, name: true } } } },
} satisfies Prisma.vehiclesSelect;

/**
 * Ficha del vehículo con la forma que leen el formulario y el header (misma que devolvía
 * PostgREST: `type`, `types_of_vehicles`, `brand_vehicles`, ...). Perímetro sin RLS: sólo si
 * pertenece a la empresa activa. Los `bigint`/`Decimal`/`@db.Date` se convierten para que el
 * resultado sea serializable hacia el cliente.
 */
export async function getVehicleById(id: string) {
  const companyId = await getActiveCompanyId();

  const vehicle = await prisma.vehicles.findFirst({
    where: withCompany({ id }, companyId),
    select: vehicleDetailSelect,
  });

  if (!vehicle) {
    logger.error('Vehículo no encontrado en la empresa activa', { data: { id } });
    throw new Error('Failed to fetch vehicle');
  }

  const { type_vehicles_typeTotype, types_of_vehicles, ...rest } = vehicle;

  return {
    ...rest,
    type_of_vehicle: Number(vehicle.type_of_vehicle),
    price: vehicle.price === null ? null : Number(vehicle.price),
    created_at: vehicle.created_at.toISOString(),
    termination_date: toDateOnly(vehicle.termination_date),
    contract_expiration_date: toDateOnly(vehicle.contract_expiration_date),
    contract_start_date: toDateOnly(vehicle.contract_start_date),
    certification_expiration_date: toDateOnly(vehicle.certification_expiration_date),
    type: type_vehicles_typeTotype,
    types_of_vehicles: { id: Number(types_of_vehicles.id), name: types_of_vehicles.name },
    // Ids de contratistas para el MultiSelect del formulario
    allocated_to: vehicle.contractor_equipment.map((ce) => ce.customers?.id).filter((v): v is string => !!v),
  };
}

export type VehicleDetail = Awaited<ReturnType<typeof getVehicleById>>;

/**
 * `true` si ya existe un vehículo con ese dominio (índice único global de `vehicles.domain`).
 * Se acota a la empresa activa: un dominio ajeno igual falla al crear (P2002) con el mismo mensaje.
 */
export async function isVehicleDomainTaken(domain: string, excludeId?: string): Promise<boolean> {
  const value = domain.trim().toUpperCase();
  if (!value) return false;
  const companyId = await getActiveCompanyId();
  const existing = await prisma.vehicles.findFirst({
    where: withCompany({ domain: value, ...(excludeId ? { id: { not: excludeId } } : {}) }, companyId),
    select: { id: true },
  });
  return existing !== null;
}

// ────────────────────────────────────────────────────────────────────────────
// Alta / baja
// ────────────────────────────────────────────────────────────────────────────

/**
 * Baja (con motivo y fecha) o reintegro de un vehículo de la empresa activa.
 * `updateMany` acotado por `company_id`: si no afecta filas, el equipo no es de la empresa.
 */
export async function toggleVehicleStatus(
  id: string,
  activate: boolean,
  condition: string,
  reason_for_termination?: string,
  termination_date?: Date | string
) {
  const [companyId, actor] = await Promise.all([getActiveCompanyId(), requireActor()]);
  const data = activate
    ? buildVehicleStatusUpdate({ activate: true, condition })
    : buildVehicleStatusUpdate({ activate: false, condition, reason: reason_for_termination, terminationDate: termination_date });

  try {
    await withActor(actor, async (tx) => {
      const result = await tx.vehicles.updateMany({ where: withCompany({ id }, companyId), data });
      if (result.count === 0) throw new Error('El vehículo no pertenece a la empresa activa');
    });
  } catch (error) {
    logger.error('Error toggling vehicle status', { data: { error, id, activate } });
    throw error instanceof Error ? error : new Error('Failed to toggle vehicle status');
  }

  revalidatePath('/dashboard/equipment');
  return { id, is_active: data.is_active };
}

/**
 * Resuelve la carrera entre dos altas simultaneas del mismo vehiculo (doble click,
 * reintento del navegador). La validacion de dominio vive en el resolver del formulario y
 * es async, asi que dos requests en paralelo la pasan las dos.
 *
 * Si aparecio otro vehiculo activo con el mismo dominio dentro de la ventana de duplicados,
 * el registro mas nuevo se elimina a si mismo (regla pura en `lib/duplicate-domain.ts`).
 * Solo mira altas recientes: los dominios repetidos que ya existian en la base no se tocan.
 */
async function discardVehicleIfDuplicateRace(
  client: VehicleClient,
  companyId: string,
  created: { id: string; created_at: Date; domain: string | null }
): Promise<boolean> {
  if (!created.domain) return false;

  const siblings = await client.vehicles.findMany({
    where: withCompany(
      { domain: created.domain, is_active: true, created_at: { gte: raceWindowStart(created.created_at) } },
      companyId
    ),
    select: { id: true, created_at: true },
  });

  const winner = pickDuplicateRaceWinner(siblings);
  if (!winner || winner.id === created.id) return false;

  try {
    await client.vehicles.delete({ where: { id: created.id } });
  } catch (error) {
    logger.error('No se pudo descartar el vehiculo duplicado por request simultanea', {
      data: { id: created.id, error },
    });
    throw new Error('Se creo un equipo duplicado y no se pudo revertir. Revisa el listado antes de reintentar.');
  }

  logger.warn('Vehiculo duplicado descartado por request simultanea', {
    data: { descartado: created.id, conservado: winner.id, domain: created.domain },
  });
  return true;
}

/** Columnas escalares que escribe el formulario (sin `allocated_to`, `condition` ni `company_id`). */
type VehicleScalarData = Omit<
  Prisma.vehiclesUncheckedCreateInput,
  'id' | 'created_at' | 'company_id' | 'user_id' | 'allocated_to' | 'condition' | 'is_active' | 'status'
>;

/** Columnas escalares de `vehicles` a partir del payload validado. */
function toVehicleScalarData(input: ParsedVehicleInput): VehicleScalarData {
  if (!input.type) throw new Error('El tipo es requerido');
  const hasCertification = input.has_certification === true;
  const certificationNumber = input.certification_number?.trim() ?? '';
  return {
    type_of_vehicle: BigInt(input.type_of_vehicle),
    brand: Number(input.brand),
    model: input.model === null || input.model === undefined ? null : Number(input.model),
    owner_id: input.owner_id ?? null,
    year: input.year,
    type_of_contract: input.type_of_contract ?? null,
    engine: input.engine ?? '',
    type: input.type,
    subType: input.subType ?? null,
    chassis: input.chassis ?? null,
    serie: input.serie ?? null,
    domain: input.domain ? input.domain.toUpperCase() : null,
    kilometer: input.kilometer ?? null,
    engine_hours: input.engine_hours ?? null,
    intern_number: input.intern_number ?? null,
    picture: input.picture ?? null,
    contract_expiration_date: fromDateOnly(input.contract_expiration_date),
    contract_start_date: fromDateOnly(input.contract_start_date),
    contract_number: input.contract_number ?? null,
    // Ticket 727: sin certificación no se guardan los datos dependientes (límite contra la BD)
    has_certification: hasCertification,
    certification_expiration_date: hasCertification ? fromDateOnly(input.certification_expiration_date) : null,
    certification_number: hasCertification && certificationNumber ? certificationNumber : null,
    cost_center_id: input.cost_center_id ?? null,
    cost_type: input.cost_type,
    sector: input.sector ?? null,
    price: input.price ?? null,
    currency: input.currency ?? null,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Alta de vehículo en la empresa activa. Transacción con `withActor` (`vehicles.user_id`
 * tiene `DEFAULT app_current_user_id()`); afectaciones a contratistas por diff explícito y
 * recálculo de documentos requeridos al final.
 */
export async function createVehicle(vehicleData: VehicleInput) {
  const input = vehicleInputSchema.parse(vehicleData);
  const [companyId, actor] = await Promise.all([getActiveCompanyId(), requireActor()]);

  // Sólo los "Vehículos" (no "Otros") nacen en "en preparacion"
  const typeOfVehicle = await prisma.types_of_vehicles.findUnique({
    where: { id: BigInt(input.type_of_vehicle) },
    select: { name: true },
  });
  const condition = typeOfVehicle?.name === VEHICLES_TYPE_OF_VEHICLE_NAME ? condition_enum.en_preparacion : undefined;

  let created: { id: string; created_at: Date; domain: string | null };
  try {
    created = await withActor(actor, async (tx) => {
      const vehicle = await tx.vehicles.create({
        data: {
          ...toVehicleScalarData(input),
          company_id: companyId,
          condition,
          // El trigger add_contractor_equipment_after_insert copiaría allocated_to a la pivot:
          // las afectaciones se manejan explícitamente abajo.
          allocated_to: [],
        },
        select: { id: true, created_at: true, domain: true },
      });

      // Si otra request simultanea inserto el mismo equipo, descartar el sobrante antes de
      // asociar contratistas (asi no queda basura en la tabla pivot).
      const wasRaced = await discardVehicleIfDuplicateRace(tx, companyId, vehicle);
      if (wasRaced) {
        throw new Error(`El equipo con el dominio ${vehicle.domain} ya fue creado. No se generó un duplicado.`);
      }

      if (input.allocated_to && input.allocated_to.length > 0) {
        await updateContractorRelationships(tx, vehicle.id, input.allocated_to, companyId);
      }

      await callVoid('controlar_alertas_documentos_single_vehicle', [{ uuid: vehicle.id }, { uuid: companyId }], tx);
      return vehicle;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(`El equipo con el dominio ${input.domain ?? ''} ya fue creado. No se generó un duplicado.`);
    }
    logger.error('Error creating vehicle', { data: { error } });
    throw error instanceof Error ? error : new Error('Failed to create vehicle');
  }

  revalidatePath('/dashboard/equipment');
  return { id: created.id, domain: created.domain };
}

/**
 * Edición de un vehículo de la empresa activa (`update` con `where { id, company_id }`).
 * 358 / M:M: al final re-evalúa los documentos requeridos con el estado FINAL (incluye las
 * afectaciones, que se actualizan después del update).
 */
export async function updateVehicle(id: string, vehicleData: VehicleInput) {
  const input = vehicleInputSchema.parse(vehicleData);
  const [companyId, actor] = await Promise.all([getActiveCompanyId(), requireActor()]);

  try {
    await withActor(actor, async (tx) => {
      const result = await tx.vehicles.updateMany({
        where: withCompany({ id }, companyId),
        data: toVehicleScalarData(input),
      });
      if (result.count === 0) throw new Error('El vehículo no pertenece a la empresa activa');

      if (input.allocated_to !== undefined) {
        await updateContractorRelationships(tx, id, input.allocated_to, companyId);
      }

      await callVoid('controlar_alertas_documentos_single_vehicle', [{ uuid: id }, { uuid: companyId }], tx);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(`El dominio ${input.domain ?? ''} ya pertenece a otro equipo.`);
    }
    logger.error('Error updating vehicle', { data: { error, id } });
    throw error instanceof Error ? error : new Error('Failed to update vehicle');
  }

  revalidatePath('/dashboard/equipment');
  return { id };
}

/**
 * Afectaciones a contratistas con diff explícito (sólo se tocan las que cambian). Los ids
 * se filtran a clientes de la empresa activa: un id ajeno se ignora.
 */
async function updateContractorRelationships(
  client: VehicleClient,
  vehicleId: string,
  newContractorIds: string[],
  companyId: string
) {
  const owned = await client.customers.findMany({
    where: withCompany({ id: { in: newContractorIds } }, companyId),
    select: { id: true },
  });
  const wanted = new Set(owned.map((c) => c.id));

  const current = await client.contractor_equipment.findMany({
    where: { equipment_id: vehicleId },
    select: { contractor_id: true },
  });
  const currentIds = new Set(current.map((r) => r.contractor_id).filter((v): v is string => !!v));

  const toAdd = [...wanted].filter((cid) => !currentIds.has(cid));
  const toRemove = [...currentIds].filter((cid) => !wanted.has(cid));

  if (toRemove.length > 0) {
    await client.contractor_equipment.deleteMany({
      where: { equipment_id: vehicleId, contractor_id: { in: toRemove } },
    });
  }
  if (toAdd.length > 0) {
    await client.contractor_equipment.createMany({
      data: toAdd.map((contractorId) => ({ equipment_id: vehicleId, contractor_id: contractorId })),
      skipDuplicates: true,
    });
  }
}

/**
 * Cambia la condición de un vehículo (`vehicles`) o equipamiento (`other_equipment`) desde el
 * header de la ficha. Sólo admite las transiciones de `HEADER_CONDITION_TRANSITIONS`
 * ("en preparación" → "operativo"); el resto las administra Mantenimiento.
 */
export async function updateEquipmentCondition(
  equipmentId: string,
  newCondition: condition_enum,
  table: 'vehicles' | 'other_equipment' = 'vehicles'
) {
  logger.info('Actualizando condición de equipo', { data: { equipmentId, newCondition, table } });
  const companyId = await getActiveCompanyId();

  try {
    const current =
      table === 'vehicles'
        ? await prisma.vehicles.findFirst({ where: withCompany({ id: equipmentId }, companyId), select: { condition: true } })
        : await prisma.other_equipment.findFirst({
            where: withCompany({ id: equipmentId }, companyId),
            select: { condition: true },
          });

    if (!current) throw new Error('El equipo no pertenece a la empresa activa');
    if (!canChangeConditionFromHeader(current.condition, newCondition)) {
      throw new Error('Transición de condición no permitida desde la ficha');
    }

    if (table === 'vehicles') {
      await prisma.vehicles.updateMany({ where: withCompany({ id: equipmentId }, companyId), data: { condition: newCondition } });
    } else {
      await prisma.other_equipment.updateMany({
        where: withCompany({ id: equipmentId }, companyId),
        data: { condition: newCondition },
      });
    }

    revalidatePath('/dashboard/equipment');
    return { success: true };
  } catch (error) {
    logger.error('Error al actualizar condición de equipo', { data: { error, equipmentId, newCondition, table } });
    throw error;
  }
}
