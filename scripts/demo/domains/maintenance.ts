/**
 * Mantenimiento: talleres y sectores, tipos de reparacion, checklist diario con sus respuestas
 * y desvios, y el circuito completo solicitud -> orden de mantenimiento -> OT -> reparaciones.
 *
 * Los estados salen de la antiguedad: lo de los ultimos dias esta pendiente de aprobar o de
 * programar, lo de las ultimas semanas esta en taller o esperando validacion, lo mas viejo esta
 * cerrado. Al final, la condicion de cada equipo queda coherente con sus ordenes: los que tienen
 * una orden en taller figuran "en reparacion" y ninguno esta en reparacion sin orden. Por eso
 * este dominio corre ANTES que los partes diarios, que solo usan equipos operativos.
 *
 * Las preventivas se crean como en la app (`NuevoPedido/actions/orders.server.ts`): la solicitud
 * nace aprobada, la orden en `pending_scheduling` y sin items (el taller los carga despues).
 */
import type { Prisma } from '../../../src/generated/prisma/client.ts';
import { insertMany, type Ctx } from '../lib/ctx.ts';
import { demoId } from '../lib/ids.ts';
import { pick, sample, weighted } from '../lib/random.ts';
import { CHECKLIST_SECTIONS, REPAIRS, REPAIR_GROUPS, WORKSHOPS, type RepairDef } from '../data/maintenance.ts';
import { EQUIPMENT_TYPES } from '../data/catalog.ts';
import { customerId, EXTERNAL_CUSTOMERS } from '../data/customers.ts';
import type { DemoEmployee } from './employees.ts';
import type { DemoOtherEquipment, DemoVehicle } from './vehicles.ts';
import { isWorking, type DiagramGrid } from './diagrams.ts';
import { equipmentTypeId, NEUQUEN_CITY, NEUQUEN_PROVINCE } from './catalogs.ts';

const TEMPLATE_ID = demoId('checklist_template', 'diario');
const EXTERNAL_WORKSHOP = WORKSHOPS.find((w) => w.type === 'externo')!.key;
const INTERNAL_WORKSHOP = WORKSHOPS.find((w) => w.type === 'interno')!.key;

/** Donde se hace una reparacion: el taller externo (sin sector) o un sector del interno. */
function placeOf(repair: RepairDef): { workshop: string; sector: string | null } {
  return repair.external ? { workshop: EXTERNAL_WORKSHOP, sector: null } : { workshop: INTERNAL_WORKSHOP, sector: repair.sectors[0] };
}

function repairOf(key: string): RepairDef {
  return REPAIRS.find((r) => r.key === key)!;
}

async function seedWorkshopCatalogs(ctx: Ctx, employees: DemoEmployee[]): Promise<void> {
  const { tx, company } = ctx;
  for (const w of WORKSHOPS) {
    await tx.workshops.create({
      data: {
        id: demoId('workshop', w.key),
        name: w.name,
        address: w.address,
        city: BigInt(NEUQUEN_CITY),
        province: BigInt(NEUQUEN_PROVINCE),
        type: w.type,
        provider_name: w.provider?.name ?? null,
        provider_phone: w.provider?.phone ?? null,
        provider_email: w.provider?.email ?? null,
        company_id: company.id,
      },
    });
    await tx.workshop_sectors.createMany({
      data: w.sectors.map((s) => ({
        id: demoId('workshop_sector', s.key),
        name: s.name,
        workshop_id: demoId('workshop', w.key),
        max_capacity: s.capacity,
        company_id: company.id,
      })),
    });
  }
  await tx.types_of_repairs.createMany({
    data: REPAIRS.map((r) => ({
      id: demoId('repair', r.key),
      name: r.name,
      description: r.description,
      criticity: r.criticity,
      type_of_maintenance: r.kind,
      company_id: company.id,
      qr_close: r.kind === 'Preventivo',
      autorizable: r.criticity === 'Alta',
    })),
  });
  await tx.sector_repair_types.createMany({
    data: REPAIRS.flatMap((r) => r.sectors.map((s) => ({ workshop_sector_id: demoId('workshop_sector', s), repair_type_id: demoId('repair', r.key) }))),
  });
  await tx.maintenance_request_groups.createMany({
    data: REPAIR_GROUPS.map((g) => ({ id: demoId('repair_group', g.key), name: g.name, description: g.description, company_id: company.id })),
  });
  await tx.maintenance_group_type_of_repairs.createMany({
    data: REPAIR_GROUPS.flatMap((g) => g.repairs.map((r) => ({ group_id: demoId('repair_group', g.key), type_id: demoId('repair', r) }))),
  });

  const sectorFor: Record<string, string[]> = {
    mecanico: ['pesada', 'liviana', 'lubricacion'],
    electricista: ['electricidad'],
    gomero: ['gomeria'],
    jefe_taller: ['pesada', 'liviana', 'electricidad', 'gomeria', 'lubricacion'],
  };
  await tx.employee_workshop_sectors.createMany({
    data: employees
      .filter((e) => e.active && sectorFor[e.position])
      .flatMap((e, i) =>
        (e.position === 'mecanico' ? [sectorFor.mecanico[i % 3]] : sectorFor[e.position]).map((s) => ({
          employee_id: e.id,
          workshop_sector_id: demoId('workshop_sector', s),
        }))
      ),
  });
}

