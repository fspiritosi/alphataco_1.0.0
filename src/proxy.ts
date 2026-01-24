import { Logger } from '@/lib/logger';
import { getUserProfile } from '@/shared/actions/middleware.actions';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/utils/middleware';

const logger = new Logger('Proxy');

/**
 * Proxy simplificado para Next.js 16
 *
 * Responsabilidades:
 * 1. Verificar autenticación para /dashboard/*
 * 2. Verificar que usuarios autenticados tengan compañía asignada
 * 3. Delegar control de permisos granulares a PermissionGuard en componentes
 *
 * Notas:
 * - /maintenance/* NO está protegido (acceso anónimo para empleados con CUIL)
 * - Los permisos por rol se manejan con PermissionGuard y role_permissions en BD
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

  // 3. Obtener perfil del usuario con relaciones
  const profileWithRelations = await getUserProfile(user.email || '');

  // 4. Verificar si tiene compañía (propia o compartida)
  const hasCompany =
    (profileWithRelations?.company?.length ?? 0) > 0 || (profileWithRelations?.share_company_users?.length ?? 0) > 0;

  if (!hasCompany && !req.url.includes('/dashboard/company/new')) {
    logger.debug('Usuario sin compañía, redirigiendo a crear compañía');
    return NextResponse.redirect(new URL('/dashboard/company/new', req.url));
  }

  // 5. Usuario autenticado con compañía - permitir acceso
  // Los permisos granulares se manejan con PermissionGuard en los componentes
  return response;
}

export const config = {
  // Solo proteger /dashboard/* - /maintenance/* es público para usuarios anónimos
  matcher: ['/dashboard/:path*'],
};
