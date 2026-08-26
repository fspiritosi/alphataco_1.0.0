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
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useLoggedUserStore } from '@/shared/store/loggedUser';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface AddCategoryModalProps {
  covenantInfo: { name: string; id: string };
  fromEmployee?: boolean;
  company_id?: string;
}

export default function AddCategoryModal({
  covenantInfo,
  fromEmployee = false,
  company_id: propCompanyId,
}: AddCategoryModalProps) {
  const router = useRouter();
  const storeCompanyId = useLoggedUserStore((state) => state.actualCompany?.id);
  const company_id = propCompanyId ?? storeCompanyId;

  const supabase = supabaseBrowser();
  const formSchema = z.object({
    name: z.string({ required_error: 'El nombre es requerido' }).min(2, {
      message: 'El nombre de la categoria debe tener al menos 2 caracteres',
    }),
    covenant_id: z
      .string()
      .default(covenantInfo?.id || '')
      .optional(),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      covenant_id: covenantInfo?.id,
    },
  });
  async function onSubmit({ name, covenant_id }: z.infer<typeof formSchema>) {
    await toast
      .promise(
        async () => {
          const normalizedName = name.slice(0, 1).toUpperCase() + name.slice(1);

          // Guarda contra duplicados dentro del mismo convenio: el mismo nombre en
          // otro convenio es valido, repetirlo en este no (ticket 616).
          const { data: existing } = await supabase
            .from('category')
            .select('id, name')
            .eq('covenant_id', covenant_id ?? '')
            .ilike('name', normalizedName.trim())
            .limit(1);
          if (existing && existing.length > 0) {
            throw new Error(`Ya existe la categoría "${existing[0].name}" en este convenio.`);
          }

          const { data, error } = await supabase
            .from('category')
            .insert([
              {
                name: normalizedName,
                covenant_id,
              },
            ])
            .select();
          if (error) throw new Error(error.message);
          document.getElementById('close-category-modal')?.click();
          router.refresh();
        },
        {
          loading: 'Creando categoria...',
          success: 'Categoria creada exitosamente',
          error: (error) => (error instanceof Error ? error.message : 'Ocurrio un error al crear la categoria'),
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  }
  const handleNestedFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit(onSubmit)(event);
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {fromEmployee ? (
          <Button className="w-full">
            {' '}
            <Plus className="h-4 w-4" />
            Nueva categoria
          </Button>
        ) : (
          <Button variant={'link'}>
            {' '}
            <Plus className="h-4 w-4" />
            Nueva categoria
          </Button>
        )}
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
                  <AlertDialogCancel id="close-category-modal">Cancelar</AlertDialogCancel>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    Crear categoria
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