/** Respuestas B/M: la app agrega sola la opcion "No aplica" (`NA`) a los selects. */
const CHECKLIST_OPTIONS = ['B', 'M'];

async function seedChecklistTemplate(ctx: Ctx): Promise<void> {
  const { tx, company } = ctx;
  await tx.checklist_sections.createMany({
    data: CHECKLIST_SECTIONS.map((s) => ({ id: demoId('checklist_section', s.code), code: s.code, name: s.name })),
  });
  await tx.checklist_items.createMany({
    data: CHECKLIST_SECTIONS.flatMap((s) =>
      s.items.map((item, i) => ({
        id: demoId('checklist_item', `${s.code}:${item.code}`),
        section_id: demoId('checklist_section', s.code),
        code: item.code,
        label: item.label,
        input_type: 'select',
        options: CHECKLIST_OPTIONS,
        is_critical: item.critical ?? false,
        order_index: i,
      }))
    ),
  });
  await tx.checklist_templates.create({
    data: {
      id: TEMPLATE_ID,
      company_id: company.id,
      code: 'CHK-DIARIO',
      name: 'Checklist diario de vehículo',
      description: 'Control pre-uso que completa el chofer antes de salir de base',
    },
  });
  await tx.checklist_template_sections.createMany({
    data: CHECKLIST_SECTIONS.map((s, i) => ({
      id: demoId('checklist_tsection', s.code),
      template_id: TEMPLATE_ID,
      section_id: demoId('checklist_section', s.code),
      code: s.code,
      name: s.name,
      order_index: i,
    })),
  });
  await tx.checklist_template_items.createMany({
    data: CHECKLIST_SECTIONS.flatMap((s) =>
      s.items.map((item, i) => ({
        template_id: TEMPLATE_ID,
        section_id: demoId('checklist_tsection', s.code),
        item_id: demoId('checklist_item', `${s.code}:${item.code}`),
        code: item.code,
        label: item.label,
        input_type: 'select',
        options: CHECKLIST_OPTIONS,
        is_critical: item.critical ?? false,
        order_index: i,
      }))
    ),
  });
  await tx.checklist_template_types.createMany({
    data: EQUIPMENT_TYPES.filter((t) => t.operative).map((t) => ({ template_id: TEMPLATE_ID, type_id: equipmentTypeId(t.key), company_id: company.id })),
  });
}

interface Deviation {
  id: string;
  answerId: string;
  vehicle: DemoVehicle;
  offset: number;
  driver: DemoEmployee;
  repair: string | null;
  label: string;
}

