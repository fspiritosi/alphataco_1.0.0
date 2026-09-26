'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateProfileFullname } from '@/features/Empresa/Usuarios/mutations.server';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const logger = new Logger('EditUserNameDialog');

const editUserNameSchema = z.object({
  fullname: z
    .string()
    .trim()
    .min(1, 'El nombre es requerido')
    .max(150, 'El nombre no puede superar los 150 caracteres'),
});

type EditUserNameFormValues = z.infer<typeof editUserNameSchema>;

interface EditUserNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  currentFullname: string | null;
  employeeFullname: string | null;
}

export function EditUserNameDialog({
  open,
  onOpenChange,
  profileId,
  currentFullname,
  employeeFullname,
}: EditUserNameDialogProps) {
  const router = useRouter();

  const form = useForm<EditUserNameFormValues>({
    resolver: zodResolver(editUserNameSchema),
    defaultValues: { fullname: currentFullname ?? '' },
  });

  // Sync form al abrir el dialog con el valor actual del profile.
  useEffect(() => {
    if (open) {
      form.reset({ fullname: currentFullname ?? '' });
    }
  }, [open, currentFullname, form]);

  const handleUseEmployeeName = () => {
    if (!employeeFullname) return;
    form.setValue('fullname', employeeFullname, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  };

  async function onSubmit(values: EditUserNameFormValues) {
    try {
      await updateProfileFullname(profileId, values.fullname);
      toast.success('Nombre actualizado correctamente');
      router.refresh();
      onOpenChange(false);
    } catch (error) {
      logger.error('Error actualizando nombre', { data: { error, profileId } });
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el nombre');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-semibold tracking-tight">Editar nombre</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Modifica el nombre que se mostrará para este usuario en toda la plataforma.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="fullname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="name" placeholder="Ej: Juan Pérez" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {employeeFullname && (
              <button
                type="button"
                onClick={handleUseEmployeeName}
                className="group flex w-full items-start gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Wand2
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Usar nombre del empleado
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">{employeeFullname}</span>
                </div>
              </button>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="brand" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
