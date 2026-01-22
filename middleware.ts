import { supabaseServer } from '@/lib/supabase/server';
import { updateSession } from '@/lib/utils/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Actualizar sesión de Supabase
  const response = await updateSession(request);

  // Proteger rutas de /maintenance (excepto la ruta raíz /maintenance que es el login y /maintenance/thanks)
  if (pathname.startsWith('/maintenance/') && pathname !== '/maintenance' && pathname !== '/maintenance/thanks') {
    // Verificar si hay cookie de empleado
    // La cookie empleado_id se establece después del login en /maintenance
    // const empleadoId = request.cookies.get('empleado_id')?.value;
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log(user, 'user');

    // Si no hay empleado_id, redirigir al login de maintenance
    if (!user?.is_anonymous) {
      const url = new URL('/maintenance', request.url);
      // Preservar la ruta original para redirigir después del login si es necesario
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
  runtime: 'edge',
};
