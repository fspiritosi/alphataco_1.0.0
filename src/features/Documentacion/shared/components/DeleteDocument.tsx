'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { deleteDocumentFile } from '@/features/Documentacion/shared/actions/document-files.server';
import { cn } from '@/lib/utils';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function DeleteDocument({
  documentName,
  resource,
  id,
  expires,
}: {
  documentName: string | null;
  resource: string | null;
  id: string;
  expires: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const FormSchema = z.object({
    delete_document: z.string({ required_error: 'El documento es requerido' }).refine((value) => value === 'ELIMINAR', {
      message: 'Debe ingresar la palabra ELIMINAR para eliminar el documento',
    }),
  });
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      delete_document: '',
    },
  });
  const router = useRouter();

  async function onSubmit() {
    await toast
      .promise(
        async () => {
          if (!documentName) return;
          // Borrado del archivo y reseteo de las filas en el servidor (perímetro por empresa).
          const result = await deleteDocumentFile({ id, resource: resource ?? '' });
          if (!result.ok) throw new Error(result.error);

          router.refresh();
          setIsOpen(false);
        },
        {
          loading: 'Eliminando...',
          success: 'Documento eliminado correctamente',
          error: (error: Error) => error.message,
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  }
  return (
    <Dialog open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <DialogTrigger asChild>
        <Button variant={'destructive'}>Eliminar</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] dark:bg-slate-950">
        <DialogHeader>
          <DialogTitle>Eliminar documento</DialogTitle>
        </DialogHeader>
        <div className="grid w-full gap-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className=" space-y-6">
              <div className="flex flex-col">
                <FormField
                  control={form.control}
                  name="delete_document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Ingresa la palabra <span className="text-red-700">ELIMINAR</span> para eliminar el documento
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={cn(
                            field.value === 'ELIMINAR' ? 'border border-green-500 ' : 'border border-red-500'
                          )}
                          placeholder="Ingresa la palabra ELIMINAR"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-blue-500 flex items-center">
                  <InfoCircledIcon className="size-7 inline-block mr-2" />
                  <FormDescription className="text-blue-500 mt-4">
                    Este nuevo documento será eliminado y no podra ser recuperado. Asegurate de que sea el correcto.
                  </FormDescription>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  className="self-end mt-5"
                  disabled={form.formState.isSubmitting}
                >
                  Eliminar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
