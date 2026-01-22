import { Logger } from '@/lib/logger';
import { getUserProfile } from '@/shared/actions/middleware.actions';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/utils/middleware';

const logger = new Logger('Proxy');

// Rutas restringidas para rol Invitado
const GUEST_RESTRICTED_PATHS = [
  '/dashboard/employee/action?action=edit&',
  '/dashboard/employee/action?action=new',
  '/dashboard/equipment/action?action=edit&',
  '/dashboard/equipment/action?action=new',
  '/dashboard/company/new',
  '/dashboard/company/actualCompany',
];

// Rutas permitidas para rol Invitado
const GUEST_ALLOWED_PATHS = ['/dashboard/document', '/dashboard/employees', '/dashboard/equipment'];

// Rutas restringidas para rol Usuario
const USER_RESTRICTED_PATHS = ['/dashboard/company/actualCompany', 'admin/auditor'];

// Rutas restringidas para rol Administrador
const ADMIN_RESTRICTED_PATHS = ['admin/auditor'];

// Rutas restringidas para rol CodeControlClient
const CODE_CONTROL_CLIENT_RESTRICTED_PATHS = ['admin/auditor'];

export async function proxy(req: NextRequest) {
  // Actualizar sesión y obtener usuario (una sola consulta)
  const { response, user } = await updateSession(req);

  // Verificar autenticación
  if (!user?.id) {
    logger.debug('Usuario no autenticado, redirigiendo a login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Obtener perfil del usuario con relaciones
  const profileWithRelations = await getUserProfile(user.email || '');

  // Verificar si tiene compañía (propia o compartida)
  const hasCompany =
    (profileWithRelations?.company?.length ?? 0) > 0 || (profileWithRelations?.share_company_users?.length ?? 0) > 0;

  if (!hasCompany && !req.url.includes('/dashboard/company/new')) {
    logger.debug('Usuario sin compañía, redirigiendo a crear compañía');
    return NextResponse.redirect(new URL('/dashboard/company/new', req.url));
  }

  const userRole = profileWithRelations?.role;

  // Admin tiene acceso sin restricciones
  if (userRole === 'Admin') {
    return response;
  }

  // Aplicar restricciones por rol
  const baseUrl = req.url.includes('?') ? req.url.split('?')[0] : req.url;
  const redirectUrl = new URL(baseUrl);
  redirectUrl.searchParams.set('access_denied', 'true');

  // Restricciones para CodeControlClient
  if (userRole === 'CodeControlClient' && CODE_CONTROL_CLIENT_RESTRICTED_PATHS.some((url) => req.url.includes(url))) {
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Restricciones para Invitado
  if (userRole === 'Invitado') {
    // Si no está en /dashboard/document, redirigir
    if (!req.url.includes('/dashboard/document')) {
      redirectUrl.pathname = '/dashboard/document';
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Si está en ruta restringida, redirigir
    if (GUEST_RESTRICTED_PATHS.some((url) => req.url.includes(url))) {
      redirectUrl.pathname = '/dashboard/document/';
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Verificar rutas permitidas
    const isAllowedPath = GUEST_ALLOWED_PATHS.some((path) => req.url.startsWith(path));
    if (isAllowedPath) {
      return response;
    }

    // Si está en ruta restringida, redirigir
    const isRestrictedPath = GUEST_RESTRICTED_PATHS.some((path) => req.url.startsWith(path));
    if (isRestrictedPath) {
      redirectUrl.pathname = '/dashboard/document';
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Restricciones para Administrador
  if (userRole === 'Administrador' && ADMIN_RESTRICTED_PATHS.some((url) => req.url.includes(url))) {
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Restricciones para Usuario
  if (userRole === 'Usuario' && USER_RESTRICTED_PATHS.some((url) => req.url.includes(url))) {
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl.toString());
  }

  return response;
}
