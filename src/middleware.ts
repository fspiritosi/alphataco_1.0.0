// import { NextResponse, type NextRequest } from 'next/server';
// import { supabaseServer } from './lib/supabase/server';

// export async function middleware(req: NextRequest) {
//   // await updateSession(req)
//   const supabase = supabaseServer();
//   const response = NextResponse.next({
//     request: {
//       headers: req.headers,
//     },
//   });

//   const {
//     data: { session },
//   } = await supabase.auth.getSession();

//   const { data } = await supabase
//     .from('profile')
//     .select('*')
//     .eq('email', session?.user.email || '');

//   const { data: Companies, error } = await supabase
//     .from('company')
//     .select(`*`)
//     .eq('owner_id', data?.[0]?.id || '');

//   let { data: share_company_users, error: sharedError } = await supabase
//     .from('share_company_users')
//     .select(`*`)
//     .eq('profile_id', data?.[0]?.id || '');

//   const actualNoOwnerValue: string | null = req.cookies.get('actualComp')?.value ?? null;

//   const actualNoOwner = actualNoOwnerValue ? actualNoOwnerValue.replace(/^"|"$/g, '') : null;

//   const actualNow = actualNoOwner; //!== null ? parseInt(actualNoOwner as string, 10) : null
//   const { data: guestRole } = await supabase
//     .from('share_company_users')
//     .select('role')
//     .eq('profile_id ', data?.[0]?.id || '')
//     .eq('company_id', actualNow || '');

//   //response.cookies.set('guestRole', guestRole?.[0]?.role)

//   if (!Companies?.length && !share_company_users?.length && !req.url.includes('/dashboard/company/new')) {
//     return NextResponse.redirect(new URL('/dashboard/company/new', req.url));
//   }

//   //const theme = response.cookies.get('theme')
//   //const actualCompanyId = req.cookies.get('actialCompanyId')
//   // const actualNoOwner :string | null = req.cookies.get('actualComp')?.value

//   const userRole = data?.[0]?.role;

//   const guestUser = [
//     '/dashboard/employee/action?action=edit&',
//     '/dashboard/employee/action?action=new',
//     '/dashboard/equipment/action?action=edit&',
//     '/dashboard/equipment/action?action=new',
//     '/dashboard/company/new',
//     '/dashboard/company/actualCompany',
//   ]; // -> Rol tabla profile
//   const allowedPathsguestUser = ['/dashboard/document', '/dashboard/employees', '/dashboard/equipment'];
//   const usuarioUser = ['/dashboard/company/actualCompany', 'admin/auditor'];

//   const administradorUser = ['admin/auditor'];
//   const codeControlClientUser = ['admin/auditor'];

//   const isAuditor = data?.[0]?.role === 'Auditor';

//   if (!session) {
//     return NextResponse.redirect(new URL('/login', req.url));
//   }

//   if (userRole === 'Admin') {
//     return response; // Permitir acceso sin restricciones para los usuarios con rol 'Admin'
//   } else {
//     const baseUrl = req.url.includes('?') ? req.url.split('?')[0] : req.url;
//     const redirectUrl = new URL(baseUrl);
//     redirectUrl.searchParams.set('access_denied', 'true');

//     if (isAuditor && !req.url.includes('admin/auditor')) {
//       redirectUrl.pathname = '/auditor';
//       return NextResponse.redirect(redirectUrl.toString());
//     }
//     if (!isAuditor && req.url.includes('admin/auditor')) {
//       redirectUrl.pathname = '/dashboard';
//       return NextResponse.redirect(redirectUrl.toString());
//     }
//     //response.cookies.set('guestRole', guestRole?.[0]?.role)
//     if (userRole === 'CodeControlClient' && codeControlClientUser.some((url) => req.url.includes(url))) {
//       redirectUrl.pathname = '/dashboard';
//       return NextResponse.redirect(redirectUrl.toString());
//     }
//     // if (guestRole?.[0]?.role === 'Invitado' && !req.url.includes('/dashboard/document')) {
//     //   redirectUrl.pathname = '/dashboard/document';
//     //   return NextResponse.redirect(redirectUrl.toString());
//     // }

//     // if (guestRole?.[0]?.role === 'Invitado' && guestUser.some((url) => req.url.includes(url))) {
//     //   redirectUrl.pathname = '/dashboard/document/';
//     //   return NextResponse.redirect(redirectUrl.toString());
//     // }
//     if (guestRole?.[0]?.role === 'Invitado') {
//       // Si el usuario está en una ruta permitida, permitir la navegación
//       const isAllowedPath = allowedPathsguestUser.some((path) => req.url.startsWith(path));

//       if (isAllowedPath) {
//         return NextResponse.next();
//       }

