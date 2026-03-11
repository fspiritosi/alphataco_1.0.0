'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { handleSupabaseError } from '@/lib/errorHandler';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { formatDocumentTypeName } from '@/lib/utils/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { PersonIcon } from '@radix-ui/react-icons';
import type { Row } from '@tanstack/react-table';
import { CalendarDays, CalendarIcon } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { RepairSolicitudListItem } from '../actions.server';
import { repairStateColors, repairStateIcons } from '../utils/constants';

// ============================================================================
// TYPES
// ============================================================================

interface RepairEquipmentDialogProps {
  row: Row<RepairSolicitudListItem>;
}

// ============================================================================
// STATUSES (valores de BD con espacios — no los del enum Prisma con underscore)
// ============================================================================

const statuses = [
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Esperando repuestos', label: 'Esperando repuestos' },
  { value: 'En reparación', label: 'En reparación' },
  { value: 'Finalizado', label: 'Finalizado' },
  { value: 'Cancelado', label: 'Cancelado' },
  { value: 'Rechazado', label: 'Rechazado' },
  { value: 'Programado', label: 'Programado' },
];

const ENDING_STATES = ['Finalizado', 'Cancelado', 'Rechazado'];

// ============================================================================
// FETCH HELPERS
// ============================================================================

async function fetchRepairsByEquipment(equipmentId: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('repair_solicitudes')
    .select('id,state,reparation_type(*)')
    .eq('equipment_id', equipmentId);

  if (error) return [];
  return data ?? [];
}

/** Carga user_images y mechanic_images via Supabase (tolerante con nulls en arrays) */
async function fetchSolicitudImages(solicitudId: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('repair_solicitudes')
    .select('user_images, mechanic_images')
    .eq('id', solicitudId)
    .single();

  if (error || !data) return { user_images: [] as string[], mechanic_images: [] as string[] };
  return {
    user_images: ((data.user_images as (string | null)[] | null) ?? []).filter((s): s is string => !!s),
    mechanic_images: ((data.mechanic_images as (string | null)[] | null) ?? []).filter((s): s is string => !!s),
  };
}

type RepairByEquipmentItem = Awaited<ReturnType<typeof fetchRepairsByEquipment>>[number];

/**
 * Mapea valores de BD (con espacios/acentos) a claves del enum Prisma (con underscore).
 * Necesario para lookup de iconos/colores que usan las claves Prisma.
 */
