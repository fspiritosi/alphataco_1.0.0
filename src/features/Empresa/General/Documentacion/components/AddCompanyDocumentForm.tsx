'use client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { formatDocumentTypeName } from '@/lib/utils/utils';
import { useCountriesStore } from '@/store/countries';
import { useLoggedUserStore } from '@/store/loggedUser';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
function AddCompanyDocumentForm({
  documentId,
  documentIsUploaded,
  redirectId,
  documentTypeName,
  documentTypeExplired,
  documentTypeMontlhy,
}: {
  documentId: string;
  redirectId: string;
  documentIsUploaded: boolean;
  /** Nombre del tipo de documento — si se pasa, evita buscar en el store */
  documentTypeName?: string;
  /** Si el tipo de documento vence */
  documentTypeExplired?: boolean;
  /** Si el tipo de documento es mensual */
  documentTypeMontlhy?: boolean;
}) {
  const companyDocumentTypes = (useCountriesStore((state) => state.companyDocumentTypes) ?? []).filter(
    (e) => e.applies === 'Empresa'
  );
  const user = useLoggedUserStore((state) => state.credentialUser?.id);
  const actualCompany = useLoggedUserStore((state) => state.actualCompany);
  const companyId = actualCompany?.id ?? Cookies.get('actualComp');
  // Si se pasaron props directas, usarlas; si no, buscar en el store
  const documentForId = documentTypeName
    ? {
        id: documentId,
        name: documentTypeName,
        explired: documentTypeExplired ?? false,
        is_it_montlhy: documentTypeMontlhy ?? false,
      }
    : companyDocumentTypes.find((e) => e.id === documentId);
  const fetchDocuments = useLoggedUserStore((state) => state.documetsFetch);
  const router = useRouter();
  const FormSchema = z.object({
    id_document_types: z.string({
      required_error: 'Este campo es requerido',
    }),
    file: z.string({ required_error: 'Este campo es requerido' }),
    validity: documentForId?.explired ? z.string({ required_error: 'Este campo es requerido' }) : z.string().optional(),
    period: documentForId?.is_it_montlhy
      ? z.string({
          required_error: 'Este campo es requerido',
        })
      : z.string().optional(),
  });
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      id_document_types: documentId,
    },
  });
  const [file, setFile] = useState<File | undefined>(undefined);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    toast.promise(
      async () => {
        if (!companyId) throw new Error('No se pudo identificar la empresa actual');

        const supabase = supabaseBrowser();

        // Fallback: obtener userId de supabase auth si el store no lo tiene
        let userId = user;
        if (!userId) {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          userId = authUser?.id;
        }
        if (!userId) throw new Error('No se pudo identificar el usuario actual');

        // Obtener datos de la empresa del store o de la BD si el store no está hidratado
        let companyName = actualCompany?.company_name;
        let companyCuit = actualCompany?.company_cuit;
        if (!companyName || !companyCuit) {
          const { data: companyData } = await supabase
            .from('company')
            .select('company_name, company_cuit')
            .eq('id', companyId)
            .single();
          companyName = companyData?.company_name ?? companyName ?? 'empresa';
          companyCuit = companyData?.company_cuit ?? companyCuit ?? 'sin-cuit';
        }
        const companyFolder = `${companyName.toLowerCase().replace(/ /g, '-')}-(${companyCuit})`;

        const formatedDocumentTypeName = formatDocumentTypeName(documentForId?.name || '');
        const hasExpiredDate = data.validity?.replace(/\//g, '-') ?? 'v0';
        const { data: DuplicatedDocument } = await supabase.storage
          .from('document-files')
          .list(`${companyFolder}/empresa`, {
            search: `${formatedDocumentTypeName}-(${hasExpiredDate})`,
          });
        if (DuplicatedDocument?.length && DuplicatedDocument?.length > 0) {
          throw new Error('Este documento ya se encuentra subido');
        }
        const fileExtension = data.file.split('.').pop();
        if (!file) throw new Error('No se ha subido el archivo');
        await supabase.storage
          .from('document-files')
          .upload(`/${companyFolder}/empresa/${formatedDocumentTypeName}-(${hasExpiredDate}).${fileExtension}`, file, {
            cacheControl: '3600',
            upsert: false,
          })
          .then(async (response) => {
            const { file, ...rest } = data;
            const allData = {
              ...rest,
              validity: data.validity ? format(data.validity.replaceAll('-', '/'), 'dd/MM/yyyy') : null,
              user_id: userId,
              created_at: new Date().toISOString(),
              state: 'presentado',
              document_path: response.data?.path,
            };

            const { error } = await supabase
              .from('documents_company')
              .update(allData as any)
              .eq('applies', companyId)
              .eq('id_document_types', documentId);

            if (error) {
              await supabase.storage.from('document-files').remove([response.data?.path || '']);
              throw error;
            }
            fetchDocuments();
            router.refresh();
          });
      },
      {
        loading: 'Subiendo documento',
        success: () => {
          document.getElementById('cerrar-modal-company-document')?.click();
          return 'Documento subido con exito';
        },
        error: (error) => {
          return error instanceof Error ? error.message : String(error);
        },
      }
    );
  }

  return documentIsUploaded ? (
    <Link
      className={cn(buttonVariants({ variant: 'outline' }), 'min-w-full')}
      href={`/dashboard/document/${redirectId}?resource=Empresa`}
    >
      Ver documento
    </Link>
  ) : (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="min-w-full">Subir</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Subir documento</AlertDialogTitle>
          <AlertDialogDescription>Rellena el siguiente formulario para subir el documento</AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className=" space-y-6">
            <FormField
              control={form.control}
              name="id_document_types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de documento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipos de documento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypeName ? (
                        <SelectItem key={documentId} value={documentId}>
                          {documentTypeName}
                        </SelectItem>
                      ) : (
                        companyDocumentTypes.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, onChange, ...fieldRest } }) => (
                <FormItem>
                  <FormLabel>Archivo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Elegir Archivo"
                      type="file"
                      {...fieldRest}
                      onChange={(event) => {
                        setFile(event.target.files?.[0]);
                        onChange(event);
                      }}
                    />
                  </FormControl>
                  <FormDescription>Selecciona el archivo a subir</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {documentForId?.explired && (
              <FormField
                control={form.control}
                name="validity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de vencimiento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Elegir Archivo"
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Selecciona la fecha en la que vence el documento</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {documentForId?.is_it_montlhy && (
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Elegir Archivo"
                        type="month"
                        min={new Date().toISOString().split('T')[0]}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Este documento es mensual, debe ingrear el periodo al que corresponde
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end gap-4">
              <AlertDialogCancel id="cerrar-modal-company-document">Cancelar</AlertDialogCancel>
              <Button type="submit">Subir</Button>
            </div>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AddCompanyDocumentForm;