async function seedChecklistAnswers(ctx: Ctx, vehicles: DemoVehicle[], employees: DemoEmployee[], grid: DiagramGrid): Promise<Deviation[]> {
  const { tx, cal, faker, company, actorId } = ctx;
  const answers: Prisma.checklist_answersCreateManyInput[] = [];
  const deviationRows: Prisma.checklist_deviationsCreateManyInput[] = [];
  const deviations: Deviation[] = [];
  const operative = vehicles.filter((v) => v.active && v.condition === 'operativo' && EQUIPMENT_TYPES.find((t) => t.key === v.type)!.operative);
  const drivers = employees.filter((e) => e.position === 'chofer' || e.position === 'operador');
  const allItems = CHECKLIST_SECTIONS.flatMap((section) => section.items.map((item) => ({ section, item })));
  // Los desvios de mas de un dia ya tienen su solicitud: solo los que van a taller pueden ser
  // viejos. Los de documentacion o elementos de seguridad se resuelven en el dia.
  const workshopItems = allItems.filter((x) => x.item.repair);

  for (let offset = -60; offset <= 0; offset++) {
    if (cal.weekday(offset) === 0) continue;
    const todays = sample(faker, operative, offset === 0 ? 12 : faker.number.int({ min: 14, max: 22 }));
    for (const vehicle of todays) {
      const working = drivers.filter((d) => isWorking(grid, d.id, offset));
      const driver = pick(faker, working.length ? working : drivers.filter((d) => d.active));
      const id = demoId('checklist_answer', `${offset}:${vehicle.id}`);
      const failing = faker.datatype.boolean({ probability: 0.05 }) ? pick(faker, offset < -1 ? workshopItems : allItems) : null;
      const fieldOf = (sectionCode: string, itemCode: string) => `${sectionCode}__${itemCode}`;
      const answerMap: Record<string, string> = {};
      for (const { section, item } of allItems) {
        answerMap[fieldOf(section.code, item.code)] = failing && failing.item === item ? 'M' : 'B';
      }
      const hour = faker.number.int({ min: 5, max: 7 });
      const minute = faker.number.int({ min: 0, max: 59 });
      answers.push({
        id,
        template_id: TEMPLATE_ID,
        equipment_id: vehicle.id,
        employee_id: driver.id,
        chofer_employee_id: driver.id,
        user_id: actorId,
        company_id: company.id,
        answer_data: {
          answers: answerMap,
          customer_id: vehicle.customers[0] ?? customerId(EXTERNAL_CUSTOMERS[0]),
          chofer: `${driver.lastname} ${driver.firstname}`,
          fecha: cal.ymd(offset),
          hora: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          kilometraje: vehicle.type === 'semirremolque' ? null : String(vehicle.kilometer + offset * faker.number.int({ min: 120, max: 400 })),
          horometro: null,
          item_observations: failing ? { [fieldOf(failing.section.code, failing.item.code)]: 'Se informa al supervisor' } : {},
        },
        result: failing ? 'M' : 'B',
        observations: failing ? `Falla en ${failing.item.label.toLowerCase()}` : null,
        critical_items_failed: failing ? [failing.item.label] : [],
        created_at: cal.at(offset, hour, minute),
        updated_at: cal.at(offset, hour, minute),
      });
      if (failing) {
        const devId = demoId('checklist_deviation', id);
        deviationRows.push({
          id: devId,
          checklist_answer_id: id,
          equipment_id: vehicle.id,
          item_code: failing.item.code,
          item_label: failing.item.label,
          section_code: failing.section.code,
          is_critical: failing.item.critical ?? false,
          created_by_user_id: actorId,
          created_by_employee_id: driver.id,
          driver_comment: pick(faker, ['Hace ruido al frenar', 'No enciende', 'Se detecta pérdida debajo del motor', 'Falta presión', 'Vencido', 'Roto']),
          company_id: company.id,
          created_at: cal.at(offset, hour, minute),
        });
        deviations.push({ id: devId, answerId: id, vehicle, offset, driver, repair: failing.item.repair, label: failing.item.label });
      }
    }
  }
  await insertMany(answers, (c) => tx.checklist_answers.createMany({ data: c }), 500);
  await tx.checklist_deviations.createMany({ data: deviationRows });
  ctx.log(`${answers.length} checklists respondidos, ${deviationRows.length} desvíos`);
  return deviations;
}