function mapDbStateToPrisma(dbState: string): string {
  const mapping: Record<string, string> = {
    Pendiente: 'Pendiente',
    'Esperando repuestos': 'Esperando_repuestos',
    'En reparación': 'En_reparaci_n',
    Finalizado: 'Finalizado',
    Rechazado: 'Rechazado',
    Cancelado: 'Cancelado',
    Programado: 'Programado',
  };
  return mapping[dbState] ?? dbState;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RepairEquipmentDialog({ row }: RepairEquipmentDialogProps) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const original = row.original;

  // Estado actual de la solicitud (valor de BD con espacios)
  const dbState = mapPrismaStateToDb(original.state);

  const [imageUrl, setImageUrl] = useState<string[]>([]);
  const [imagesMechanic, setImagesMechanic] = useState<(string | null)[]>([]);
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [files, setFiles] = useState<(File | undefined)[]>([undefined, undefined, undefined]);
  const [status, setStatus] = useState<string>(dbState);
  const [repairLogs, setRepairLogs] = useState(original.repairlogs);
  const [repairSolicitudes, setRepairSolicitudes] = useState<Awaited<ReturnType<typeof fetchRepairsByEquipment>>>([]);

  const FormSchema = z.object({
    mechanic_description:
      dbState !== status && status !== 'Programado'
        ? z
            .string({ required_error: 'La descripción es requerida.' })
            .min(3, { message: 'La descripción debe tener al menos 3 caracteres.' })
            .max(200, { message: 'La descripción debe tener menos de 200 caracteres.' })
        : z.string().optional(),
    kilometer: z.string().refine(
      (value) => {
        if (value) {
          return Number(value) >= Number(original.kilometer ?? '0');
        }
        return true;
      },
      {
        message: `El kilometraje no puede ser menor al actual (${original.kilometer ?? '0'})`,
      }
    ),
    scheduled:
      status === 'Programado'
        ? z.date({ required_error: 'Ingrese la fecha para la cual está programada la reparación' })
        : z.date().optional(),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      mechanic_description: '',
      kilometer: original.kilometer ?? '0',
    },
  });

  // Cargar logs y solicitudes del mismo equipo
  useEffect(() => {
    setRepairLogs(original.repairlogs);
    fetchRepairsByEquipment(original.vehicles?.id || '').then(setRepairSolicitudes);
  }, [original.repairlogs]);

  // Estado para imágenes raw de la BD (cargadas lazily via Supabase)
  const [rawUserImages, setRawUserImages] = useState<string[]>([]);
  const [rawMechanicImages, setRawMechanicImages] = useState<string[]>([]);

  // Cargar imágenes lazily via Supabase (no Prisma, porque Prisma falla con nulls en String[])
  useEffect(() => {
    fetchSolicitudImages(original.id).then(({ user_images, mechanic_images }) => {
      setRawUserImages(user_images);
      setRawMechanicImages(mechanic_images);

      const modifiedStrings = user_images
        .map((str) => {
          const { data } = supabase.storage.from('repair-images').getPublicUrl(str.slice(1));
          return data.publicUrl;
        })
        .filter(Boolean);

      const modifiedStringsMechanic = mechanic_images
        .map((str) => {
          const { data } = supabase.storage.from('repair-images').getPublicUrl(str.slice(1));
          return data.publicUrl;
        })
        .filter(Boolean);

      setImagesMechanic(modifiedStringsMechanic);
      setImageUrl(modifiedStrings);
    });
  }, [original.id]);

  const [formattedToday] = useState(formatDocumentTypeName(new Date().toISOString()));

  const handleCardClick = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const newFiles = [...files];
        newFiles[index] = file;
        setFiles(newFiles);
        const reader = new FileReader();
        reader.onload = () => {
          const newImages = [...images];
          newImages[index] = reader.result as string;
          setImages(newImages);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const formatImages = (image: File | undefined, domain: string, index: number) => {
    if (!image) return;
    const maintenanceName = formatDocumentTypeName(original.types_of_repairs?.name || '');
    const str = rawUserImages[index];
    const regex = /\(([^)]+)\)/;
    const user_pictures_date = str?.match(regex);

    const formatedDomain = formatDocumentTypeName(domain);

    const url = `/${formatedDomain}/${maintenanceName}-(${user_pictures_date?.[1] ?? formattedToday.replaceAll('/', '-')})/mechanic-images/${index}`;

    return { url, image };
  };

  const combinedUpdate = async () => {
    const shouldUpdateStatus = status !== dbState;
    const shouldUpdateFiles = files.some((e) => e !== undefined);

    if (shouldUpdateStatus || shouldUpdateFiles) {
      const mechanic_imagesData = files.map((file, index) =>
        formatImages(file, original.vehicles?.domain ?? (original.vehicles?.serie || ''), index)
      );

      const mechanic_images = mechanic_imagesData.map((e) => e?.url);
      const vehicle_id = original.vehicles?.id;
      const mechanic_description = form.getValues('mechanic_description');

      const { error } = await supabase
        .from('repair_solicitudes')
        .update({
          state: status,
          mechanic_description,
          mechanic_images,
          kilometer: form.getValues('kilometer'),
          scheduled: form.getValues('scheduled'),
        } as Record<string, unknown>)
        .eq('id', original.id)
        .select();

      mechanic_imagesData
        .filter((e) => e)
        .forEach(async (e) => {
          if (!e) return;
          const { error } = await supabase.storage.from('repair-images').upload(e.url, e.image, { upsert: true });
          if (error) {
            throw new Error(handleSupabaseError(error.message));
          }
        });

      if (error) {
        throw new Error(handleSupabaseError(error.message));
      }

      // Recalcular condición del vehículo
      const pendingRepairs = repairSolicitudes
        .filter((e) => !ENDING_STATES.includes(e.state as string))
        .filter((e) => e.id !== original.id);

      const newStatus = calculateVehicleCondition(status, pendingRepairs, original.types_of_repairs?.criticity ?? null);

      await supabase
        .from('vehicles')
        .update({ condition: newStatus } as Record<string, unknown>)
        .eq('id', vehicle_id || '');
    }

    form.reset();
  };

  const handleSaveChanges = async () => {
    toast.promise(
      async () => {
        await combinedUpdate();
      },
      {
        loading: 'Guardando cambios',
        success: 'Cambios guardados',
        error: (error) => String(error),
      }
    );
    setStatus(dbState);

    document.getElementById('close-modal-repair-equipment')?.click();
    router.refresh();
  };

  function onSubmit() {
    handleSaveChanges();
  }

  const isFinalized = dbState === 'Finalizado' || dbState === 'Cancelado';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Reparar equipo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[50vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reparación de equipo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Info de la solicitud */}
          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label>Tipo de reparación</Label>
              <div className="font-medium">{original.types_of_repairs?.name}</div>
            </div>
            <div className="grid gap-2">
              <Label>Criticidad</Label>
              <Badge
                variant={
                  original.types_of_repairs?.criticity === 'Alta'
                    ? 'destructive'
                    : original.types_of_repairs?.criticity === 'Media'
                      ? 'yellow'
                      : 'outline'
                }
                className="w-fit"
              >
                {original.types_of_repairs?.criticity}
              </Badge>
            </div>
            <div className="grid gap-2">
              <Label>Descripción de la solicitud</Label>
              <div>{original.user_description}</div>
            </div>
            <div className="grid gap-2">
              <Label>Tipo de mantenimiento</Label>
              <Badge className="font-medium w-fit" variant="outline">
                {original.types_of_repairs?.type_of_maintenance}
              </Badge>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Fecha de solicitud
              </Label>
              <div className="font-medium">
                {original.scheduled ? moment(original.scheduled).format('DD/MM/YYYY') : '-'}
              </div>
            </div>
          </div>

          {/* Selector de estado */}
          <div className="grid gap-2">
            <Label>Estado</Label>
            <Select defaultValue={dbState} disabled={isFinalized} onValueChange={(valor) => setStatus(valor)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center">
                      <span>{s.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Formulario de cambio de estado */}
          {dbState !== status && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Form {...form}>
                  <form id="repair-equipment-form" onSubmit={form.handleSubmit(onSubmit)}>
                    {status !== 'Programado' && (
                      <>
                        <FormField
                          control={form.control}
                          name="mechanic_description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Informa al usuario acerca del nuevo estado"
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>Descripción del nuevo estado de la solicitud</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="kilometer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kilometraje</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Kilometraje" className="resize-none" {...field} />
                              </FormControl>
                              <FormDescription>Kilometraje del vehículo al momento de la reparación</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    {status === 'Programado' && (
                      <FormField
                        control={form.control}
                        name="scheduled"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha programada</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? (
                                      moment(field.value).format('DD/MM/YYYY')
                                    ) : (
                                      <span>Seleccionar fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value || new Date()}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>Fecha para la cual está programada la reparación</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </form>
                </Form>
              </div>
            </div>
          )}

          <Separator />

          {/* Datos del vehículo */}
          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label>Tipo de equipo</Label>
              <div className="font-medium">
                {original.vehicles?.type_vehicles_typeTotype?.name ?? 'No especificado'}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Año</Label>
              <div className="font-medium">{original.vehicles?.year}</div>
            </div>
            <div className="grid gap-2">
              <Label>Marca</Label>
              <div className="font-medium">{original.vehicles?.brand_vehicles?.name ?? '-'}</div>
            </div>
            <div className="grid gap-2">
              <Label>Modelo</Label>
              <div className="font-medium">{original.vehicles?.model_vehicles?.name ?? '-'}</div>
            </div>
            <div className="grid gap-2">
              <Label>{original.vehicles?.domain ? 'Dominio' : 'Serie'}</Label>
              <div className="font-medium">{original.vehicles?.domain ?? original.vehicles?.serie}</div>
            </div>
            <div className="grid gap-2">
              <Label>Motor</Label>
              <div className="font-medium">{original.vehicles?.engine}</div>
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Badge className="w-fit" variant="outline">
                {original.vehicles?.status ?? '-'}
              </Badge>
            </div>
            <div className="grid gap-2">
              <Label>Chasis</Label>
              <div className="font-medium">{original.vehicles?.chassis ?? '-'}</div>
            </div>
          </div>

          {/* Imágenes del usuario */}
          <div className="mx-auto w-[90%]">
            {imageUrl.length > 0 && <Badge className="text-sm mb-2">Imágenes del equipo a reparar</Badge>}
            {imageUrl.length > 0 && (
              <Carousel className="w-full">
                <CarouselContent className="p-2">
                  {imageUrl.map((image, index) => (
                    <CarouselItem key={`user-img-${index}`} className="md:basis-1/2 lg:basis-1/3 overflow-hidden">
                      <Card>
                        <Link target="_blank" href={image || ''}>
                          <CardContent className="flex aspect-square items-center justify-center p-1">
                            <img
                              src={image}
                              alt={`Imagen ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </CardContent>
                        </Link>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            )}
          </div>

          {/* Imágenes del mecánico / subir nuevas */}
          {(imagesMechanic.length > 0 || (status !== dbState && ENDING_STATES.includes(status))) && (
            <div className="mx-auto w-[90%]">
              <Badge className="text-sm mb-2 block w-fit">Adjuntar imágenes</Badge>
              {!imagesMechanic.length && status !== dbState && (
                <CardDescription>
                  Una vez subida una imagen no se podrá modificar ni subir otra imagen, si desea hacerlo tendrá que
                  realizar una nueva solicitud
                </CardDescription>
              )}
              <Carousel opts={{ align: 'start' }} className="w-full">
                <CarouselContent className="p-2">
                  {imagesMechanic.length
                    ? imagesMechanic.map((image, index) => (
                        <CarouselItem key={`mech-img-${index}`} className="md:basis-1/2 lg:basis-1/3 overflow-hidden">
                          <Card>
                            <Link target="_blank" href={image || ''}>
                              <CardContent className="flex aspect-square items-center justify-center p-1">
                                <img
                                  src={image || ''}
                                  alt={`Imagen ${index + 1}`}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              </CardContent>
                            </Link>
                          </Card>
                        </CarouselItem>
                      ))
                    : status !== dbState &&
                      Array.from({ length: 3 }).map((_, index) => (
                        <CarouselItem key={`upload-${index}`} className="md:basis-1/2 lg:basis-1/3">
                          <div className="p-1">
                            <Card className="hover:cursor-pointer" onClick={() => handleCardClick(index)}>
                              <CardContent className="flex aspect-square items-center justify-center p-1">
                                {images[index] ? (
                                  <img
                                    src={images[index] || ''}
                                    alt={`Imagen ${index + 1}`}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <span className="text-3xl font-semibold">{index + 1}</span>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>
                      ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          )}

          {/* Kilometros totales */}
          <div className="grid gap-2">
            <CardTitle>
              Kilómetros totales de la reparación:{' '}
              {Number(repairLogs?.[repairLogs.length - 1]?.kilometer || 0) - Number(repairLogs?.[0]?.kilometer || 0)}{' '}
              kms
            </CardTitle>
          </div>

          {/* Timeline de repair logs */}
          <div className="relative flex flex-col gap-4 justify-start w-full">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-muted-foreground/20" />
            {repairLogs.map((log, index) => {
              const logState = log.title ?? '';
              // logState puede venir en formato BD ("En reparación") o Prisma ("En_reparaci_n")
              const prismaKey = mapDbStateToPrisma(logState);
              const Icon = repairStateIcons[prismaKey] ?? repairStateIcons[logState];
              const color = repairStateColors[prismaKey] ?? repairStateColors[logState] ?? 'text-gray-500';
              const fullName =
                log.profile?.fullname ??
                (log.employees ? `${log.employees.firstname} ${log.employees.lastname ?? ''}`.trim() : '-');

              return (
                <div key={log.id} className="relative flex items-start gap-4">
                  <div
                    className={cn(
                      'relative flex max-h-[40px] max-w-[40px] size-10 items-center justify-center rounded-full text-primary-foreground aspect-square flex-shrink-0',
                      index + 1 === repairLogs.length ? 'bg-primary' : 'bg-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex gap-2 items-center">
                        <div className={`font-medium flex items-center ${color}`}>
                          {Icon && <Icon className="mr-2 h-4 w-4" />}
                          <span>{logState}</span>
                        </div>
                        <CardDescription className="m-0 flex gap-2 items-center">
                          <PersonIcon />
                          {fullName}
                        </CardDescription>
                      </div>
                      <div className="text-muted-foreground text-sm flex gap-2 items-center">
                        <Badge variant="outline" className="m-0 flex items-center p-1">
                          {log.kilometer ?? '0'} kms
                        </Badge>
                        <CardDescription>
                          {moment(log.created_at).calendar(null, {
                            sameDay: '[Hoy,] h:mm A',
                            nextDay: '[Mañana,] h:mm A',
                            nextWeek: 'dddd [a las] h:mm A',
                            lastDay: '[Ayer,] h:mm A',
                            lastWeek: '[El] dddd [pasado a las] h:mm A',
                            sameElse: 'DD/MM/YYYY',
                          })}
                        </CardDescription>
                      </div>
                    </div>
                    <CardDescription>{log.description}</CardDescription>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogClose id="close-modal-repair-equipment" />

        {/* Botones de acción */}
        {isFinalized ? (
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="destructive"
              className="col-span-2"
              type="submit"
              onClick={() => document.getElementById('close-modal-repair-equipment')?.click()}
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Button type="submit" form="repair-equipment-form" className="col-span-1">
              Guardar cambios
            </Button>
            <Button
              variant="destructive"
              className="col-span-1"
              type="button"
              onClick={() => document.getElementById('close-modal-repair-equipment')?.click()}
            >
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Mapea el valor del enum Prisma (con underscore) al valor de BD (con espacios).
 * Prisma: "En_reparaci_n" → BD: "En reparación"
 * Prisma: "Esperando_repuestos" → BD: "Esperando repuestos"
 */
function mapPrismaStateToDb(prismaState: string): string {
  const mapping: Record<string, string> = {
    Pendiente: 'Pendiente',
    Esperando_repuestos: 'Esperando repuestos',
    En_reparaci_n: 'En reparación',
    Finalizado: 'Finalizado',
    Rechazado: 'Rechazado',
    Cancelado: 'Cancelado',
    Programado: 'Programado',
  };
  return mapping[prismaState] ?? prismaState;
}

/**
 * Calcula la nueva condición del vehículo basándose en las reparaciones pendientes.
 */
function calculateVehicleCondition(
  newStatus: string,
  pendingRepairs: RepairByEquipmentItem[],
  currentCriticity: string | null
): string {
  type SimplifiedRepair = { state: string; criticity: string | null };

  const simplified: SimplifiedRepair[] = pendingRepairs.map((e) => ({
    state: e.state as string,
    criticity: ((e.reparation_type as unknown as Record<string, unknown> | null)?.criticity as string | null) ?? null,
  }));

  if (ENDING_STATES.includes(newStatus)) {
    if (simplified.length === 0) return 'operativo';
    if (simplified.some((e) => e.state === 'En reparación')) return 'en reparación';
    if (simplified.some((e) => e.criticity === 'Alta')) return 'no operativo';
    if (simplified.some((e) => e.criticity === 'Media')) return 'operativo condicionado';
    return 'operativo';
  }

  const allPending: SimplifiedRepair[] = [...simplified, { state: newStatus, criticity: currentCriticity }];
  if (allPending.some((e) => e.state === 'En reparación')) return 'en reparación';
  if (allPending.some((e) => e.criticity === 'Alta')) return 'no operativo';
  if (allPending.some((e) => e.criticity === 'Media')) return 'operativo condicionado';
  return 'operativo';
}
