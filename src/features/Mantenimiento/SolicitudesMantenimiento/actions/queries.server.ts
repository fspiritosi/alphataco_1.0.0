'use server';

import { Logger } from '@/lib/logger';
import { CACHE_TAGS } from '@/shared/constants/cache';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { cacheLife, cacheTag } from 'next/cache';
import type { MaintenanceRequestFilters } from '../../types';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';
import { MAINTENANCE_REQUEST_FULL_SELECT, mapRequestWithAliases } from './request-select';

const serverLogger = new Logger('SolicitudesMantenimiento/queries');

/**
 * Obtiene las solicitudes de mantenimiento con filtros opcionales.
 * Incluye información de maintenance_orders para saber el estado del pedido.
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODAS las solicitudes
 * - Usuarios sin rol de sistema: solo ven solicitudes donde supervisor_id = su profile.id
 */
export async function getMaintenanceRequests(filters?: MaintenanceRequestFilters) {
  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  // Construir el filtro de fechas
  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (filters?.from_date) createdAtFilter.gte = new Date(filters.from_date);
  if (filters?.to_date) createdAtFilter.lte = new Date(filters.to_date);

  // Perímetro: sin RLS, el listado se acota SIEMPRE a la empresa activa.
  const companyId = await getActiveCompanyId();

  const where = withCompany(
    {
      // Las rechazadas se excluyen: quedan como registro historico en el legajo
      // del equipo, tab "Historial de Mantenimiento".
      status: filters?.status ?? 'pending_approval',
    ...(filterInfo?.shouldFilterBySupervisor ? { supervisor_id: filterInfo.userId } : {}),
    ...(filters?.equipment_id ? { equipment_id: filters.equipment_id } : {}),
      ...(Object.keys(createdAtFilter).length > 0 ? { created_at: createdAtFilter } : {}),
    },
    companyId
  );

  try {
    const requests = await prisma.maintenance_requests.findMany({
      where,
      select: MAINTENANCE_REQUEST_FULL_SELECT,
      orderBy: { created_at: 'desc' },
    });

    return requests.map(mapRequestWithAliases);
  } catch (error) {
    serverLogger.error('Error al obtener solicitudes de mantenimiento', { data: { error } });
    throw error;
  }
}

export type MaintenanceRequestsData = Awaited<ReturnType<typeof getMaintenanceRequests>>;
export type MaintenanceRequestData = MaintenanceRequestsData[number];

/**
 * Lectura cacheada de una solicitud, acotada a una empresa.
 *
 * La empresa llega por parámetro porque una función `'use cache'` no puede leer la sesión
 * (ni cookies ni headers): el helper `getActiveCompanyId()` la resuelve en la action de
 * abajo y la pasa acá, que además la vuelve parte de la clave de caché.
 */
async function getCachedMaintenanceRequestById(requestId: string, companyId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.MAINTENANCE_REQUESTS);
  cacheLife({ expire: 15, revalidate: 15, stale: 5 });

  try {
    const request = await prisma.maintenance_requests.findFirst({
      where: withCompany({ id: requestId }, companyId),
      select: MAINTENANCE_REQUEST_FULL_SELECT,
    });

    if (!request) {
      serverLogger.warn('Solicitud no encontrada', { data: { requestId } });
      return null;
    }

    return mapRequestWithAliases(request);
  } catch (error) {
    serverLogger.error('Error al obtener solicitud de mantenimiento', { data: { error, requestId } });
    throw error;
  }
}

/**
 * Obtiene una solicitud de mantenimiento por ID, acotada a la empresa activa.
 */
export async function getMaintenanceRequestById(requestId: string) {
  const companyId = await getActiveCompanyId();
  return getCachedMaintenanceRequestById(requestId, companyId);
}
