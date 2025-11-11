'use client';

import { cn } from '@/lib/utils';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { CheckIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
// import type React from 'react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from './ui/button';
import { CardDescription } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { handleSupabaseError } from '@/lib/errorHandler';
import { formatDocumentTypeName } from '@/lib/utils/utils';
import { fetchCurrentCompany } from '@/shared/actions/company.actions';
import { useLoggedUserStore } from '@/store/loggedUser';
import moment from 'moment';
import { toast } from 'sonner';
// import { supabase } from '../../supabase/supabase';
import { supabaseBrowser } from '@/lib/supabase/browser';
import React from 'react';
import { AlertDialogCancel } from './ui/alert-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';

export default function SimpleDocument({
  resource,
  handleOpen,
  defaultDocumentId,
  document,
  numberDocument,
}: {
  resource: string | undefined;
  handleOpen: () => void;
  defaultDocumentId?: string;
  document?: string;
  numberDocument?: string;
}) {
  const supabase = supabaseBrowser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();
  const documentDrawerEmployees = useLoggedUserStore((state) => state.documentDrawerEmployees);
  const documentDrawerVehicles = useLoggedUserStore((state) => state.documentDrawerVehicles);
  const [actualCompany, setActualCompany] = useState<Awaited<ReturnType<typeof fetchCurrentCompany>>>(null);
  const [employees, setEmployees] = useState<any[] | null>([]);
  const [vehicles, setVehicles] = useState<any[] | null>([]);
  const [documenTypes, setDocumentTypes] = useState<any[] | null>([]);
  const searchParams = useSearchParams();
  const documentResource = searchParams.get('document');
  const id = searchParams.get('id');
  const user = useLoggedUserStore((state) => state.credentialUser?.id);

  useEffect(() => {
    if (!actualCompany) {
      fetchCurrentCompany().then((data) => {
        if (data) {
          setActualCompany(data);
        }
      });
    }
  }, [actualCompany]);

  const [idAppliesUser, setIdAppliesUser] = useState<any>(null);

  useEffect(() => {
    const appliesUser =
      (employees?.find(
        (employee: any) => employee.document === documentResource || employee.document === numberDocument
      ) as string) || (vehicles?.find((vehicle: any) => vehicle.id === numberDocument) as string);

    setIdAppliesUser(appliesUser);
    console.log(appliesUser);
    console.log(numberDocument);
    console.log(employees);
    console.log(documentResource);
    console.log(employees?.find((emp) => emp.document === document));
  }, [numberDocument, employees, documentResource, vehicles]);

  const form = useForm({
    defaultValues: {
      applies: idAppliesUser?.id?.toString() || idAppliesUser?.document?.toString() || '',
      id_document_types: defaultDocumentId ?? '',
      validity: '',
      user_id: user,
      period: '',
      file: null as File | null,
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    setValue,
  } = form;

  useEffect(() => {
    // Solo cuando hay datos y numberDocument/documentResource
    if (numberDocument || documentResource) {
      const empleado = employees?.find(
        (employee: any) => employee.document === numberDocument || employee.document === documentResource
      );
      const vehiculo = vehicles?.find((vehicle: any) => vehicle.id === numberDocument);
      if (empleado) {
        setValue('applies', empleado.id.toString());
      } else if (vehiculo) {
        setValue('applies', vehiculo.id.toString());
      }
    }
  }, [employees, vehicles, numberDocument, documentResource, setValue]);

  const [loading, setLoading] = useState(false);
  const [allTypesDocuments, setAllTypesDocuments] = useState<any[] | null>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setValue('file', file);

    // Limpiar error de archivo si existe
    if (file && errors.file) {
      clearErrors('file');
    }
  };

  const onSubmit = async (formData: any) => {
    // Validar que el archivo sea obligatorio
    if (!selectedFile) {
      setError('file', {
        type: 'required',
        message: 'El archivo es obligatorio',
      });
      return;
    }

    toast.promise(
      async () => {
        setLoading(true);

        const idApplies =
          id ||
          employees?.find((employee: any) => employee.document === documentResource)?.id ||
          (vehicles?.find((vehicle: any) => vehicle.id === numberDocument) as string);

        const updateEntry = {
          applies: formData.applies || idApplies,
          id_document_types: formData.id_document_types,
          validity: formData.validity ? moment(formData.validity).utc().format('YYYY-MM-DD HH:mm:ss+00') : null,
          user_id: user,
          created_at: new Date(),
          period: formData.period,
        };

        const appliesName: any =
          (employees?.find(
            (employee: any) => employee.id === formData.applies || employee.id === formData.applies
          ) as string) || (vehicles?.find((vehicle: any) => vehicle.id === formData.applies) as string);

        if (!appliesName) throw new Error('No se encontro el recurso');

        // Get file extension from the File object name property
        const fileName = selectedFile.name;
        const fileExtension = fileName.split('.').pop();

        const tableName =
          resource === 'empleado'
            ? 'documents_employees'
            : resource === 'equipo'
              ? 'documents_equipment'
              : 'documents_company';

        const period = formData.period;
        const hasExpiredDate = updateEntry?.validity?.replace(/\//g, '-') || period || 'v0';
        const documetType = documenTypes?.find((e) => e.id === formData.id_document_types);
        const formatedCompanyName = actualCompany?.[0]?.company_name.toLowerCase().replace(/ /g, '-');
        const formatedAppliesName = appliesName
          ? `${appliesName?.name.toLowerCase().replace(/ /g, '-').replace('ñ', 'n')}-(${appliesName?.document})`
          : `${idAppliesUser?.name.toLowerCase().replace(/ /g, '-').replace('ñ', 'n')}-(${idAppliesUser?.document})`;
        const formatedDocumentTypeName = formatDocumentTypeName(documetType?.name);
        const formatedAppliesPath = documetType.applies.toLowerCase().replace(/ /g, '-');

        // Verificar si el documento ya existe
        const { data, error: errorList } = await supabase.storage
          .from('document-files')
          .list(`${formatedCompanyName}-(${actualCompany?.[0]?.company_cuit})/${formatedAppliesPath}/`, {
            search: `${formatedAppliesName}/${formatedDocumentTypeName}`,
          });

        if (errorList) {
          console.error(errorList);
        }

        if (data?.length && data?.length > 0) {
          //revisar si esta siendo usado en la tabla de documentos
          const { data: document, error: errorDocument } = await supabase
            .from(tableName)
            .select('*')
            .eq(
              'document_path',
              `${formatedCompanyName}-(${actualCompany?.[0]?.company_cuit})/${formatedAppliesPath}/${formatedAppliesName}/${formatedDocumentTypeName}-(${hasExpiredDate}).${fileExtension}`
            );

          if (document?.length) {
            setError('id_document_types', {
              message: 'El documento ya ha sido subido anteriormente',
              type: 'validate',
            });
            setLoading(false);
            throw new Error('El documento ya ha sido subido anteriormente');
          }
        }

        // Subir el archivo
        const { data: response, error } = await supabase.storage
          .from('document-files')
          .upload(
            `${formatedCompanyName}-(${actualCompany?.[0]?.company_cuit})/${formatedAppliesPath}/${formatedAppliesName}/${formatedDocumentTypeName}-(${hasExpiredDate}).${fileExtension}`,
            selectedFile,
            {
              cacheControl: '0',
              upsert: true,
            }
          );

        if (error) {
          setLoading(false);
          console.error(error);
          throw new Error(handleSupabaseError(error.message));
        }

        const isMandatory = documenTypes?.find((doc) => doc.id === updateEntry.id_document_types)?.mandatory;

        if (isMandatory) {
          const data = {
            validity: updateEntry.validity,
            document_path: response?.path,
            state: 'presentado',
            period: updateEntry.period || null,
          };

          const { error, data: userupdated } = await supabase
            .from(tableName)
            .update(data as any)
            .eq('applies', typeof idApplies === 'object' ? idApplies?.id : idApplies || updateEntry.applies)
            .eq('id_document_types', updateEntry.id_document_types);

          if (error) {
            setLoading(false);
            console.error(error);
            //Eliminar el documento
            await supabase.storage.from('document-files').remove([response?.path]);
            throw new Error('Hubo un error al subir los documentos a la base de datos');
          }
        } else {
          const { error } = await supabase.from(tableName).insert({
            validity: updateEntry.validity,
            document_path: response?.path,
            created_at: new Date(),
            state: 'presentado',
            applies: idApplies || updateEntry.applies,
            id_document_types: updateEntry.id_document_types,
            user_id: user,
            period: updateEntry.period || null,
          } as any);

          if (error) {
            setLoading(false);
            console.error(error);
            //Eliminar el documento
            await supabase.storage.from('document-files').remove([response?.path]);
            throw new Error('Hubo un error al guardar el documento');
          }
        }

        setLoading(false);
        if (document) {
          documentDrawerEmployees(document);
        }
        if (id) {
          documentDrawerVehicles(id);
        }
        router.refresh();
        handleOpen();
      },
      {
        loading: 'Subiendo...',
        success: () => {
          handleOpen();
          setLoading(false);
          router.refresh();
          // Reset file input correctly
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setSelectedFile(null);
          return 'Documento subido correctamente';
        },
        error: (error) => {
          setLoading(false);
          return error.message || error;
        },
      }
    );
    //cerrar el modal
  };

  const fetchDocumentTypes = async () => {
    const applies = resource === 'empleado' ? 'Persona' : 'Equipos';
    const { data: document_types, error } = await supabase
      .from('document_types')
      .select('*')
      .eq('applies', applies)
      .eq('is_active', true);

    setDocumentTypes(document_types);
    setAllTypesDocuments(document_types);
  };

  const fetchEmployees = async () => {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id,document_number,lastname,firstname')
      .eq('is_active', true);
    if (error) {
      setEmployees([]);
      return;
    }
    // Transformar al formato esperado
    const formatted = (employees || []).map((act) => ({
      name: act.firstname + ' ' + act.lastname,
      document: act.document_number,
      id: act.id,
    }));
    setEmployees(formatted);
    setFilteredResources(formatted);
  };

  const fetchVehicles = async () => {
    const { data: vehicles, error } = await supabase.from('vehicles').select('domain,serie,id').eq('is_active', true);
    if (error) {
      setVehicles([]);
      return;
    }
    // Transformar al formato esperado
    const formatted = (vehicles || []).map((act: any) => ({
      name: act.domain || act.serie,
      document: act.serie || act.domain,
      id: act.id,
    }));
    setVehicles(formatted);
  };

  useEffect(() => {
    fetchDocumentTypes();
    if (resource === 'empleado') {
      fetchEmployees();
    } else {
      fetchVehicles();
    }
  }, [resource]);

  const today = new Date();

  const data = resource === 'empleado' ? employees : vehicles;
  const [filteredResources, setFilteredResources] = useState(data);
  const [inputValue, setInputValue] = useState<string>('');
  const [hasExpired, setHasExpired] = useState(false);
  const [isMontlhy, setIsMontlhy] = useState(false);
  const [openResourceSelector, setOpenResourceSelector] = useState(false);

  useEffect(() => {
    const documentInfo = documenTypes?.find((documentType) => documentType.id === defaultDocumentId);
    setHasExpired(documentInfo?.explired);
    setIsMontlhy(documentInfo?.is_it_montlhy);
  }, [defaultDocumentId, documenTypes]);

  const [openDocumentTypePopover, setOpenDocumentTypePopover] = useState(false);

  const handleTypeFilter = (value: string) => {
    if (value === 'Ambos') setDocumentTypes(allTypesDocuments);
    if (value === 'Permanentes') setDocumentTypes(allTypesDocuments?.filter((e) => !e.is_it_montlhy) || []);
    if (value === 'Mensuales') setDocumentTypes(allTypesDocuments?.filter((e) => e.is_it_montlhy) || []);
  };

  const handleNestedFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={handleNestedFormSubmit}>
        <div className="space-y-4">
          {!documentResource && (
            <div className="space-y-2 py-3">
              <Label className="block">{resource === 'equipo' ? 'Equipos' : 'Empleados'}</Label>
              <Controller
                render={({ field }) => {
                  const selectedResourceName = data?.find((resource: any) => resource.id === field.value)?.name;

                  return (
                    <Popover
                      open={openResourceSelector}
                      onOpenChange={() => {
                        setOpenResourceSelector(!openResourceSelector);
                      }}
                    >
                      <PopoverTrigger disabled={numberDocument || id ? true : false} asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(' justify-between w-full', !field.value && 'text-muted-foreground')}
                        >
                          {field.value && selectedResourceName
                            ? data?.find(
                                (employee: any) => employee.id === field.value || employee.name === field.value
                              )?.name
                            : `Seleccionar ${resource === 'equipo' ? 'equipo' : 'empleado'}`}
                          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className=" p-0">
                        <Command>
                          <CommandInput
                            placeholder={`Buscar ${resource === 'equipo' ? 'equipo' : 'empleado'}`}
                            className="h-9"
                            onFocus={() => {
                              setFilteredResources(data);
                            }}
                            onInput={(e) => {
                              const inputValue = (e.target as HTMLInputElement).value.toLowerCase();
                              setInputValue(inputValue);
                              const isNumberInput = /^\d+$/.test(inputValue);
                              const filteredresources = data?.filter((person: any) => {
                                if (isNumberInput) {
                                  return person.document?.includes(inputValue);
                                } else {
                                  return (
                                    person.name?.toLowerCase().includes(inputValue) ||
                                    person.document?.includes(inputValue)
                                  );
                                }
                              });
                              setFilteredResources(filteredresources || []);
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {filteredResources?.length === 0 &&
                                inputValue?.length > 0 &&
                                'No se encontraron resultados'}
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredResources?.map((employee: any) => {
                                const key = /^\d+$/.test(inputValue) ? employee.document : employee.name;
                                const value = /^\d+$/.test(inputValue) ? employee.document : employee.name;

                                return (
                                  <CommandItem
                                    value={value}
                                    key={crypto.randomUUID()}
                                    onSelect={() => {
                                      const id = data?.find(
                                        (resource: any) => resource.name === value || resource.document === value
                                      ).id;

                                      field.onChange(id);
                                      setOpenResourceSelector(!openResourceSelector);
                                    }}
                                  >
                                    {employee.name}
                                    <CheckIcon
                                      className={cn(
                                        'ml-auto h-4 w-4',
                                        employee.name === field.value || employee.document === field.value
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                }}
                name="applies"
                control={control}
                rules={!id || !documentResource ? { required: 'Este campo es requerido' } : {}}
              />
              <CardDescription>
                Selecciona el {resource === 'equipo' ? 'equipo' : 'empleado'} al que deseas vincular el documento
              </CardDescription>
              {errors.applies?.message && (
                <CardDescription className="text-red-700 mt-0 m-0">{(errors as any).applies.message}</CardDescription>
              )}
            </div>
          )}

          <div className="space-y-2">
            {!defaultDocumentId && (
              <ToggleGroup
                defaultValue={'ambos'}
                type="single"
                variant="outline"
                className="w-full flex-col items-start mb-4 gap-y-3"
                onValueChange={(value) => {
                  handleTypeFilter(value);
                }}
              >
                <Label>Filtrar tipos de documentos</Label>
                <div className="flex gap-4">
                  <ToggleGroupItem value="Ambos">Ambos</ToggleGroupItem>
                  <ToggleGroupItem value="Permanentes">Permanentes</ToggleGroupItem>
                  <ToggleGroupItem value="Mensuales">Mensuales</ToggleGroupItem>
                </div>
              </ToggleGroup>
            )}
            <Label>Seleccione el tipo de documento a vincular al recurso</Label>
            <Controller
              render={({ field }) => (
                <Popover open={openDocumentTypePopover} onOpenChange={setOpenDocumentTypePopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn('justify-between w-full', !field.value && 'text-muted-foreground')}
                    >
                      {field.value
                        ? documenTypes?.find((documenType) => documenType.id === field.value)?.name
                        : 'Seleccionar documento'}
                      <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 overflow-y-auto max-h-[50vh]">
                    <div>
                      <Command className="p-2">
                        <CommandInput placeholder="Buscar documento" className="h-9" />
                        <CommandList>
                          <CommandEmpty>Documento no encontrado</CommandEmpty>
                          <CommandGroup>
                            {documenTypes?.map((documentType) => (
                              <CommandItem
                                value={documentType.name}
                                key={documentType.id}
                                onSelect={(e: string) => {
                                  const selected = documenTypes?.find(
                                    (doc) => doc.name.toLowerCase() === e.toLocaleLowerCase()
                                  );

                                  setHasExpired(selected.explired);
                                  setIsMontlhy(selected.is_it_montlhy);

                                  clearErrors('id_document_types');
                                  setValue('id_document_types', selected?.id);
                                  setOpenDocumentTypePopover(false);
                                }}
                              >
                                {documentType.name}
                                <CheckIcon
                                  className={cn(
                                    'ml-auto h-4 w-4',
                                    documentType.id === field.value ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              name="id_document_types"
              control={control}
              rules={{
                required: 'Este campo es requerido',
              }}
            />
            {errors.id_document_types && (
              <CardDescription className="text-red-700 m-0">{errors.id_document_types.message}</CardDescription>
            )}
          </div>

          <div className="space-y-2">
            <Label>Documento *</Label>
            <Input
              id="file-input"
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {selectedFile && <p className="text-sm text-muted-foreground">Archivo seleccionado: {selectedFile.name}</p>}
            <CardDescription>Sube el documento que deseas vincular a los recursos</CardDescription>
            {errors.file && <CardDescription className="text-red-700 mt-0">{errors.file.message}</CardDescription>}
          </div>

          {hasExpired && (
            <FormField
              control={control}
              name="validity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de vencimiento *</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" placeholder="Seleccione la fecha de vencimiento" />
                  </FormControl>
                  <FormMessage />
                  <CardDescription>La fecha de vencimiento del documento</CardDescription>
                </FormItem>
              )}
            />
          )}

          {isMontlhy && (
            <div className="space-y-2">
              <div className="flex flex-col gap-3">
                <Label>Periodo</Label>
                <Controller
                  render={({ field }) => (
                    <Input
                      placeholder="Seleccionar periodo"
                      type="month"
                      min={new Date().toISOString().split('T')[0]}
                      onChange={field.onChange}
                    />
                  )}
                  name="period"
                  control={control}
                  rules={isMontlhy ? { required: 'Falta seleccionar el periodo' } : undefined}
                />
              </div>
              {errors.period && (
                <CardDescription className="text-red-700 mt-0">{errors.period.message}</CardDescription>
              )}
              <CardDescription>El documento es mensual, debe seleccioar el periodo al que aplica</CardDescription>
            </div>
          )}

          <Separator />
        </div>

        <div className="flex justify-evenly mt-4">
          <AlertDialogCancel className="text-black dark:bg-white hover:text-black/50" asChild>
            <Button type="button" onClick={() => handleOpen()}>
              Cancelar
            </Button>
          </AlertDialogCancel>

          <Button disabled={loading} type="submit">
            {loading ? 'Enviando' : 'Enviar documento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
