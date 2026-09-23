import { RecoveryPasswordForm } from '@/features/Auth/components/RecoveryPasswordForm';

import { CardTitle } from '@/components/ui/card';
import RenderBanner from '@/features/Auth/components/RenderBanner';
import Image from 'next/image';
import Link from 'next/link';
/** Logo servido desde el bucket público de Supabase Storage. P3: storage */
const LOGO_URL = 'https://zktcbhhlcksopklpnubj.supabase.co/storage/v1/object/public/logo/24417298440.png'; // P3: storage

export default function PasswordRecovery() {
  return (
    <section className="min-h-screen overflow-hidden bg-white dark:bg-transparent">
      <div className="container relative flex-col grid-cols-1 justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0  md:px-2 p-0">
        <RenderBanner />
        <div className="lg:p-8 relative z-50   md:p-8 pt-7 p-0 flex flex-col justify-center items-center w-full">
          <Link className="relative z-20 lg:hidden items-center font-bold text-2xl flex" href="/">
            <Image
              src={LOGO_URL}
              alt="Logo de codecontrol"
              className="size-12 mr-4"
              width={120}
              height={120}
            />
            Grupo Horizonte
          </Link>
          <div className="w-full overflow-y-auto ">
            <CardTitle className="text-3xl font-semibold tracking-tight lg:text-left text-center mb-5 text-balance">
              ¿Olvidaste tu contraseña? No te preocupes, te ayudaremos a restablecerla.
            </CardTitle>
            <RecoveryPasswordForm />
          </div>
        </div>
      </div>
    </section>
  );
}
