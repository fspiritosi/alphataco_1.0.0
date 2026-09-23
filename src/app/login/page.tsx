import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import GoogleButton from '@/features/Auth/components/GoogleButton';
import { LoginButton } from '@/features/Auth/components/LoginButton';
import RenderBanner from '@/features/Auth/components/RenderBanner';
import { isGoogleLoginEnabled } from '@/shared/lib/auth';
import Image from 'next/image';
import Link from 'next/link';
export default async function Login() {
  return (
    <section className="min-h-screen overflow-hidden bg-white dark:bg-transparent">
      <div className="container relative flex-col grid-cols-1 justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0  md:px-2 p-0">
        <RenderBanner />
        <div className="lg:p-8 relative z-50   md:p-8 pt-7 p-0 flex flex-col justify-center items-center w-full">
          <Link className="relative z-20 lg:hidden items-center font-bold text-2xl flex" href="/">
            <Image src="/gh_logo.png" alt="Logo de codecontrol" className=" mr-4" width={120} height={120} />
            Grupo Horizonte
          </Link>
          <div className="w-full overflow-y-auto ">
            <CardHeader>
              <CardTitle className="text-3xl font-semibold tracking-tight lg:text-left text-center">
                ¡Es un placer verte de nuevo!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-8 flex flex-col w-full">
                <div className="w-full space-y-2">
                  <Label htmlFor="email" className="text-lg">
                    Email
                  </Label>
                  <Input
                    placeholder="ejemplo@correo.com"
                    autoComplete="email"
                    id="email"
                    name="email"
                    type="email"
                    className="text-lg"
                    data-testid="login-email-input"
                  />
                  <CardDescription className="text-lg" id="email_error">
                    Por favor ingresa tu correo.
                  </CardDescription>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-lg">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="mi contraseña segura"
                    className="text-lg"
                    autoComplete="current-password"
                    data-testid="login-password-input"
                  />
                  <CardDescription className="text-lg" id="password_error">
                    Por favor ingresa tu contraseña.
                  </CardDescription>
                </div>
                <div className="flex w-full justify-center flex-col items-center gap-2">
                  <LoginButton />
                </div>
                <Separator orientation="horizontal" className="my-2 w-[70%] self-center" />
                <Link href="/reset_password" className="text-md m-auto">
                  ¿Olvidaste tu contraseña? <span className="text-gh_orange ml-1 ">restablecela aquí </span>
                </Link>
                {/* Sin GOOGLE_CLIENT_ID/SECRET el proveedor no está configurado y el botón no
                    tendría a dónde redirigir: por eso se muestra sólo si está habilitado. */}
                {isGoogleLoginEnabled && <GoogleButton />}
              </form>
            </CardContent>
          </div>
        </div>
      </div>
    </section>
  );
}
