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
import { createCategory } from '../actions/categories.server';

const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre de la categoría debe tener al menos 2 caracteres' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddCategoryModalProps {
  covenantInfo: { name: string; id: string };
  fromEmployee?: boolean;
}

/**
 * Alta de categoría dentro de un convenio. Sin lógica de datos: `category` no tiene
 * `company_id`, el perímetro lo resuelve la action contra el convenio padre.
 */
export default function AddCategoryModal({ covenantInfo, fromEmployee = false }: AddCategoryModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createCategory({ name: values.name, covenant_id: covenantInfo.id }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Categoría creada exitosamente');
      form.reset();
      setOpen(false);
      router.refresh();
    },
    onError: () => toast.error('Ocurrió un error al crear la categoría'),
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
        <Button variant={fromEmployee ? 'default' : 'link'} className={fromEmployee ? 'w-full' : undefined}>
          <Plus className="h-4 w-4" />
          Nueva categoria
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Agregar categoria al convenio <span className="font-bold">{covenantInfo?.name}</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Por favor complete los siguientes campos para agregar una nueva categoria.
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
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la categoria" {...field} />
                      </FormControl>
                      <FormDescription>Ingrese el nombre de la categoria que desea agregar</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-4">
                  <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Creando...' : 'Crear categoria'}
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
