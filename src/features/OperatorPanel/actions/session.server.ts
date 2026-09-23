'use server';

import { getAssignedSectorsForEmployee, getOperatorIdentity } from '@/features/OperatorPanel/actions/perimeter';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server'; // P4: auth
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const logger = new Logger('OperatorPanel/session');

/** Sector de taller que el operario tiene abierto en el panel. */
const ACTIVE_SECTOR_COOKIE = 'activeOperatorSectorId';

const SECTOR_COOKIE_OPTIONS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
} as const;

/**
 * Login del operario.
 *
 * El alta de sesión sigue en Supabase Auth (P4 la reemplaza); lo que se migró es todo lo
 * que hay alrededor, que es dato: el `profile`, el empleado y sus sectores asignados.
 */
export async function operatorLogin(email: string, password: string) {
  const supabase = await supabaseServer(); // P4: auth

  const { error, data: authData } = await supabase.auth.signInWithPassword({ email, password }); // P4: auth

  if (error) {
    return { error: error.message };
  }

  if (!authData.user) {
    return { error: 'No se pudo autenticar' };
  }

  // `profile.credential_id` es el id de sesión: mismo criterio que `getServerAuthProfile()`.
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

  if (!employee?.company_id) {
    await supabase.auth.signOut(); // P4: auth
    return { error: 'No se encontro el empleado vinculado. Contacta al administrador.' };
  }

  const sectors = await getAssignedSectorsForEmployee(employee.id, employee.company_id);

  if (sectors.length === 0) {
    await supabase.auth.signOut(); // P4: auth
    return { error: 'Tu empleado no tiene sectores de taller asignados. Contacta al administrador.' };
  }

  // El login del operario NO escribe la cookie `actualComp` de empresa activa, a propósito:
  // el panel no la lee (todo el perímetro sale del empleado de la sesión, ver `perimeter.ts`)
  // y `/operator` ni siquiera pasa por el middleware, que tiene `matcher: ['/dashboard/:path*']`.
  // Escribirla sólo contaminaba: en un navegador que además entra a `/dashboard`, este login
  // pisaba la cookie de un año con una de una hora.
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_SECTOR_COOKIE, sectors[0]!.sectorId, SECTOR_COOKIE_OPTIONS);

  return { success: true };
}

export async function operatorLogout() {
  const supabase = await supabaseServer(); // P4: auth
  await supabase.auth.signOut(); // P4: auth

  // Sólo se borra lo que este panel escribió. La cookie de empresa activa es del dashboard:
  // el operario no la setea, así que tampoco se la lleva puesta al salir.
  (await cookies()).delete(ACTIVE_SECTOR_COOKIE);

  revalidatePath('/', 'layout');
  redirect('/operator/login');
}

/**
 * Cambia el sector de taller activo.
 *
 * El `sectorId` llega del cliente: sólo se acepta si está entre los sectores asignados al
 * operario de la sesión, nunca por el id solo.
 */
export async function setActiveOperatorSector(sectorId: string) {
  const operator = await getOperatorIdentity();
  if (!operator) return { error: 'No autenticado' };

  if (!operator.sectorIds.includes(sectorId)) {
    logger.warn('Intento de activar un sector no asignado', {
      data: { sectorId, employeeId: operator.employeeId },
    });
    return { error: 'El sector seleccionado no pertenece al empleado' };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_SECTOR_COOKIE, sectorId, SECTOR_COOKIE_OPTIONS);

  revalidatePath('/operator', 'layout');
  return { success: true };
}

/**
 * Contexto del operario: empleado, sectores asignados y sector activo (cookie, con fallback
 * al primero asignado). Devuelve `null` si la sesión no llega a ser la de un operario.
 *
 * No expone el id de sesión: el contexto viaja al cliente y ahí no hace falta.
 */
export async function getOperatorContext() {
  const operator = await getOperatorIdentity();
  if (!operator) return null;

  const cookieSectorId = (await cookies()).get(ACTIVE_SECTOR_COOKIE)?.value ?? null;
  const activeSector = operator.sectors.find((sector) => sector.sectorId === cookieSectorId) ?? operator.sectors[0]!;

  return {
    employeeId: operator.employeeId,
    employeeName: operator.employeeName,
    companyId: operator.companyId,
    sectors: operator.sectors,
    sectorId: activeSector.sectorId,
    sectorName: activeSector.sectorName,
    workshopId: activeSector.workshopId,
    workshopName: activeSector.workshopName,
  };
}

export type OperatorContext = NonNullable<Awaited<ReturnType<typeof getOperatorContext>>>;
export type OperatorAssignedSector = OperatorContext['sectors'][number];
