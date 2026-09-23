'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { operatorLogin } from '@/features/OperatorPanel/actions/session.server';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, HardHat, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const logger = new Logger('OperatorPanel/LoginForm');

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contrasena es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await operatorLogin(data.email, data.password);

      if (result.error) {
        setServerError(result.error);
        logger.warn('Login failed', { data: { email: data.email } });
        return;
      }

      if (result.success) {
        logger.info('Login successful');
        router.push('/operator/dashboard');
      }
    } catch (error) {
      logger.error('Login error', { data: { error } });
      setServerError('Error inesperado. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Company branding */}
      <div className="flex items-center gap-2.5 self-center font-medium">
        <Image src="/gh_logo.png" alt="Logo de Grupo Horizonte" width={36} height={36} className="rounded-md" />
        <span className="text-lg font-semibold">Grupo Horizonte</span>
      </div>

      {/* Login card */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Panel de Operario</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder al taller</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-6">
              {/* Role indicator */}
              <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/60 py-2.5 text-sm text-muted-foreground">
                <HardHat className="h-4 w-4" />
                <span>Acceso exclusivo para operarios de taller</span>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu-email@ejemplo.com"
                    autoComplete="email"
                    disabled={isLoading}
                    className="h-12 text-base"
                    {...register('email')}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Contrasena</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Tu contrasena"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-12 text-base"
                    {...register('password')}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
              </div>

              {serverError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive font-medium">{serverError}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iniciando sesion...
                  </>
                ) : (
                  'Iniciar Sesion'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-balance px-8 text-center text-xs text-muted-foreground">
        Si no tienes acceso, contacta al jefe de taller o administrador
      </p>
    </div>
  );
}
