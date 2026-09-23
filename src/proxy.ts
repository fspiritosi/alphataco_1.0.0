import { Logger } from '@/lib/logger';
import { auth } from '@/shared/lib/auth';
import { resolveDefaultCompanyId, writeCompanyClaim } from '@/shared/lib/session-claims';
import { NextResponse, type NextRequest } from 'next/server';

const logger = new Logger('Proxy');

/**
 * Proxy de Next.js 16 (el ex-middleware). Corre en runtime Node, así que puede leer la sesión
 * de Better Auth directamente contra la base — ya no hace falta el cliente SSR de Supabase que
 * refrescaba el JWT en cada request.
 *
 * Responsabilidades:
 * 1. Verificar autenticación para /dashboard/*
 * 2. Mandar al operario anónimo (QR) a /maintenance
 * 3. Verificar que el usuario tenga empresa, por el claim de la sesión
 *
 * Notas:
 * - /maintenance/* NO está protegido (acceso anónimo para empleados con CUIL)
 * - Los permisos por rol se manejan con PermissionGuard y role_permissions en BD
 * - Ya NO se siembra la cookie `actualComp` acá: el claim de empresa se resuelve en el alta de
 *   sesión (`session.create.before`) y `getActiveCompanyId()` lo prefiere sobre la cookie, así
 *   que sembrarla era redundante.
 */
export async function proxy(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  // 1. Verificar autenticación
  if (!session?.user.id) {
    logger.debug('Usuario no autenticado, redirigiendo a login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. Usuarios anónimos no pueden acceder a /dashboard, redirigir a /maintenance
  if (session.user.isAnonymous) {
    logger.debug('Usuario anónimo intentando acceder a dashboard, redirigiendo a maintenance');
    return NextResponse.redirect(new URL('/maintenance', req.url));
  }

  // 3. Empresa: el claim lo estampó el servidor al abrir la sesión. Si está vacío puede ser que
  //    el usuario no tenga ninguna, o que lo hayan sumado a una DESPUÉS de abrir la sesión: se
  //    reintenta resolver contra la base y, si aparece, se estampa. Sin este auto-rescate el
  //    invitado a una empresa quedaría rebotando contra /dashboard/company/new hasta relogearse.
  if (!session.session.company) {
    const resolved = await resolveDefaultCompanyId(session.user.id);

    if (resolved) {
      await writeCompanyClaim(session.session.token, resolved);
    } else if (!req.nextUrl.pathname.startsWith('/dashboard/company/new')) {
      logger.debug('Usuario sin compañía, redirigiendo a crear compañía');
      return NextResponse.redirect(new URL('/dashboard/company/new', req.url));
    }
  }

  // 4. Usuario autenticado con compañía - permitir acceso
  return NextResponse.next();
}

export const config = {
  // Solo proteger /dashboard/* - /maintenance/* es público para usuarios anónimos
  matcher: ['/dashboard/:path*'],
};
