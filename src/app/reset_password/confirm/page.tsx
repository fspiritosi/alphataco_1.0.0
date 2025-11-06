// src/app/reset_password/confirm/page.tsx
import RenderBanner from '@/components/RenderBanner';
import { CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ConfirmUserPassword({ searchParams }: PageProps) {
  const error = typeof searchParams.error === 'string' ? searchParams.error : '';

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
              {error ? 'Enlace inválido o expirado' : 'Procesando solicitud...'}
            </CardTitle>

            {error === 'invalid_token' ? (
              <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-medium">Enlace inválido o expirado</p>
                <p className="text-gray-600 text-sm mt-4">
                  Por favor, solicita un nuevo enlace de recuperación de contraseña.
                </p>
                <Link
                  href="/reset_password"
                  className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Solicitar nuevo enlace
                </Link>
              </div>
            ) : (
              <div className="text-center p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-600 font-medium">Verificando enlace...</p>
                <p className="text-gray-600 text-sm mt-2">Por favor espera mientras procesamos tu solicitud.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
