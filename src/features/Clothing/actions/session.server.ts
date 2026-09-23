'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server'; // P4: auth
import { prisma } from '@/shared/lib/prisma';
import { clearActiveCompanyCookie, setActiveCompanyCookie } from '@/shared/lib/tenant';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getClothingOperator, type ClothingOperator } from './perimeter';

const logger = new Logger('features/Clothing/session');

/**
 * Login de la ruta `/clothing` (panel del operario de ropa).
 *
 * Sólo exige que el usuario tenga un empleado vinculado (no pide sector de taller).
 * La empresa se deja en la cookie de empresa activa vía `setActiveCompanyCookie()` para
 * que el resto del dashboard la vea; el perímetro de las actions NO se apoya en esa
 * cookie, sale del empleado (`perimeter.ts`).
 */
export async function clothingLogin(email: string, password: string) {
  const supabase = await supabaseServer(); // P4: auth

  const { error, data: authData } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logger.warn('Clothing login auth failed', { data: { email } });
    return { error: error.message };
  }

  if (!authData.user) {
    return { error: 'No se pudo autenticar' };
  }

  const profile = await prisma.profile.findUnique({
    where: { credential_id: authData.user.id },
    select: { employee_id: true },
  });

  if (!profile?.employee_id) {
    await supabase.auth.signOut(); // P4: auth
    return { error: 'Tu usuario no tiene un empleado vinculado. Contacta al administrador.' };
  }

  const employee = await prisma.employees.findUnique({
    where: { id: profile.employee_id },
    select: { id: true, company_id: true },
  });

  if (!employee) {
    await supabase.auth.signOut(); // P4: auth
    return { error: 'No se encontro el empleado vinculado. Contacta al administrador.' };
  }

  if (employee.company_id) {
    // El panel de ropa es un puesto fijo: la cookie dura un año como antes, no la hora
    // por defecto del helper (si expirara, los listados del panel se quedarían sin empresa).
    await setActiveCompanyCookie(employee.company_id, 60 * 60 * 24 * 365);
  }

  logger.info('Clothing login successful', { data: { userId: authData.user.id } });
  return { success: true };
}

/**
 * Cierra la sesión del panel de ropa y vuelve al login.
 */
export async function clothingLogout() {
  const supabase = await supabaseServer(); // P4: auth
  await supabase.auth.signOut(); // P4: auth
  await clearActiveCompanyCookie();
  revalidatePath('/', 'layout');
  redirect('/clothing/login');
}

/**
 * Contexto del operario de ropa de la sesión para las páginas de `/clothing`.
 * Devuelve `null` si la sesión no tiene un empleado vinculado.
 */
export async function getClothingOperatorContext(): Promise<ClothingOperator | null> {
  return getClothingOperator();
}

export type ClothingOperatorContext = ClothingOperator;