//       // Si el usuario está en una ruta restringida, redirigir a '/dashboard/document'
//       const isRestrictedPath = guestUser.some((path) => req.url.startsWith(path));

//       if (isRestrictedPath) {
//         redirectUrl.pathname = '/dashboard/document';
//         return NextResponse.redirect(redirectUrl);
//       }
//     }

//     if (guestRole?.[0]?.role === 'Administrador' && administradorUser.some((url) => req.url.includes(url))) {
//       redirectUrl.pathname = '/dashboard';
//       return NextResponse.redirect(redirectUrl.toString());
//     }
//     if (guestRole?.[0]?.role === 'Usuario' && usuarioUser.some((url) => req.url.includes(url))) {
//       redirectUrl.pathname = '/dashboard';
//       return NextResponse.redirect(redirectUrl.toString());
//     }
//   }
//   return response;
// }

// export const config = {
//   matcher: ['/dashboard/:path*', '/admin/:path*'],
// };

import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from './lib/supabase/server';
import { getUserProfile } from './shared/actions/middleware.actions';

// Sistema de caché simple con TTL
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minuto (ajustable según necesidad)

export async function middleware(req: NextRequest) {
  const supabase = supabaseServer();
  const response = NextResponse.next({
    request: { headers: req.headers },
  });

  // 1. Verificar sesión (siempre necesario)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Generar clave de caché única para este usuario
  const cacheKey = `user_${session.user.email}`;

  // Verificar si tenemos datos en caché
  let profileWithRelations: Awaited<ReturnType<typeof getUserProfile>>;
  if (cache.has(cacheKey) && cache.get(cacheKey).expires > Date.now()) {
    profileWithRelations = cache.get(cacheKey).data;
  } else {
    // 2. Obtener perfil, compañías propias y compartidas en una sola consulta

    profileWithRelations = await getUserProfile();

    // Guardar en caché si tenemos datos
    if (profileWithRelations) {
      cache.set(cacheKey, {
        data: profileWithRelations,
        expires: Date.now() + CACHE_TTL,
      });
    }
  }

  // Si no tenemos perfil, redirigir al login
  if (!profileWithRelations) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Extraer datos relevantes
  const userRole = profileWithRelations.role;
  const ownedCompanies = profileWithRelations.company || [];
  const sharedCompanies = profileWithRelations.share_company_users || [];

  // Si el usuario es Admin, permitir acceso a todo
  if (userRole === 'Admin') {
    return response;
  }

  // Verificar si es Auditor
  if (userRole === 'Auditor') {
    if (!req.url.includes('admin/auditor')) {
      return NextResponse.redirect(new URL('/auditor', req.url));
    }
    return response;
  } else if (req.url.includes('admin/auditor')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Verificar si el usuario tiene acceso a alguna compañía
  if (ownedCompanies.length === 0 && sharedCompanies.length === 0 && !req.url.includes('/dashboard/company/new')) {
    return NextResponse.redirect(new URL('/dashboard/company/new', req.url));
  }

  // Obtener la compañía actual de las cookies
  const actualComp = req.cookies.get('actualComp')?.value?.replace(/^"|"$/g, '') || '';

  // Determinar el rol en la compañía actual
  let currentCompanyRole = null;

  // Verificar si es propietario
  if (ownedCompanies.some((company) => company.id === actualComp)) {
    currentCompanyRole = 'owner';
  } else {
    // Verificar si es usuario compartido
    const sharedCompany = sharedCompanies.find((company) => company.company_id === actualComp);
    if (sharedCompany) {
      currentCompanyRole = sharedCompany.role;
    }
  }

  // Restricciones para invitados
  if (currentCompanyRole === 'Invitado') {
    const restrictedPaths = [
      '/dashboard/employee/action?action=edit',
      '/dashboard/employee/action?action=new',
      '/dashboard/equipment/action?action=edit',
      '/dashboard/equipment/action?action=new',
      '/dashboard/company/new',
      '/dashboard/company/actualCompany',
    ];

    // Si la URL actual está restringida, redirigir
    if (restrictedPaths.some((path) => req.url.includes(path))) {
      return NextResponse.redirect(new URL('/dashboard/document', req.url));
    }

    // Permitir acceso solo a rutas específicas
    const allowedPaths = ['/dashboard/document', '/dashboard/employees', '/dashboard/equipment'];
    if (!allowedPaths.some((path) => req.url.includes(path))) {
      return NextResponse.redirect(new URL('/dashboard/document', req.url));
    }
  }

  // Restricciones para Administrador
  if (currentCompanyRole === 'Administrador' && req.url.includes('admin/auditor')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Restricciones para Usuario
  if (
    currentCompanyRole === 'Usuario' &&
    (req.url.includes('/dashboard/company/actualCompany') || req.url.includes('admin/auditor'))
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
