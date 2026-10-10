'use server';

import { revalidatePath } from 'next/cache';
import { fail, ok, type ActionResult } from '@/features/Empresa/Clientes/lib/action-result';
import { checkPermissionServer } from '@/features/Permissions';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { NO_PERMISSION, UUID_RE, firstIssue, toPurchaseActionError } from '../lib/action-errors';
import { treasuryAccountFormSchema, type TreasuryAccountFormValues } from '../schemas/payment-settings';

/**
 * Cuentas y cajas desde las que se paga (spec Compras etapa 5 §2.1). Es el catalogo del futuro
 * modulo de Tesoreria; hoy se administra desde Configuracion de Compras.
 */

const logger = new Logger('features/Purchases/treasury-accounts');

const PURCHASES_PATH = '/dashboard/purchases';
const NOT_FOUND = 'La cuenta no existe';
const duplicate = (name: string) => `Ya existe la cuenta «${name}»`;

/** Todas las cuentas de la empresa. Las ve quien configura y quien arma o registra pagos. */
export async function getTreasuryAccounts() {
  const allowed = await Promise.all([
    checkPermissionServer('compras', 'config-compras', 'view'),
    checkPermissionServer('compras', 'pagos', 'update'),
  ]);
  if (!allowed.some(Boolean)) return [];
  const companyId = await getActiveCompanyId();
  return prisma.treasury_accounts.findMany({
    where: { company_id: companyId },
    select: { id: true, kind: true, name: true, bank_name: true, account_number: true, cbu: true, is_active: true },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
  });
}

export type TreasuryAccountRow = Awaited<ReturnType<typeof getTreasuryAccounts>>[number];

const orNull = (value: string) => (value.trim() ? value.trim() : null);

async function findDuplicate(companyId: string, name: string, exceptId?: string) {
  return prisma.treasury_accounts.findFirst({
    where: { company_id: companyId, name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { name: true },
  });
}

export async function createTreasuryAccount(values: TreasuryAccountFormValues): Promise<ActionResult<{ id: string }>> {
  if (!(await checkPermissionServer('compras', 'config-compras', 'update'))) return fail(NO_PERMISSION);
  const parsed = treasuryAccountFormSchema.safeParse(values);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const companyId = await getActiveCompanyId();
  const v = parsed.data;
  try {
    const existing = await findDuplicate(companyId, v.name);
    if (existing) return fail(duplicate(existing.name));
    const created = await prisma.treasury_accounts.create({
      data: { company_id: companyId, kind: v.kind, name: v.name, bank_name: orNull(v.bankName), account_number: orNull(v.accountNumber), cbu: orNull(v.cbu) },
      select: { id: true },
    });
    revalidatePath(PURCHASES_PATH);
    return ok(created);
  } catch (error) {
    return toPurchaseActionError(error, logger, 'crear la cuenta', duplicate(v.name));
  }
}

export async function updateTreasuryAccount(id: string, values: TreasuryAccountFormValues): Promise<ActionResult> {
  if (!(await checkPermissionServer('compras', 'config-compras', 'update'))) return fail(NO_PERMISSION);
  const parsed = treasuryAccountFormSchema.safeParse(values);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (!UUID_RE.test(id)) return fail(NOT_FOUND);
  const companyId = await getActiveCompanyId();
  const v = parsed.data;
  try {
    const existing = await findDuplicate(companyId, v.name, id);
    if (existing) return fail(duplicate(existing.name));
    const { count } = await prisma.treasury_accounts.updateMany({
      where: { id, company_id: companyId },
      data: { kind: v.kind, name: v.name, bank_name: orNull(v.bankName), account_number: orNull(v.accountNumber), cbu: orNull(v.cbu) },
    });
    if (count === 0) return fail(NOT_FOUND);
    revalidatePath(PURCHASES_PATH);
    return ok(null);
  } catch (error) {
    return toPurchaseActionError(error, logger, 'actualizar la cuenta', duplicate(v.name));
  }
}

/** Desactivar no toca los pagos ya registrados: solo deja de ofrecerse al pagar. */
export async function setTreasuryAccountActive(id: string, isActive: boolean): Promise<ActionResult> {
  if (!(await checkPermissionServer('compras', 'config-compras', 'update'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(id)) return fail(NOT_FOUND);
  const companyId = await getActiveCompanyId();
  try {
    const { count } = await prisma.treasury_accounts.updateMany({ where: { id, company_id: companyId }, data: { is_active: isActive } });
    if (count === 0) return fail(NOT_FOUND);
    revalidatePath(PURCHASES_PATH);
    return ok(null);
  } catch (error) {
    return toPurchaseActionError(error, logger, isActive ? 'reactivar la cuenta' : 'desactivar la cuenta');
  }
}
