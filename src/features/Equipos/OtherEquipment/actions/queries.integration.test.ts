import { describe, expect, it } from 'vitest';

/** Integración contra el Postgres del compose (sólo con DATABASE_URL): valida los selects Prisma de equipamientos. */
describe.skipIf(!process.env.DATABASE_URL)('ficha de equipamiento (integración)', () => {
  it('los selects de la ficha, certificaciones y duplicados son válidos', async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    const zero = '00000000-0000-0000-0000-000000000000';
    const equipment = await prisma.other_equipment.findFirst({
      where: { id: zero, company_id: zero },
      select: {
        id: true,
        horometer: true,
        initial_value: true,
        pictures: true,
        blueprints: true,
        type: { select: { id: true, name: true, generates_qr: true } },
        sub_type: { select: { id: true, name: true } },
        brand_vehicles: { select: { id: true, name: true } },
        model_vehicles: { select: { id: true, name: true } },
        equipment_owners: { select: { id: true, name: true } },
        hierarchy: { select: { id: true, name: true } },
        cost_center: { select: { id: true, name: true } },
        vehicles: { select: { id: true, domain: true } },
        contractor_other_equipment: { select: { customers: { select: { id: true, name: true } } } },
      },
    });
    expect(equipment).toBeNull();

    const certs = await prisma.other_equipment_certifications.findMany({
      where: { equipment_id: zero, other_equipment: { company_id: zero } },
      select: { id: true, file_url: true, expiration_date: true, created_at: true },
    });
    expect(certs).toEqual([]);

    const dup = await prisma.other_equipment.findFirst({
      where: { serial_number: 'x', is_active: true, id: { not: zero }, company_id: zero },
      select: { id: true },
    });
    expect(dup).toBeNull();
  });
});
