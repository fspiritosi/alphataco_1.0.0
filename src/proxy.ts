import { Logger } from '@/lib/logger';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/utils/middleware';

const logger = new Logger('Proxy');

/**
 * Proxy simplificado para Next.js 16
 *
 * Responsabilidades:
 * 1. Verificar autenticación para /dashboard/*
 * 2. Verificar que usuarios autenticados tengan compañía asignada (via JWT claims)
 * 3. Delegar control de permisos granulares a PermissionGuard en componentes
 *
 * Notas:
 * - /maintenance/* NO está protegido (acceso anónimo para empleados con CUIL)
 * - Los permisos por rol se manejan con PermissionGuard y role_permissions en BD
 * - has_company se inyecta en app_metadata via Custom Access Token Hook (0 DB queries)
 */
export async function proxy(req: NextRequest) {
  // Actualizar sesión y obtener usuario
  const { response, user } = await updateSession(req);

  // 1. Verificar autenticación
  if (!user?.id) {
    logger.debug('Usuario no autenticado, redirigiendo a login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. Usuarios anónimos no pueden acceder a /dashboard, redirigir a /maintenance
  if (user.is_anonymous) {
    logger.debug('Usuario anónimo intentando acceder a dashboard, redirigiendo a maintenance');
    return NextResponse.redirect(new URL('/maintenance', req.url));
  }

  // 3. Verificar si tiene compañía desde JWT claims (0 DB queries)
  // El Custom Access Token Hook inyecta has_company en app_metadata
  // Si has_company es undefined (hook no aplicado aun), permitir acceso (backwards-compatible)
  // Solo redirigir si has_company es EXPLÍCITAMENTE false
  const hasCompany = user.app_metadata?.has_company;

  if (hasCompany === false && !req.url.includes('/dashboard/company/new')) {
    logger.debug('Usuario sin compañía, redirigiendo a crear compañía');
    return NextResponse.redirect(new URL('/dashboard/company/new', req.url));
  }

  // 4. Usuario autenticado con compañía - permitir acceso
  return response;
}

export const config = {
  // Solo proteger /dashboard/* - /maintenance/* es público para usuarios anónimos
  matcher: ['/dashboard/:path*'],
};
