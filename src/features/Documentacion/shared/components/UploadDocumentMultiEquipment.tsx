'use client';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { EnhancedDatePicker } from '@/components/ui/enhanced-datepicket';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { YearMonthPicker } from '@/components/ui/year-month-picker';
import { calculateNameOFDocument, cn, getAllDocumentsByIdDocumentTypeCientSide } from '@/lib/utils';
import { uploadMultiResourceDocument } from '@/features/Documentacion/shared/actions/upload-multiresource-document';
import { Logger } from '@/lib/logger';
import { fetchCurrentCompany } from '@/shared/actions/company.actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Check, ChevronsUpDown } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const logger = new Logger('Documentacion/UploadDocumentMultiEquipment');

function UploadDocumentMultiEquipment({
  equipments,
  allDocumentTypes,
  currentCompany,
  user_id,
}: {
  equipments: { label: string; value: string }[];
  allDocumentTypes: DocumentTypes[];
  currentCompany: Awaited<ReturnType<typeof fetchCurrentCompany>>;
  user_id: string | undefined;
}) {
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [selectedDocumentType, setSelectedDocumentType] = useState<(typeof allDocumentTypes)[0] | undefined>(undefined);
  const uploadDocumentSchema = z.object({
    applies: z.array(
      z
        .string({
          required_error: 'Este campo es requerido',
        })
        .uuid()
    ),
    document_path: z.string({
      required_error: 'Este campo es requerido',
    }),
    created_at: z.string().default(() => new Date().toISOString()),
    state: z.enum(['pendiente', 'presentado', 'rechazado', 'aprobado', 'vencido']).default('presentado'),
    validity: selectedDocumentType?.explired
      ? z.string({
          required_error: 'Este campo es requerido',
        })
      : z.string().optional(), //! esto debe ser dinamico
    id_document_types: z
      .string({
        required_error: 'Este campo es requerido',
      })
      .uuid(),
    period: selectedDocumentType?.is_it_montlhy
      ? z.string({
          required_error: 'Este campo es requerido',
        })
      : z.string().optional(),
    // N° de póliza: siempre opcional, solo visible si el tipo lo lleva
    policy_number: z.string().optional(),
  });
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof uploadDocumentSchema>>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      applies: [],
    },
  });
  const [documenTypes, setDocumentTypes] = useState<typeof allDocumentTypes>(allDocumentTypes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function onSubmit(data: z.infer<typeof uploadDocumentSchema>) {
    if (!selectedFile) {
      toast.error('Debe seleccionar un archivo');
      return;
    }
    if (!data.applies?.length) {
      toast.error('Debe seleccionar al menos un recurso');
      return;
    }

    setIsSubmitting(true);
    try {
      // Persistencia server-side (Prisma + transaccion): evita la URL gigante de .in([cientos])
      // y completa solo los recursos faltantes. La server action sube el archivo y, si la
      // transaccion falla, lo revierte (compensacion).
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('resource', 'equipo');
      fd.append('documentTypeId', data.id_document_types);
      fd.append('appliesIds', JSON.stringify(data.applies));
      fd.append('sharedPath', data.document_path);
      if (user_id) fd.append('userId', user_id);
      if (data.validity) fd.append('validity', data.validity);
      if (data.period) fd.append('period', data.period);
      if (data.policy_number) fd.append('policyNumber', data.policy_number);

      const res = await uploadMultiResourceDocument(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(`Documento cargado (${res.updated + res.created} recursos)`);
      form.reset();
      setSelectedFile(undefined);
      setSelectedDocumentType(undefined);
      setSelectedFileName('');
      // Refrescar la tabla de fondo: invalidar React Query (client-side mode) ademas
      // de router.refresh() para las tablas del sistema viejo (SSR).
      queryClient.invalidateQueries();
      router.refresh();
      document.getElementById('close-create-document-modal')?.click();
    } catch (error) {
      logger.error('Error al cargar documento multirecurso de equipos', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el documento');
    } finally {
      setIsSubmitting(false);
    }
  }
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedResourceDocuments, setSelectedResourceDocuments] = useState<{ applies: string | null }[]>([]);

  return (
    <div>
      <CardTitle className="mb-3">Documento multirecurso</CardTitle>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto max-h-[80vh]">
          <FormField
            control={form.control}
            name="id_document_types"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Tipo de documento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(' justify-between', !field.value && 'text-muted-foreground')}
                      >
                        {field.value
                          ? allDocumentTypes.find((documentType) => documentType.id === field.value)?.name
                          : 'Seleccionar tipo de documento'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-full">
                    <Command>
                      <CommandInput placeholder="Buscar tipo de documento" />
                      <CommandList>
                        <CommandEmpty>
                          Sin resultados para <strong>{field.value}</strong>
                        </CommandEmpty>
                        <CommandGroup>
                          {documenTypes.map((documentType) => (
                            <CommandItem
                              value={documentType.id}
                              key={documentType.name}
                              onSelect={async (selectedValue) => {
                                const data = await getAllDocumentsByIdDocumentTypeCientSide(
                                  selectedValue,
                                  documentType.company_id ?? '',
                                  'documents_equipment'
                                );
                                setSelectedResourceDocuments(data);
                                form.setValue('id_document_types', documentType.id);
                                setSelectedDocumentType(documentType);
                                form.setValue('validity', undefined);
                                form.setValue('period', undefined);
                                setSelectedFile(undefined);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  documentType.id === field.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {documentType.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>Seleccione el tipo de documento que desea cargar al equipo</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="applies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipos</FormLabel>
                <FormControl>
                  <MultiSelectCombobox
                    showSelectAll
                    selectedResourceDocuments={selectedResourceDocuments}
                    options={equipments.map((equipment) => ({
                      value: equipment.value,
                      label: equipment.label,
                    }))}
                    placeholder="Selecciona recursos"
                    emptyMessage="No se encontraron recursos."
                    selectedValues={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>Selecciona al menos dos recursos para vincular el documento.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {selectedDocumentType?.explired && (
            <FormField
              control={form.control}
              name="validity"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de validez</FormLabel>
                  <FormControl>
                    <EnhancedDatePicker
                      date={field.value as any}
                      setDate={(date) => field.onChange(date?.toISOString())}
                    />
                  </FormControl>
                  <FormDescription>Seleccione la fecha de validez del documento</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {selectedDocumentType?.is_it_montlhy && (
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Período</FormLabel>
                  <FormControl>
                    <YearMonthPicker
                      date={field.value ? new Date(field.value) : undefined}
                      setDate={(date) => {
                        if (date) {
                          field.onChange(format(date, 'yyyy-MM'));
                        } else {
                          field.onChange(undefined);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>Seleccione el período del documento</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {selectedDocumentType?.has_policy_number && (
            <FormField
              control={form.control}
              name="policy_number"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>N° de póliza</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese el N° de póliza (opcional)" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Identificador opcional del documento (ej: número de póliza del seguro)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="document_path"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Documento</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      readOnly
                      value={selectedFileName || field.value || 'Ningún archivo seleccionado'}
                      className={cn('flex-grow', !field.value && 'text-muted-foreground')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!form.getValues('applies') || !form.getValues('id_document_types')}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          setSelectedFile(file);
                          if (file) {
                            const documentName = documenTypes.find(
                              (documentType) => documentType.id === form.getValues('id_document_types')
                            )?.name;
                            const documenExtension = file.name.split('.').pop();
                            if (!equipments?.length || !documentName || !documenExtension) return;
                            setSelectedFileName(file.name);
                            const period = form.getValues('period');
                            const expiredDate = form.getValues('validity')
                              ? moment(form.getValues('validity')).format('DD-MM-YYYY')
                              : null;
                            const hasExpiredDate = expiredDate || period || 'v0';

                            const documentUrl = calculateNameOFDocument(
                              currentCompany?.[0].company_name || '',
                              currentCompany?.[0].company_cuit || '',
                              'equipos',
                              documentName,
                              hasExpiredDate,
                              documenExtension,
                              'multirecursos'
                            );

                            field.onChange(documentUrl);
                          }
                        };
                        input.click();
                      }}
                    >
                      Seleccionar archivo
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>Seleccione el documento que desea cargar</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-around">
            <Button
              type="button"
              variant={'destructive'}
              disabled={isSubmitting}
              onClick={() => {
                form.reset();
                setSelectedFile(undefined);
                setSelectedDocumentType(undefined);
                document.getElementById('close-create-document-modal')?.click();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default UploadDocumentMultiEquipment;
