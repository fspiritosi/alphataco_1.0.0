/**
 * Neumaticos: marcas, medidas, plantillas de ejes por subtipo (tractor 6x4 y camioneta 4x4),
 * cubiertas montadas en esas unidades, stock disponible, descartes y ordenes de gomeria.
 */
import type { Prisma } from '../../../src/generated/prisma/client.ts';
import type { Ctx } from '../lib/ctx.ts';
import { demoId } from '../lib/ids.ts';
import { pick, weighted } from '../lib/random.ts';
import type { DemoVehicle } from './vehicles.ts';

const BRANDS = ['Bridgestone', 'Firestone', 'Pirelli', 'Fate'];
const TYPES = [
  { key: 'pesado_traccion', name: 'Pesado tracción', size: '295/80R22.5', tread: 'BLOCK' as const },
  { key: 'pesado_direccional', name: 'Pesado direccional', size: '295/80R22.5', tread: 'SMOOTH' as const },
  { key: 'camioneta', name: 'Camioneta AT', size: '265/65R17', tread: 'MIXED' as const },
];
const TEMPLATES = [
  {
    key: 'tractor_6x4',
    subType: 'tractor_6x4',
    name: 'Tractor 6x4',
    axles: [
      { n: 1, perSide: 1, size: '295/80R22.5', drive: false, type: 'pesado_direccional' },
      { n: 2, perSide: 2, size: '295/80R22.5', drive: true, type: 'pesado_traccion' },
      { n: 3, perSide: 2, size: '295/80R22.5', drive: true, type: 'pesado_traccion' },
    ],
    vehicleType: 'tractor',
  },
  {
    key: 'camioneta_4x4',
    subType: 'camioneta_4x4',
    name: 'Camioneta 4x4',
    axles: [
      { n: 1, perSide: 1, size: '265/65R17', drive: true, type: 'camioneta' },
      { n: 2, perSide: 1, size: '265/65R17', drive: true, type: 'camioneta' },
    ],
    vehicleType: 'camioneta',
  },
];

