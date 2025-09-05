// src/app/reset_password/confirm/page.tsx
import { verifyResetToken } from '@/app/login/actions';
import RenderBanner from '@/components/RenderBanner';
import { UpdateUserPasswordForm } from '@/components/UpdateUserPasswordForm';
import { CardDescription, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ConfirmUserPassword({ searchParams }: PageProps) {
  const email = typeof searchParams.email === 'string' ? searchParams.email : '';
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';

  // Verificar el token si está presente
  let tokenValid = false;
  let tokenError = '';

  if (token && email) {
    const tokenVerification = await verifyResetToken(token, email);
    tokenValid = tokenVerification.success;
    if (!tokenValid) {
      tokenError = tokenVerification.error || 'Token inválido';
    }
  }

  return (
    <section className="min-h-screen overflow-hidden bg-white dark:bg-transparent">
      <div className="container relative flex-col grid-cols-1 justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 md:px-2 p-0">
        <RenderBanner />
        <div className="lg:p-8 relative z-50 md:p-8 pt-7 p-0 flex flex-col justify-center items-center w-full">
          <Link className="relative z-20 lg:hidden items-center font-bold text-2xl flex" href="/">
            <Image
              src="https://zktcbhhlcksopklpnubj.supabase.co/storage/v1/object/public/logo/24417298440.png"
              alt="Logo de codecontrol"
              className="size-12 mr-4"
              width={120}
              height={120}
            />
            Grupo Horizonte
          </Link>
          <div className="w-full overflow-y-auto">
            <CardTitle className="text-3xl font-semibold tracking-tight lg:text-left text-center mb-2">
              {token && email ? 'Establece tu nueva contraseña' : 'Solicitud inválida'}
            </CardTitle>

            {token && email ? (
              tokenValid ? (
                <>
                  <CardDescription className="text-pretty mb-9 text-black/70 text-md lg:text-left text-center">
                    Por razones de seguridad, es necesario que crees una nueva contraseña. Esto solo te lo pediremos en
                    tu primer inicio de sesión. Elije una contraseña que sea fácil de recordar para vos. Debe contener
                    un mínimo de 6 caracteres, 1 mayúscula, 1 minúscula, 1 numero y 1 símbolo.
                  </CardDescription>
                  <UpdateUserPasswordForm email={email} token={token} />
                </>
              ) : (
                <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 font-medium">Enlace inválido o expirado</p>
                  <p className="text-red-500 text-sm mt-2">{tokenError}</p>
                  <p className="text-gray-600 text-sm mt-4">
                    Por favor, solicita un nuevo enlace de recuperación de contraseña.
                  </p>
                </div>
              )
            ) : (
              <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-600 font-medium">Faltan parámetros requeridos</p>
                <p className="text-gray-600 text-sm mt-2">
                  El enlace de recuperación debe incluir un token válido y dirección de email.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
