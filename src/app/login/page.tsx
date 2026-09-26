import { LoginForm } from '@/features/Auth/components/LoginForm';
import { BRAND_NAME } from '@/shared/lib/branding';
import Link from 'next/link';

/**
 * Pantalla de ingreso — bloque `login-03` de shadcn: tarjeta centrada sobre fondo `muted`.
 *
 * Reemplaza al layout partido con el banner lateral (`RenderBanner`), que sigue en pie en las
 * pantallas de recupero de contraseña.
 */
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <span className="text-brand text-2xl font-bold tracking-tight lowercase">{BRAND_NAME}</span>
        </Link>
        <LoginForm error={error} />
      </div>
    </div>
  );
}
