import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GoogleButton from '@/features/Auth/components/GoogleButton';
import { LoginButton } from '@/features/Auth/components/LoginButton';
import { cn } from '@/lib/utils';
import { isGoogleLoginEnabled } from '@/shared/lib/auth';
import Link from 'next/link';

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  /** `googleLogin()` manda a `/login?error=oauth` cuando el callback de Google falla. */
  error?: string;
}

/**
 * Formulario de ingreso — bloque `login-03` de shadcn adaptado al login de la app.
 *
 * Diferencias con el bloque original, todas por cómo funciona el sistema:
 * - No hay "Login with Apple": el único proveedor social configurado es Google, y sólo aparece
 *   si hay credenciales (`isGoogleLoginEnabled`); sin ellas se va también el separador.
 * - No hay "Sign up": el alta de usuarios la hace un administrador (`disableSignUp`).
 * - No hay pie de Términos y Privacidad: esas páginas no existen.
 *
 * Los `<p id="email_error">` / `<p id="password_error">` NO son decorativos: `LoginButton`
 * valida con Zod en el cliente y escribe los mensajes ahí por `getElementById`. Si se les
 * cambia el id, la validación deja de mostrar errores sin que nada falle.
 */
export function LoginForm({ className, error, ...props }: LoginFormProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">¡Es un placer verte de nuevo!</CardTitle>
          <CardDescription>Ingresá con tu correo y contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          {error === 'oauth' && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              No pudimos iniciar sesión con Google. Si es la primera vez que entrás, pedile a un
              administrador de tu empresa que te dé de alta: el sistema no crea cuentas solo.
            </div>
          )}
          <form>
            <div className="grid gap-6">
              {isGoogleLoginEnabled && (
                <>
                  <div className="flex flex-col gap-4">
                    <GoogleButton />
                  </div>
                  <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                    <span className="bg-card text-muted-foreground relative z-10 px-2">O continuá con</span>
                  </div>
                </>
              )}

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    autoComplete="email"
                    data-testid="login-email-input"
                  />
                  <p id="email_error" className="text-sm" />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Contraseña</Label>
                    <Link
                      href="/reset_password"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Tu contraseña"
                    autoComplete="current-password"
                    data-testid="login-password-input"
                  />
                  <p id="password_error" className="text-sm" />
                </div>

                <LoginButton />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-xs text-balance">
        ¿No tenés cuenta? El alta la hace un administrador de tu empresa.
      </p>
    </div>
  );
}