export async function seedTires(ctx: Ctx, vehicles: DemoVehicle[]): Promise<void> {
  const { tx, cal, faker, company, actorId } = ctx;
  await tx.tire_brands.createMany({ data: BRANDS.map((b) => ({ id: demoId('tire_brand', b), name: b, company_id: company.id })) });
  await tx.tire_types.createMany({
    data: TYPES.map((t) => ({ id: demoId('tire_type', t.key), name: t.name, size: t.size, tread_type: t.tread, company_id: company.id, updated_at: cal.at(-300) })),
  });
  for (const t of TEMPLATES) {
    await tx.tire_templates.create({ data: { id: demoId('tire_template', t.key), name: t.name, company_id: company.id } });
    await tx.tire_template_axles.createMany({
      data: t.axles.map((a) => ({ id: demoId('tire_axle', `${t.key}:${a.n}`), template_id: demoId('tire_template', t.key), axle_number: a.n, tires_per_side: a.perSide, tire_size: a.size, is_drive_axle: a.drive })),
    });
    await tx.sub_type.update({ where: { id: demoId('sub_type', t.subType) }, data: { tire_template_id: demoId('tire_template', t.key) } });
  }

  const tires: Prisma.tiresCreateManyInput[] = [];
  const positions: Prisma.vehicle_tire_positionsCreateManyInput[] = [];
  let serial = 0;
  const newTire = (type: string, status: 'AVAILABLE' | 'INSTALLED' | 'DISCARDED' | 'IN_REPAIR') => {
    serial++;
    const id = demoId('tire', serial);
    const isNew = faker.datatype.boolean({ probability: 0.7 });
    tires.push({
      id,
      serial_number: `NEU-${String(serial).padStart(5, '0')}`,
      brand_id: demoId('tire_brand', pick(faker, BRANDS)),
      tire_type_id: demoId('tire_type', type),
      is_new: isNew,
      retread_level: isNew ? null : 'FIRST',
      tread_depth: faker.number.float({ min: 4, max: 16, fractionDigits: 1 }),
      status,
      discarded_at: status === 'DISCARDED' ? cal.at(-faker.number.int({ min: 5, max: 200 })) : null,
      discard_comment: status === 'DISCARDED' ? 'Corte lateral irreparable' : null,
      company_id: company.id,
      created_at: cal.at(-400),
      updated_at: cal.at(-10),
    });
    return id;
  };

  // Montadas: las unidades cuyo subtipo tiene plantilla.
  const subTypeOf = new Map<string, string>();
  const rows = await tx.vehicles.findMany({ where: { company_id: company.id, is_active: true }, select: { id: true, subType: true } });
  for (const r of rows) if (r.subType) subTypeOf.set(r.id, r.subType);
  const mounted: Array<{ vehicle: DemoVehicle; tireIds: string[] }> = [];
  for (const v of vehicles.filter((x) => x.active)) {
    const template = TEMPLATES.find((t) => subTypeOf.get(v.id) === demoId('sub_type', t.subType));
    if (!template) continue;
    let position = 0;
    const tireIds: string[] = [];
    for (const axle of template.axles) {
      for (const side of ['LEFT', 'RIGHT'] as const) {
        for (let k = 0; k < axle.perSide; k++) {
          position++;
          const tireId = newTire(axle.type, 'INSTALLED');
          tireIds.push(tireId);
          positions.push({
            vehicle_id: v.id,
            template_axle_id: demoId('tire_axle', `${template.key}:${axle.n}`),
            position_number: position,
            axle_number: axle.n,
            side,
            tire_id: tireId,
            updated_at: cal.at(-30),
          });
        }
      }
    }
    mounted.push({ vehicle: v, tireIds });
  }
  // Stock y descartes.
  for (let i = 0; i < 24; i++) newTire(pick(faker, TYPES).key, weighted(faker, [['AVAILABLE', 70], ['DISCARDED', 20], ['IN_REPAIR', 10]] as const));

  await tx.tires.createMany({ data: tires });
  await tx.vehicle_tire_positions.createMany({ data: positions });
  await tx.vehicle_axle_tire_sizes.createMany({
    data: mounted.flatMap(({ vehicle }) => {
      const template = TEMPLATES.find((t) => subTypeOf.get(vehicle.id) === demoId('sub_type', t.subType))!;
      return template.axles.map((a) => ({ vehicle_id: vehicle.id, axle_number: a.n, tire_size: a.size, updated_at: cal.at(-30) }));
    }),
  });

  // Ordenes de gomeria de los ultimos tres meses.
  let orders = 0;
  for (const { vehicle } of mounted.slice(0, 18)) {
    orders++;
    const offset = -faker.number.int({ min: 1, max: 90 });
    const open = offset > -3;
    const id = demoId('tire_order', vehicle.id);
    await tx.tire_service_orders.create({
      data: {
        id,
        vehicle_id: vehicle.id,
        kilometer: String(vehicle.kilometer + offset * 250),
        service_date: cal.at(offset, 10),
        status: open ? 'OPEN' : 'CLOSED',
        created_by: actorId,
        company_id: company.id,
        closed_at: open ? null : cal.at(offset, 15),
        created_at: cal.at(offset, 10),
      },
    });
    await tx.tire_service_items.createMany({
      data: [1, 2].map((position) => ({
        service_order_id: id,
        position_number: position,
        vehicle_id: vehicle.id,
        action: weighted(faker, [['CALIBRATE', 70], ['REPAIR', 20], ['REPLACE', 10]] as const),
        tread_depth: faker.number.float({ min: 5, max: 14, fractionDigits: 1 }),
        pressure_start: faker.number.float({ min: 90, max: 110, fractionDigits: 1 }),
        pressure_end: 110,
        observations: 'Control de presión y desgaste',
        created_at: cal.at(offset, 11),
      })),
    });
  }
  ctx.log(`neumáticos: ${tires.length} cubiertas, ${mounted.length} unidades con plantilla, ${orders} órdenes de gomería`);
}
