'use client';
import { Button } from '@/components/ui/button';
import { loginSchema } from '@/zodSchemas/schemas';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { login } from '../actions';

export const LoginButton = () => {
  const { pending } = useFormStatus();
  const router = useRouter();

  const clientAccion = async (formData: FormData) => {
    const values = Object.fromEntries(formData.entries());
    const result = await loginSchema.safeParseAsync(values);

    Object.keys(values).forEach((key) => {
      const element = document.getElementById(`${key}_error`);
      if (element) {
        element.innerText = '';
      }
    });

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const element = document.getElementById(`${issue.path}_error`);
        if (element) {
          element.innerText = issue.message; //->mensaje de error
          element.style.color = 'red';
        }
      });

      Object.keys(values).forEach((key) => {
        if (!result.error.issues.some((issue) => issue.path.includes(key))) {
          const element = document.getElementById(`${key}_error`);
          if (element) {
            element.innerText = '';
          }
        }
      });
      return;
    }
    toast.promise(
      async () => {
        const data: any = await login(formData);
        if (data.error) {
          console.error(data.error);
          throw new Error(data.error);
        }
        return 'success';
      },
      {
        loading: 'Iniciando Sesión...',
        success: () => {
          router.push('/dashboard');
          return '¡Bienvenido!';
        },
        error: (error) => {
          console.error(error, 'este es el error');
          return error?.message || 'Error desconocido';
        },
      }
    );
  };
  return (
    <Button
      className="w-[100%] sm:w-[80%] lg:w-[60%] self-center text-lg"
      formAction={(formData) => clientAccion(formData)}
      disabled={pending}
      data-testid="login-submit-button"
    >
      {pending ? 'Cargando...' : 'Iniciar Sesión'}
    </Button>
  );
};
