import { describe, expect, it } from 'vitest';

/**
 * Integración real contra el Postgres del compose (rollback al final). Corre sólo con DATABASE_URL:
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco npx vitest run src/features/Empresa/Clientes/lib/allocated-to.integration.test.ts
 * Prueba el SQL crudo de `syncAllocatedTo` (binding `::uuid[]`, array_append/array_remove) y la
 * llamada `callVoid('controlar_alertas_documentos_single_employee', ...)` dentro de la misma tx.
 */
class Rollback extends Error {}

describe.skipIf(!process.env.DATABASE_URL)('syncAllocatedTo (integración)', () => {
  it('agrega y quita el cliente de employees.allocated_to sin duplicar, y la reconciliación corre', async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    const { callVoid } = await import('@/shared/lib/sql');
    const { syncAllocatedTo } = await import('./allocated-to');

    const company = await prisma.company.findFirst({ select: { id: true } });
    const province = await prisma.provinces.findFirst({ select: { id: true } });
    if (!company || !province) throw new Error('La base del compose necesita al menos una empresa y una provincia');

    let observed: { afterAdd: string[]; afterSecondAdd: string[]; afterRemove: string[] } | null = null;

    await prisma
      .$transaction(async (tx) => {
        const country = await tx.countries.create({ data: { name: 'País test' }, select: { id: true } });
        const customer = await tx.customers.create({
          data: { name: 'Cliente test allocated_to', cuit: BigInt(Date.now() % 10_000_000_000), company_id: company.id },
          select: { id: true },
        });
        const employee = await tx.employees.create({
          data: {
            company_id: company.id,
            lastname: 'Prueba',
            firstname: 'Allocated',
            cuil: '20-00000000-0',
            document_number: '00000000',
            birthplace: country.id,
            street: 'x',
            street_number: '1',
            province: province.id,
            phone: '0',
            file: 'T-1',
            date_of_admission: new Date(),
            allocated_to: [],
          },
          select: { id: true },
        });

        const read = async () =>
          (await tx.employees.findUniqueOrThrow({ where: { id: employee.id }, select: { allocated_to: true } }))
            .allocated_to;

        await syncAllocatedTo(tx, 'employees', customer.id, [employee.id], []);
        const afterAdd = await read();
        await syncAllocatedTo(tx, 'employees', customer.id, [employee.id], []);
        const afterSecondAdd = await read();
        await callVoid('controlar_alertas_documentos_single_employee', [{ uuid: employee.id }, { uuid: company.id }], tx);
        await syncAllocatedTo(tx, 'employees', customer.id, [], [employee.id]);
        const afterRemove = await read();

        observed = { afterAdd, afterSecondAdd, afterRemove };
        throw new Rollback();
      })
      .catch((error) => {
        if (!(error instanceof Rollback)) throw error;
      });

    expect(observed).not.toBeNull();
    const { afterAdd, afterSecondAdd, afterRemove } = observed!;
    expect(afterAdd).toHaveLength(1);
    expect(afterSecondAdd).toHaveLength(1);
    expect(afterRemove).toHaveLength(0);
  });
});
