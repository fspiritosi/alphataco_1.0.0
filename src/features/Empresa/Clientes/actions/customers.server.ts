'use server';

import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { revalidatePath } from 'next/cache';
import { errorMessage, fail, ok, type ActionResult } from '../lib/action-result';
import { serializeCustomer, type CustomerRow } from '../lib/serializers';
import { customerFormSchema, type CustomerFormValues } from '../schemas/customer';

const logger = new Logger('features/Empresa/Clientes/customers');

const COMERCIAL_PATH = '/dashboard/comercial';

/** Clientes de la empresa activa ordenados por nombre. */
export async function getCustomers(): Promise<CustomerRow[]> {
  const companyId = await getActiveCompanyId();
  try {
    const rows = await prisma.customers.findMany({
      where: withCompany({}, companyId),
      orderBy: { name: 'asc' },
    });
    return rows.map(serializeCustomer);
  } catch (error) {
    logger.error('Error al obtener clientes', { data: { error, companyId } });
    throw error;
  }
}

/** Un cliente de la empresa activa, o null si no existe / no pertenece. */
export async function getCustomerById(customerId: string): Promise<CustomerRow | null> {
  const companyId = await getActiveCompanyId();
  try {
    const row = await prisma.customers.findFirst({ where: { id: customerId, company_id: companyId } });
    return row ? serializeCustomer(row) : null;
  } catch (error) {
    logger.error('Error al obtener el cliente', { data: { error, customerId } });
    throw error;
  }
}

function toCustomerData(values: CustomerFormValues, companyId: string) {
  const isActive = values.is_active;
  return {
    name: values.name,
    cuit: BigInt(values.cuit),
    client_email: values.client_email || null,
    client_phone: values.client_phone ? BigInt(values.client_phone) : null,
    address: values.address || null,
    is_active: isActive,
    company_id: companyId,
    // Si el cliente está activo se limpian los campos de baja.
    reason_for_termination: isActive ? null : values.reason_for_termination || null,
    termination_date: isActive ? null : (values.termination_date ?? null),
  };
}

/**
 * Alta o edición de un cliente de la empresa activa. `cuit` es único en toda la tabla:
 * se verifica antes para devolver un mensaje claro en vez del P2002.
 */
export async function saveCustomer(
  input: CustomerFormValues,
  customerId?: string
): Promise<ActionResult<{ id: string }>> {
  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const companyId = await getActiveCompanyId();
  const data = toCustomerData(parsed.data, companyId);

  try {
    const duplicate = await prisma.customers.findFirst({
      where: { cuit: data.cuit, ...(customerId ? { id: { not: customerId } } : {}) },
      select: { name: true },
    });
    if (duplicate) return fail(`El cliente ${duplicate.name} ya tiene este cuit`);

    if (customerId) {
      const updated = await prisma.customers.updateMany({ where: { id: customerId, company_id: companyId }, data });
      if (updated.count === 0) return fail('Cliente no encontrado');
      logger.info('Cliente actualizado', { data: { customerId } });
      revalidatePath(COMERCIAL_PATH);
      return ok({ id: customerId });
    }

    const created = await prisma.customers.create({ data, select: { id: true } });
    logger.info('Cliente creado', { data: { customerId: created.id } });
    revalidatePath(COMERCIAL_PATH);
    return ok({ id: created.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return fail('Ya existe un cliente con este cuit');
    }
    logger.error('Error al guardar el cliente', { data: { error, customerId } });
    return fail(errorMessage(error, 'Error al guardar el cliente'));
  }
}
