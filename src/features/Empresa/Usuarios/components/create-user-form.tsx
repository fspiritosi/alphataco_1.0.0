'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { registerUserWithRole } from '@/features/Auth/actions/register-user';
import { Logger } from '@/lib/logger';
import { useLoggedUserStore } from '@/store/loggedUser';
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAllRoles } from '../hooks/useUserRoles';

const passwordSchema = z
  .string()
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  .max(50, { message: 'La contraseña debe tener menos de 50 caracteres.' })
  .regex(/[A-Z]/, {
    message: 'La contraseña debe tener al menos una mayúscula.',
  })
  .regex(/[a-z]/, {
    message: 'La contraseña debe tener al menos una minúscula.',
  })
  .regex(/[0-9]/, { message: 'La contraseña debe tener al menos un número.' })
  .regex(/[^A-Za-z0-9]/, {
    message: 'La contraseña debe tener al menos un carácter especial.',
  });

const createUserSchema = (isInvite: boolean) =>
  z
    .object({
      firstname: isInvite
        ? z.string().optional()
        : z
            .string()
            .min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
            .max(30, { message: 'El nombre debe tener menos de 30 caracteres.' })
            .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/, {
              message: 'El nombre solo puede contener letras.',
            })
            .trim(),
      lastname: isInvite
        ? z.string().optional()
        : z
            .string()
            .min(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
            .max(30, { message: 'El apellido debe tener menos de 30 caracteres.' })
            .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/, {
              message: 'El apellido solo puede contener letras.',
            })
            .trim(),
      email: z.string().email({ message: 'Email inválido' }),
      password: isInvite ? z.string().optional() : passwordSchema,
      confirmPassword: isInvite ? z.string().optional() : passwordSchema,
      role: z.string({ required_error: 'El rol es requerido' }).min(1, {
        message: 'Debes seleccionar un rol.',
      }),
    })
    .refine((data) => isInvite || data.password === data.confirmPassword, {
      message: 'Las contraseñas no coinciden.',
      path: ['confirmPassword'],
    });

const logger = new Logger('CreateUserForm');

interface CreateUserFormProps {
  onSuccess?: () => void;
  onCancel: () => void;
}

export function CreateUserForm({ onSuccess, onCancel }: CreateUserFormProps) {
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'createUser' | 'inviteUser'>('createUser');

  const router = useRouter();
  const company = cookies.get('actualComp');
  const ownerUser = useLoggedUserStore((state) => state.profile);
  const FetchSharedUsers = useLoggedUserStore((state) => state.FetchSharedUsers);

  const { data: roles, isLoading: isLoadingRoles } = useAllRoles();

  const isInvite = activeTab === 'inviteUser';

  const form = useForm({
    resolver: zodResolver(createUserSchema(isInvite)),
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: '',
    },
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'createUser' | 'inviteUser');
    form.reset();
  };

  const onSubmit = async (values: z.infer<ReturnType<typeof createUserSchema>>) => {
    if (values?.email?.trim().toLowerCase() === ownerUser?.[0]?.email?.toLowerCase()) {
      toast.error('No puedes compartir la empresa contigo mismo');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Procesando solicitud...');

    try {
      const result = await registerUserWithRole(values);

      if (result.success) {
        toast.success(result.message, { id: toastId });
        FetchSharedUsers();
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(result.error || 'Error al procesar la solicitud', {
          id: toastId,
        });
      }
    } catch (error) {
      logger.error('Error inesperado al crear usuario', { data: { error } });
      toast.error('Ocurrió un error inesperado', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const RoleSelector = () => (
    <FormField
      control={form.control}
      name="role"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Rol</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {isLoadingRoles ? (
                <SelectItem value="loading" disabled>
                  Cargando roles...
                </SelectItem>
              ) : !roles || roles.length === 0 ? (
                <SelectItem value="empty" disabled>
                  No hay roles disponibles
                </SelectItem>
              ) : (
                roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="w-full">
        <TabsTrigger className="w-1/2" value="createUser">
          Crear usuario
        </TabsTrigger>
        <TabsTrigger className="w-1/2" value="inviteUser">
          Invitar usuario
        </TabsTrigger>
      </TabsList>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <TabsContent value="createUser" className="mt-0 space-y-4">
            <FormField
              control={form.control}
              name="firstname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Escribe el nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Escribe el apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ejemplo@correo.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="Ingresa una contraseña segura"
                        type={showPasswords ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <Toggle
                      pressed={showPasswords}
                      onPressedChange={setShowPasswords}
                      variant="outline"
                      aria-label="Mostrar contraseña"
                    >
                      {showPasswords ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </Toggle>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar contraseña</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="Repite la contraseña"
                        type={showPasswords ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <Toggle
                      pressed={showPasswords}
                      onPressedChange={setShowPasswords}
                      variant="outline"
                      aria-label="Mostrar contraseña"
                    >
                      {showPasswords ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </Toggle>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <RoleSelector />
          </TabsContent>

          <TabsContent value="inviteUser" className="mt-0 space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ejemplo@correo.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <RoleSelector />
          </TabsContent>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : isInvite ? 'Invitar usuario' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}
