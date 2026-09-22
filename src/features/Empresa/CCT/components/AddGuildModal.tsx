'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createGuild } from '../actions/guilds.server';

const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre del sindicato debe tener al menos 2 caracteres' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddGuildModalProps {
  fromEmployee?: boolean;
}

/**
 * Alta de sindicato. El modal no consulta ni escribe datos: delega en `createGuild`, que
 * resuelve la empresa activa en el servidor (nunca viaja un `company_id` desde el cliente).
 */
export default function AddGuildModal({ fromEmployee = false }: AddGuildModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: createGuild,
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Sindicato creado exitosamente');
      form.reset();
      setOpen(false);
      router.refresh();
    },
    onError: () => toast.error('Ocurrió un error al crear el sindicato'),
  });

  // El modal se abre desde un árbol que a veces vive dentro de otro form: el submit no puede burbujear.
  const handleNestedFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit((values) => mutation.mutateAsync(values))(event);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button className={cn(fromEmployee && 'w-full')}>
          <Plus className="h-4 w-4" />
          Nuevo sindicato
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Agregar Asociación Gremial</AlertDialogTitle>
          <AlertDialogDescription>
            Por favor complete los siguientes campos para agregar una nueva Asociación Gremial.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <div className="flex flex-col justify-center w-full">
            <Form {...form}>
              <form onSubmit={handleNestedFormSubmit} className="space-y-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sindicato</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del sindicato" {...field} />
                      </FormControl>
                      <FormDescription>Ingrese el nombre del sindicato que desea agregar</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-4">
                  <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Creando...' : 'Crear sindicato'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