type OrderStatus =
  | 'pending_scheduling'
  | 'date_confirmed'
  | 'scheduled'
  | 'in_workshop'
  | 'pending_workshop_validation'
  | 'workshop_rejected'
  | 'rejected'
  | 'completed';

/** Estados en que el equipo esta fisicamente en el taller. */
const IN_WORKSHOP: OrderStatus[] = ['in_workshop', 'pending_workshop_validation', 'workshop_rejected'];

function orderStatusFor(ctx: Ctx, age: number, preventive: boolean): OrderStatus {
  if (age <= 2) return 'pending_scheduling';
  // Una preventiva no tiene items hasta que el taller los carga: la demo las deja programadas.
  if (preventive) return weighted(ctx.faker, [['date_confirmed', 50], ['scheduled', 50]] as const);
  if (age <= 6) return weighted(ctx.faker, [['date_confirmed', 45], ['scheduled', 45], ['rejected', 10]] as const);
  if (age <= 20) return weighted(ctx.faker, [['in_workshop', 60], ['pending_workshop_validation', 30], ['workshop_rejected', 10]] as const);
  return weighted(ctx.faker, [['completed', 94], ['rejected', 6]] as const);
}

interface RequestPlan {
  key: string;
  offset: number;
  source: 'checklist' | 'manual' | 'preventive';
  vehicle: DemoVehicle | null;
  other: DemoOtherEquipment | null;
  repairs: string[];
  deviation: Deviation | null;
  group: string | null;
  description: string;
  driver: DemoEmployee | null;
}

const LIGHT_FLEET = new Set(['camioneta', 'minibus']);

function buildPlans(ctx: Ctx, vehicles: DemoVehicle[], others: DemoOtherEquipment[], deviations: Deviation[]): RequestPlan[] {
  const { faker } = ctx;
  const active = vehicles.filter((v) => v.active && v.type !== 'semirremolque');
  const plans: RequestPlan[] = [];
  for (const d of deviations.filter((x) => x.offset <= -2 && x.repair)) {
    plans.push({
      key: `dev:${d.id}`,
      offset: d.offset,
      source: 'checklist',
      vehicle: d.vehicle,
      other: null,
      repairs: [d.repair!],
      deviation: d,
      group: null,
      description: `Desvío de checklist: ${d.label}`,
      driver: d.driver,
    });
  }
  const correctives = REPAIRS.filter((r) => r.kind !== 'Preventivo');
  for (let i = 0; i < 26; i++) {
    plans.push({
      key: `manual:${i}`,
      // Las primeras son de los ultimos dias: siempre hay solicitudes esperando aprobacion.
      offset: i < 4 ? -(i % 3) : -faker.number.int({ min: 0, max: 170 }),
      source: 'manual',
      vehicle: pick(faker, active),
      other: null,
      repairs: sample(faker, correctives, weighted(faker, [[1, 70], [2, 30]])).map((r) => r.key),
      deviation: null,
      group: faker.datatype.boolean({ probability: 0.1 }) ? 'frenos_completo' : null,
      description: pick(faker, ['El chofer reporta ruido en tren delantero', 'Testigo de motor encendido', 'Vibración a alta velocidad', 'Pérdida de potencia en subida', 'No funciona el aire acondicionado']),
      driver: null,
    });
  }
  for (let i = 0; i < 10; i++) {
    plans.push({
      key: `prev:${i}`,
      offset: -faker.number.int({ min: 0, max: 12 }),
      source: 'preventive',
      vehicle: pick(faker, active),
      other: null,
      repairs: [],
      deviation: null,
      group: null,
      description: pick(faker, ['Service por kilometraje', 'Programa de mantenimiento preventivo', 'Service de 15.000 km']),
      driver: null,
    });
  }
  for (let i = 0; i < 4; i++) {
    plans.push({
      key: `other:${i}`,
      offset: -faker.number.int({ min: 3, max: 120 }),
      source: 'manual',
      vehicle: null,
      other: pick(faker, others),
      repairs: ['diagnostico'],
      deviation: null,
      group: null,
      description: 'El equipo no arranca en frío',
      driver: null,
    });
  }
  return plans.sort((a, b) => a.offset - b.offset);
}

