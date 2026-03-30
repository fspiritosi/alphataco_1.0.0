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
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export const UpdateUserPasswordForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const router = useRouter();

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
        const result = await updatePasswordAction(values.password);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result;
      },
      {
        loading: 'Actualizando contraseña...',
        success: () => {
          return 'Tu contraseña ha sido cambiada con éxito. Ya puedes iniciar sesión con tu nueva contraseña.';
        },
        error: (error) => {
          return error.message || 'Error al cambiar la contraseña';
        },
        finally: () => {
          setShowLoader(false);
          router.push('/login');
        },
      }
    );
  };

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
