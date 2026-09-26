'use client';
import { Button } from '@/components/ui/button';
import { GoogleIcon } from '@/components/ui/icons/google';
import { googleLogin } from '@/features/Auth/actions/login-actions';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

/**
 * Login con Google. El servidor arma la URL del proveedor y redirige; el `callbackURL` es una
 * ruta relativa de la app, no la manda el navegador.
 */
function GoogleButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      variant="outline"
      type="submit"
      className="w-full"
      disabled={pending}
      formAction={async () => {
        const result = await googleLogin('/dashboard');
        if (result?.error) {
          toast.error(result.error);
        }
      }}
    >
      <span className="mr-2">
        {' '}
        <GoogleIcon />
      </span>{' '}
      {pending ? 'Cargando...' : 'Iniciar sesión con Google'}
    </Button>
  );
}

export default GoogleButton;