export async function seedMaintenance(
  ctx: Ctx,
  employees: DemoEmployee[],
  vehicles: DemoVehicle[],
  others: DemoOtherEquipment[],
  grid: DiagramGrid
): Promise<void> {
  const { tx, cal, faker, company, actorId } = ctx;
  await seedWorkshopCatalogs(ctx, employees);
  await seedChecklistTemplate(ctx);
  const deviations = await seedChecklistAnswers(ctx, vehicles, employees, grid);
  const plans = buildPlans(ctx, vehicles, others, deviations);

  // Los equipos que el alta dejo "en reparacion" toman las ordenes que estan en taller.
  const inRepair = vehicles.filter((v) => v.active && (v.condition === 'en_reparacion' || v.condition === 'no_operativo'));
  const inWorkshopVehicles = new Set<string>();
  const inWorkshopOthers = new Set<string>();

  let orderSeq = 0;
  let woSeq = 0;
  for (const plan of plans) {
    const age = -plan.offset;
    const preventive = plan.source === 'preventive';
    const requestId = demoId('mrequest', plan.key);
    const requestStatus = preventive ? 'approved' : age <= 2 ? 'pending_approval' : faker.datatype.boolean({ probability: 0.08 }) ? 'rejected' : 'approved';
    const orderStatus = requestStatus === 'approved' ? orderStatusFor(ctx, age, preventive) : null;
    const inWorkshop = orderStatus !== null && IN_WORKSHOP.includes(orderStatus);
    if (inWorkshop && plan.vehicle && plan.source !== 'checklist' && inRepair.length) plan.vehicle = inRepair.shift()!;
    if (inWorkshop) {
      if (plan.vehicle) inWorkshopVehicles.add(plan.vehicle.id);
      else inWorkshopOthers.add(plan.other!.id);
    }
    const equipment = plan.vehicle ? { equipment_id: plan.vehicle.id } : { other_equipment_id: plan.other!.id };
    const preventiveType = preventive ? (LIGHT_FLEET.has(plan.vehicle!.type) ? 'light_fleet' : 'heavy_fleet') : null;
    const approvedOffset = preventive ? plan.offset : Math.min(plan.offset + 1, 0);

    await tx.maintenance_requests.create({
      data: {
        id: requestId,
        ...equipment,
        checklist_answer_id: plan.deviation?.answerId ?? null,
        employee_id: plan.driver?.id ?? null,
        driver_employee_id: plan.driver?.id ?? null,
        user_id: actorId,
        supervisor_id: actorId,
        status: requestStatus,
        source: plan.source,
        preventive_type: preventiveType,
        description: plan.description,
        kilometer: plan.vehicle ? String(plan.vehicle.kilometer - age * 250) : null,
        rejection_reason: requestStatus === 'rejected' ? 'Se resuelve en el próximo service programado' : null,
        rejected_by: requestStatus === 'rejected' ? actorId : null,
        rejected_at: requestStatus === 'rejected' ? cal.at(Math.min(plan.offset + 1, 0), 10) : null,
        approved_by: requestStatus === 'approved' ? actorId : null,
        approved_at: requestStatus === 'approved' ? cal.at(approvedOffset, 9) : null,
        company_id: company.id,
        created_at: cal.at(plan.offset, 8),
        updated_at: cal.at(approvedOffset, 9),
      },
    });
    const itemStatus = requestStatus === 'pending_approval' ? 'pending' : requestStatus;
    const requestItems = plan.repairs.map((repair, i) => ({
      id: demoId('mrequest_item', `${plan.key}:${i}`),
      maintenance_request_id: requestId,
      checklist_deviation_id: i === 0 ? plan.deviation?.id ?? null : null,
      repair_type_id: demoId('repair', repair),
      status: itemStatus,
      rejection_reason: itemStatus === 'rejected' ? 'Se resuelve en el próximo service programado' : null,
      validator_comment: itemStatus === 'approved' ? 'Aprobado para programar en taller' : null,
      validator_comment_by: itemStatus === 'approved' ? actorId : null,
      description: repairOf(repair).description,
      driver_comment: plan.deviation ? 'Informado en el checklist diario' : null,
      maintenance_group_id: plan.group ? demoId('repair_group', plan.group) : null,
      company_id: company.id,
      created_at: cal.at(plan.offset, 8),
    }));
    if (requestItems.length) await tx.maintenance_request_items.createMany({ data: requestItems });
    if (!orderStatus) continue;

    // ── Orden de mantenimiento ────────────────────────────────────────────────
    orderSeq++;
    const orderId = demoId('morder', plan.key);
    // Una orden que todavia espera el ingreso tiene el turno de hoy en adelante; las que ya
    // entraron al taller, unos dias despues de aprobada la solicitud.
    const awaitingEntry = orderStatus === 'date_confirmed' || orderStatus === 'scheduled';
    const scheduledOffset = awaitingEntry
      ? faker.number.int({ min: 0, max: 5 })
      : Math.min(plan.offset + faker.number.int({ min: 1, max: 3 }), 0);
    const entryOffset = Math.min(scheduledOffset + 1, 0);
    const closedOffset = Math.min(entryOffset + faker.number.int({ min: 1, max: 6 }), 0);
    const scheduled = orderStatus !== 'pending_scheduling' && orderStatus !== 'rejected';
    const entered = inWorkshop || orderStatus === 'completed';
    await tx.maintenance_orders.create({
      data: {
        id: orderId,
        maintenance_request_id: requestId,
        ...equipment,
        order_number: `OM-${String(orderSeq).padStart(6, '0')}`,
        status: orderStatus,
        source: plan.source,
        preventive_type: preventiveType,
        description: plan.description,
        scheduled_date: scheduled ? cal.day(scheduledOffset) : null,
        scheduled_by: scheduled ? actorId : null,
        scheduled_at: scheduled ? cal.at(approvedOffset, 11) : null,
        date_approved_at: scheduled ? cal.at(approvedOffset, 12) : null,
        date_approved_by: scheduled ? actorId : null,
        rejection_reason: orderStatus === 'rejected' ? 'El taller no tiene capacidad: se deriva a proveedor externo' : null,
        rejected_by: orderStatus === 'rejected' ? actorId : null,
        rejected_at: orderStatus === 'rejected' ? cal.at(approvedOffset, 12) : null,
        workshop_entry_date: entered ? cal.at(entryOffset, 8) : null,
        workshop_approved_by: entered ? actorId : null,
        kilometer_at_entry: plan.vehicle ? String(plan.vehicle.kilometer - age * 250) : null,
        workshop_validated_at: orderStatus === 'completed' ? cal.at(closedOffset, 17) : null,
        workshop_validation_notes: orderStatus === 'completed' ? 'Trabajos verificados, unidad liberada' : null,
        company_id: company.id,
        created_at: cal.at(approvedOffset, 9),
        updated_at: cal.at(orderStatus === 'completed' ? closedOffset : approvedOffset, 17),
      },
    });
    if (!plan.repairs.length) continue;

    const orderItems = plan.repairs.map((repair, i) => ({
      id: demoId('morder_item', `${plan.key}:${i}`),
      repair,
      requestItemId: requestItems[i].id,
      ...placeOf(repairOf(repair)),
      critical: repairOf(repair).criticity === 'Alta',
    }));
    await tx.maintenance_order_items.createMany({
      data: orderItems.map((it) => ({
        id: it.id,
        maintenance_order_id: orderId,
        maintenance_request_item_id: it.requestItemId,
        repair_type_id: demoId('repair', it.repair),
        description: repairOf(it.repair).description,
        assigned_workshop_id: scheduled ? demoId('workshop', it.workshop) : null,
        assigned_sector_id: scheduled && it.sector ? demoId('workshop_sector', it.sector) : null,
        assigned_at: scheduled ? cal.at(approvedOffset, 11) : null,
        assigned_by: scheduled ? actorId : null,
        planned_start_date: scheduled ? cal.day(scheduledOffset) : null,
        planned_end_date: scheduled ? cal.day(scheduledOffset + 2) : null,
        is_critical: it.critical,
        is_rejected: orderStatus === 'workshop_rejected',
        rejection_reason: orderStatus === 'workshop_rejected' ? 'Requiere repuesto importado: se reprograma' : null,
        rejected_by: orderStatus === 'workshop_rejected' ? actorId : null,
        rejected_at: orderStatus === 'workshop_rejected' ? cal.at(entryOffset, 15) : null,
        maintenance_group_id: plan.group ? demoId('repair_group', plan.group) : null,
        company_id: company.id,
        created_at: cal.at(approvedOffset, 9),
      })),
    });
    await tx.maintenance_order_item_repair_types.createMany({
      data: orderItems.map((it) => ({ maintenance_order_item_id: it.id, repair_type_id: demoId('repair', it.repair) })),
    });
    if (!entered) continue;

    // ── OT: una por sector (o por taller externo, que no tiene sectores) ──────
    const groups = new Map<string, typeof orderItems>();
    for (const it of orderItems) {
      const key = it.sector ?? `workshop:${it.workshop}`;
      groups.set(key, [...(groups.get(key) ?? []), it]);
    }
    for (const [groupKey, items] of groups) {
      woSeq++;
      const { workshop, sector } = items[0];
      const woId = demoId('work_order', `${plan.key}:${groupKey}`);
      const done = orderStatus === 'completed' || orderStatus === 'pending_workshop_validation';
      const woStatus = done ? 'completed' : orderStatus === 'workshop_rejected' ? 'cancelled' : weighted(faker, [['in_progress', 70], ['paused', 15], ['pending', 15]] as const);
      const label = plan.vehicle?.domain ?? plan.other!.internNumber;
      // Mismo formato que `buildWorkOrderNumber`; en un taller externo el nombre sale del taller.
      const placeName = sector
        ? WORKSHOPS.flatMap((w) => w.sectors).find((s) => s.key === sector)!.name
        : WORKSHOPS.find((w) => w.key === workshop)!.name;
      await tx.work_orders.create({
        data: {
          id: woId,
          order_number: `OT-${label.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${placeName.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 12)}-${String(woSeq).padStart(6, '0')}`,
          sequence_number: woSeq,
          company_id: company.id,
          ...equipment,
          workshop_id: demoId('workshop', workshop),
          sector_id: sector ? demoId('workshop_sector', sector) : null,
          status: woStatus,
          priority: items.some((i) => i.critical) ? weighted(faker, [['urgent', 40], ['high', 60]] as const) : weighted(faker, [['medium', 70], ['low', 30]] as const),
          planned_start_date: cal.day(entryOffset),
          planned_end_date: cal.day(entryOffset + 2),
          actual_start_date: woStatus !== 'pending' ? cal.at(entryOffset, 9) : null,
          actual_end_date: done ? cal.at(closedOffset, 16) : null,
          started_at: woStatus !== 'pending' ? cal.at(entryOffset, 9) : null,
          started_by: woStatus !== 'pending' ? actorId : null,
          completed_at: done ? cal.at(closedOffset, 16) : null,
          completed_by: done ? actorId : null,
          cancelled_at: woStatus === 'cancelled' ? cal.at(entryOffset, 15) : null,
          cancelled_by: woStatus === 'cancelled' ? actorId : null,
          cancellation_reason: woStatus === 'cancelled' ? 'Rechazo del taller' : null,
          paused_at: woStatus === 'paused' ? cal.at(entryOffset, 11) : null,
          paused_by: woStatus === 'paused' ? actorId : null,
          pause_reason: woStatus === 'paused' ? 'Esperando repuestos' : null,
          created_by: actorId,
          notes: done ? 'Trabajos realizados según orden' : null,
          created_at: cal.at(entryOffset, 8),
        },
      });
      for (const it of items) {
        const itemStatus = done ? 'completed' : woStatus === 'cancelled' ? 'rejected' : woStatus === 'pending' ? 'pending' : 'in_progress';
        const woItemId = demoId('work_order_item', it.id);
        await tx.work_order_items.create({
          data: {
            id: woItemId,
            work_order_id: woId,
            maintenance_order_item_id: it.id,
            status: itemStatus,
            completed_at: done ? cal.at(closedOffset, 15) : null,
            completed_by: done ? actorId : null,
            technician_notes: done ? 'Se realizó el trabajo y se probó la unidad' : null,
            created_at: cal.at(entryOffset, 8),
          },
        });
        await tx.maintenance_order_items.update({ where: { id: it.id }, data: { work_order_id: woId } });
        // Algunas reparaciones agregadas por el operario esperan aprobacion del jefe de taller.
        const extra = woStatus === 'in_progress' && faker.datatype.boolean({ probability: 0.3 });
        await tx.work_order_item_repairs.createMany({
          data: [
            {
              work_order_item_id: woItemId,
              repair_type_id: demoId('repair', it.repair),
              status: itemStatus,
              completed_at: done ? cal.at(closedOffset, 15) : null,
              completed_by: done ? actorId : null,
              technician_notes: done ? 'OK' : null,
              added_by: actorId,
              company_id: company.id,
              created_at: cal.at(entryOffset, 8),
            },
            ...(extra
              ? [
                  {
                    work_order_item_id: woItemId,
                    repair_type_id: demoId('repair', it.repair === 'diagnostico' ? 'electrica' : 'diagnostico'),
                    status: 'pending_approval' as const,
                    is_operator_added: true,
                    technician_notes: 'Se detecta otra falla durante la reparación',
                    added_by: actorId,
                    company_id: company.id,
                    created_at: cal.at(Math.min(entryOffset + 1, 0), 10),
                  },
                ]
              : []),
          ],
        });
      }
    }
  }

  await alignEquipmentConditions(ctx, vehicles, others, inWorkshopVehicles, inWorkshopOthers);
  ctx.log(`${plans.length} solicitudes de mantenimiento, ${orderSeq} órdenes, ${woSeq} OT (${inWorkshopVehicles.size + inWorkshopOthers.size} equipos en taller)`);
}

