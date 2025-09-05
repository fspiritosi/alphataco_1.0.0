'use client';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { recoveryPassSchema } from '@/zodSchemas/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from './ui/button';
import { Input } from './ui/input';

export const RecoveryPasswordForm = () => {
  const [showLoader, setShowLoader] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof recoveryPassSchema>>({
    resolver: zodResolver(recoveryPassSchema),
    defaultValues: {
      email: '',
    },
  });

  const sendResetEmail = async (email: string) => {
    try {
      const response = await fetch('/api/auth/resend-reset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el email de recuperación');
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const onSubmit = async (values: z.infer<typeof recoveryPassSchema>) => {
    setShowLoader(true);

    toast.promise(sendResetEmail(values.email), {
      loading: 'Enviando enlace de recuperación...',
      success: () => {
        setEmailSent(true);
        return 'Si existe una cuenta con ese email, recibirás un correo con instrucciones seguras para restablecer tu contraseña.';
      },
      error: (error) => {
        return error.message || 'Error al enviar el email de recuperación';
      },
      finally: () => {
        setShowLoader(false);
      },
    });
  };

  if (emailSent) {
    return (
      <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-green-600 font-medium text-lg mb-2">✓ Solicitud enviada exitosamente</div>
        <p className="text-green-700 mb-4">
          Hemos enviado un enlace seguro a <strong>{form.getValues('email')}</strong>. Revisa tu bandeja de entrada y
          sigue las instrucciones para restablecer tu contraseña.
        </p>
        <p className="text-gray-600 text-sm">
          ¿No recibiste el email?{' '}
          <button
            type="button"
            onClick={() => setEmailSent(false)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Reenviar
          </button>
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <FormLabel className="text-lg">Email</FormLabel>
              <FormControl>
                <Input
                  className="text-lg"
                  placeholder="email@hotmail.com"
                  type="email"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-lg">
                Ingresa tu email para recibir un enlace seguro y recuperar tu contraseña.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={showLoader} className="w-full">
          {showLoader ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar enlace de recuperación'
          )}
        </Button>

        <div className="text-center text-sm text-gray-600">
          <p>
            ¿Recordaste tu contraseña?{' '}
            <a href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Iniciar sesión
            </a>
          </p>
        </div>
      </form>
    </Form>
  );
};
