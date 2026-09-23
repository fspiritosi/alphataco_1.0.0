'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CloseEyeIcon } from '@/components/ui/icons/closeEye';
import { EyeIcon } from '@/components/ui/icons/openEye';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { updatePasswordAction } from '@/features/Auth/actions/auth-actions';
import { changePassSchema } from '@/shared/schemas/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

/**
 * Cierra el flujo de recuperación (y el de invitación, que usa el mismo tipo de token).
 *
 * El token llega por la URL: el enlace del mail apunta a `/api/auth/reset-password/<token>`,
 * que lo valida y redirige acá con `?token=`. Si no viene, el formulario no se muestra.
 */
export const UpdateUserPasswordForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const tokenError = searchParams.get('error');

  const form = useForm<z.infer<typeof changePassSchema>>({
    resolver: zodResolver(changePassSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof changePassSchema>) => {
    setShowLoader(true);

    toast.promise(
      async () => {
        const result = await updatePasswordAction(values.password, token);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result;
      },
      {
        loading: 'Actualizando contraseña...',
        success: () => {
          router.push('/login');
          return 'Tu contraseña ha sido cambiada con éxito. Ya puedes iniciar sesión con tu nueva contraseña.';
        },
        error: (error) => {
          return error.message || 'Error al cambiar la contraseña';
        },
        finally: () => {
          setShowLoader(false);
        },
      }
    );
  };

  if (!token || tokenError) {
    return (
      <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-medium">Enlace inválido o expirado</p>
        <p className="text-gray-600 text-sm mt-4">Pedí un enlace nuevo desde “¿Olvidaste tu contraseña?”.</p>
        <a href="/reset_password" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Solicitar nuevo enlace
        </a>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Contraseña</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="contraseña segura"
                    autoComplete="new-password"
                    className="text-lg"
                    {...field}
                  />
                </FormControl>
                <Toggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  variant={'outline'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <CloseEyeIcon /> : <EyeIcon />}
                </Toggle>
              </div>
              <FormDescription className="text-lg">Ingresa tu nueva contraseña.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Confirmar contraseña</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="contraseña segura"
                    autoComplete="new-password"
                    className="text-lg"
                    {...field}
                  />
                </FormControl>
                <Toggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  variant={'outline'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <CloseEyeIcon /> : <EyeIcon />}
                </Toggle>
              </div>
              <FormDescription className="text-lg">Ingresa tu nueva contraseña otra vez.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={showLoader}>
          {showLoader ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
        </Button>
      </form>
    </Form>
  );
};
