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
 * 3. Inyectar headers X-POSTHOG-SESSION-ID y X-POSTHOG-DISTINCT-ID para session linking
 * 4. Delegar control de permisos granulares a PermissionGuard en componentes
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

  // 5. Inyectar headers de PostHog para session linking en instrumentation.ts
  //    Cookie: ph_<API_KEY>_posthog = { distinct_id, $sesid: [startTs, sessionId, activityTs] }
  const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (phKey) {
    const phCookie = req.cookies.get(`ph_${phKey}_posthog`);
    if (phCookie?.value) {
      try {
        const phData = JSON.parse(decodeURIComponent(phCookie.value));
        const distinctId: string | undefined = phData.distinct_id;
        const sessionId: string | undefined = phData.$sesid?.[1] ?? phData.$session_id;
        if (distinctId) response.headers.set('X-POSTHOG-DISTINCT-ID', distinctId);
        if (sessionId) response.headers.set('X-POSTHOG-SESSION-ID', sessionId);
      } catch {
        // Cookie malformada — continuar sin headers de PostHog
      }
    }
  }

  // 6. Usuario autenticado con compañía - permitir acceso
  // Los permisos granulares se manejan con PermissionGuard en los componentes
  return response;
}

export const config = {
  // Solo proteger /dashboard/* - /maintenance/* es público para usuarios anónimos
  matcher: ['/dashboard/:path*'],
};