/**
 * Condicion de los equipos coherente con el taller: en reparacion los que tienen una orden en
 * taller, operativos los que el alta dejo en reparacion sin orden. Actualiza tambien los objetos
 * en memoria, que usan los partes diarios.
 */
async function alignEquipmentConditions(
  ctx: Ctx,
  vehicles: DemoVehicle[],
  others: DemoOtherEquipment[],
  inWorkshopVehicles: Set<string>,
  inWorkshopOthers: Set<string>
): Promise<void> {
  const { tx } = ctx;
  for (const v of vehicles.filter((x) => x.active)) {
    const next = inWorkshopVehicles.has(v.id)
      ? 'en_reparacion'
      : v.condition === 'en_reparacion' || v.condition === 'no_operativo'
        ? 'operativo'
        : v.condition;
    if (next !== v.condition) {
      v.condition = next;
      await tx.vehicles.update({ where: { id: v.id }, data: { condition: next } });
    }
  }
  await tx.other_equipment.updateMany({ where: { id: { in: [...inWorkshopOthers] } }, data: { condition: 'en_reparacion' } });
  await tx.other_equipment.updateMany({
    where: { id: { in: others.map((o) => o.id).filter((id) => !inWorkshopOthers.has(id)) }, condition: { in: ['en_reparacion', 'no_operativo'] } },
    data: { condition: 'operativo' },
  });
}
