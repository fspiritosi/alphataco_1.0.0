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
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createCovenant } from '../actions/covenants.server';

const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre del convenio debe tener al menos 2 caracteres' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddCovenantModalProps {
  guildInfo: { name: string; id: string };
  fromEmployee?: boolean;
}

/**
 * Alta de convenio dentro de un sindicato. Sin lógica de datos: `createCovenant` valida el
 * sindicato contra la empresa activa y rechaza el duplicado dentro de ese sindicato.
 */
export default function AddCovenantModal({ guildInfo, fromEmployee = false }: AddCovenantModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createCovenant({ name: values.name, guild_id: guildInfo.id }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Convenio creado exitosamente');
      form.reset();
      setOpen(false);
      router.refresh();
    },
    onError: () => toast.error('Ocurrió un error al crear el convenio'),
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
        <Button variant={fromEmployee ? 'default' : 'outline'} className={fromEmployee ? 'w-full' : undefined}>
          <Plus className="h-4 w-4" />
          Nuevo convenio
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Agregar nuevo convenio al sindicato <span className="font-bold">{guildInfo?.name}</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Por favor complete los siguientes campos para agregar un nuevo Convenio.
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
                      <FormLabel>Convenio</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del convenio" {...field} />
                      </FormControl>
                      <FormDescription>Ingrese el nombre del convenio que desea agregar</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-4">
                  <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Creando...' : 'Crear convenio'}
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
