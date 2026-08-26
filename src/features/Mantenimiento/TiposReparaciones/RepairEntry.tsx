/**
 * @deprecated Este componente está DEPRECADO.
 * Fue reemplazado por NuevoPedidoForm que crea maintenance_orders directamente
 * sin pasar por el flujo de repair_solicitudes.
 *
 * El nuevo componente se encuentra en:
 * src/features/Mantenimiento/NuevoPedido/components/NuevoPedidoForm.tsx
 *
 * Este archivo se mantiene temporalmente por compatibilidad con:
 * - RepairEntryWrapper.tsx (también deprecado)
 * - RepairTypes.tsx (tab "Nueva Solicitud" - usar NuevoPedidoTabContent en su lugar)
 *
 * TODO: Eliminar este archivo cuando se complete la migración de todos los lugares que lo usan.
 */
'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

import { TypeOfRepair } from '@/shared/types/legacy';
import { formatDocumentTypeName } from '@/shared/utils/legacy-mappers';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Textarea } from '@/components/ui/textarea';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
type FormValues = {
  description: string;
  repair: string;
  provicionalId: string;
  domain: string;
  user_images: (string | null)[];
  files: (File | undefined)[];
  kilometer: string | undefined;
}[];

import { Calendar } from '@/components/ui/calendar';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { fetchAllEquipmentBasicData } from '@/features/Mantenimiento/actions/equipment-basic';
import { Logger } from '@/lib/logger';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { CalendarDays } from 'lucide-react';
import { createRepairSolicitud } from './actions/actions';
import { fetchMaintenanceGroupsActionType } from './actions/maintenanceGroupActions';

const logger = new Logger('RepairEntry');

interface RepairDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  repair: FormValues[0] | null;
  repairType: TypeOfRepair[0] | undefined;
  onSave: (description: string, images: (string | null)[], files: (File | undefined)[]) => void;
}

function RepairDetailsModal({ isOpen, onClose, repair, repairType, onSave }: RepairDetailsModalProps) {
  const [description, setDescription] = useState(repair?.description || '');
  const [images, setImages] = useState<(string | null)[]>(repair?.user_images || [null, null, null]);
  const [files, setFiles] = useState<(File | undefined)[]>(repair?.files || [undefined, undefined, undefined]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (repair) {
      setDescription(repair.description || '');
      setImages(repair.user_images || [null, null, null]);
      setFiles(repair.files || [undefined, undefined, undefined]);
      setError('');
    }
  }, [repair]);

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

  const handleSave = () => {
    // Descripción opcional - solo validar si hay texto ingresado
    if (description && description.trim().length > 0 && description.trim().length < 3) {
      setError('La descripción debe tener al menos 3 caracteres si se proporciona');
      return;
    }

    onSave(description, images, files);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles de la reparación</DialogTitle>
          <DialogDescription>
            {repairType?.name} - {repairType?.type_of_maintenance}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campo de descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError('');
              }}
              placeholder="Explica brevemente la reparación"
              className="resize-none min-h-[100px]"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Carrusel de imágenes */}
          <div className="space-y-2">
            <Label>Imágenes de la reparación</Label>
            <Carousel
              opts={{
                align: 'start',
              }}
              className="w-full"
            >
              <CarouselContent>
                {[0, 1, 2].map((index) => (
                  <CarouselItem key={index} className="basis-1/3">
                    <div className="p-1">
                      <Card
                        className="hover:cursor-pointer hover:border-primary"
                        onClick={() => handleCardClick(index)}
                      >
                        <CardContent className="flex aspect-square items-center justify-center p-1">
                          {images[index] ? (
                            <img
                              src={images[index]!}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar detalles</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function getRepairEntryColumns(
  tipo_de_mantenimiento: TypeOfRepair,
  handleDeleteRepair: (provicionalId: string) => void,
  handleOpenDetailsModal: (provicionalId: string) => void
): ColumnDef<FormValues[0]>[] {
  return [
    {
      accessorKey: 'repair',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" className="w-[300px]" />,
      cell: ({ row }) => {
        const repair = tipo_de_mantenimiento.find((e) => e.id === row.original.repair);
        return (
          <div className="flex items-center justify-between gap-3">
            <span>{repair?.name}</span>
            <div className="flex -space-x-2">
              {row.original.user_images
                ?.filter((url) => url)
                ?.map((url) => (
                  <Avatar key={url} className="border-black border size-8">
                    <AvatarImage src={url || ''} alt="Preview de la reparacion" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                ))}
            </div>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },

    {
      accessorKey: 'domain',
      id: 'Dominio',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio o Serie" className="w-[300px]" />,
      cell: ({ row }) => <span>{row.original.domain}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'kilometer',
      id: 'Kilometros',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kilómetros" className="w-[150px]" />,
      cell: ({ row }) => {
        return <Badge variant={'outline'}>{row.original.kilometer} km</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'description',
      id: 'Detalles',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Detalles" className="w-[300px]" />,
      cell: ({ row }) => {
        const hasDescription = row.original.description && row.original.description.length >= 3;
        const hasImages = row.original.user_images.some((img) => img !== null);

        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenDetailsModal(row.original.provicionalId)}>
              {hasDescription ? 'Editar detalles' : 'Agregar detalles'}
            </Button>
            {hasDescription && (
              <Badge variant="success" className="text-xs">
                ✓ Descripción
              </Badge>
            )}
            {hasImages && (
              <Badge variant="secondary" className="text-xs">
                {row.original.user_images.filter((img) => img !== null).length} img
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Eliminar" className="flex justify-end pr-14" />
      ),
      cell: ({ row }) => (
        <Button
          variant={'destructive'}
          onClick={() => {
            handleDeleteRepair(row.original.provicionalId || '');
          }}
        >
          Eliminar
        </Button>
      ),
    },
  ];
}

export default function RepairNewEntry({
  tipo_de_mantenimiento,
  equipment,
  maintenance_groups,
  limittedEquipment,
  user_id,
  default_equipment_id,
  employee_id,
  onReturn,
  savedVisibility,
  savedFilters,
}: {
  tipo_de_mantenimiento: TypeOfRepair;
  equipment: Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>;
  maintenance_groups: NonNullable<fetchMaintenanceGroupsActionType['groups']>;
  limittedEquipment?: boolean;
  user_id?: string | undefined;
  default_equipment_id?: string;
  employee_id?: string | undefined;
  onReturn?: () => void;
  savedVisibility: VisibilityState;
  savedFilters: string[];
}) {
  const router = useRouter();
  const [allRepairs, setAllRepairs] = useState<FormValues>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledInputValue, setScheduledInputValue] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [typeOfEquipment, setTypeOfEquipment] = useState<{ name: string } | undefined>(
    equipment?.find((equip) => equip.id === default_equipment_id)?.types_of_vehicles?.name as any
  );
  const [selectedEquipment, setSelectedEquipment] = useState<
    Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>[0] | undefined
  >(equipment?.find((equip) => equip.id === default_equipment_id));

  // Estados del modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);

  // Variables derivadas para el modal
  const selectedRepair = allRepairs.find((r) => r.provicionalId === selectedRepairId);
  const selectedRepairType = tipo_de_mantenimiento.find((t) => t.id === selectedRepair?.repair);
  const FormSchema = z
    .object({
      provicionalId: z.string().default(crypto.randomUUID()),
      vehicle_id: z.string({
        required_error: 'Por favor selecciona un vehiculo',
      }),
      kilometer: z
        .string()
        .optional()
        .refine(
          (value) => {
            if (value) {
              return Number(value) >= Number(selectedEquipment?.kilometer);
            }
          },
          {
            message: `El kilometraje no puede ser menor al actual (${selectedEquipment?.kilometer})`,
          }
        ),
      repair: z.string().optional(),
      domain: z.string(),
    })
    .refine(
      (data) => {
        // Validar que al menos uno esté seleccionado: repair O selectedGroupId
        return data.repair || selectedGroupId;
      },
      {
        message: 'Debes seleccionar un tipo de reparación o un grupo de reparaciones',
        path: ['repair'], // El error se mostrará en el campo repair
      }
    );
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      vehicle_id: default_equipment_id || '',
      domain: equipment?.find((equip) => equip.id === default_equipment_id)?.domain || '',
      kilometer: selectedEquipment?.kilometer || '0',
    },
  });
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Memorizar la lista de equipos para evitar recálculos innecesarios
  const memoizedEquipment = useMemo(() => equipment || [], [equipment]);

  // Función de filtrado optimizada con memoización
  const filteredEquipment = useMemo(() => {
    if (!searchTerm) return memoizedEquipment.slice(0, 50); // Inicialmente mostramos solo 50 elementos

    return memoizedEquipment.filter((equip) => {
      const searchValue = searchTerm.toLowerCase();
      const domain = (equip.domain || '').toLowerCase();
      const serie = (equip.serie || '').toLowerCase();
      const internNumber = String(equip.intern_number || '').toLowerCase();

      return domain.includes(searchValue) || serie.includes(searchValue) || internNumber.includes(searchValue);
    });
  }, [memoizedEquipment, searchTerm]);

  // Función para manejar la selección de un equipo (evita recrear la función en cada render)
  const handleSelectEquipment = useCallback(
    (equip: any) => () => {
      form.setValue('vehicle_id', equip.id);
      form.setValue('domain', equip.domain || equip.serie || '');
      form.setValue('kilometer', equip.kilometer || '');

      setTypeOfEquipment(equip.types_of_vehicles || '');
      setSelectedEquipment(equip);
    },
    [form]
  );

  const verifyIfExistOpenRepairSolicitud = async (repairTypeId: string) => {
    const vehicle_id = equipment?.find(
      (equip) => equip.domain === form.getValues('domain') || equip.serie === form.getValues('domain')
    );

    if (vehicle_id?.id) {
      //Primero verificar el array de reparaciones
      const hasOpenRepair = allRepairs.some((e) => e.repair === repairTypeId);
      if (hasOpenRepair) {
        toast.error(
          'Ya existe una solicitud de reparacion con los mismos datos en estado pendiente para este vehiculo'
        );
        return true;
      }

      const { data: repair_solicitudes, error } = await supabase
        .from('repair_solicitudes')
        .select('*')
        .eq('equipment_id', vehicle_id?.id)
        .eq('reparation_type', repairTypeId)
        .neq('state', 'Cancelado')
        .neq('state', 'Finalizado')
        .neq('state', 'Rechazado');

      if (repair_solicitudes?.length ?? 0 > 0) {
        toast.error(
          `Ya existe una solicitud de reparacion con los mismos datos en estado ${repair_solicitudes?.[0].state} para este vehiculo`
        );
        return true; // Indica que se encontró una solicitud abierta
      }
    } else {
      toast.error('No se encontro el vehiculo');
      return true; // Indica que no se encontró el vehículo
    }

    return false; // Indica que no se encontró una solicitud abierta
  };

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // Si hay un grupo seleccionado, agregar todas sus reparaciones
    if (selectedGroupId) {
      await handleAddGroup();
      return;
    }

    // Si no hay grupo, agregar reparación individual
    // Validar que repair exista
    if (!data.repair) {
      toast.error('Debes seleccionar un tipo de reparación o un grupo de reparaciones');
      return;
    }

    await toast
      .promise(
        async () => {
          const hasOpenRepair = await verifyIfExistOpenRepairSolicitud(data.repair!);

          // Si se encontró una reparación abierta, lanzar error
          if (hasOpenRepair) {
            throw new Error('Ya existe una solicitud abierta para esta reparación');
          }

          const dataWithImages = {
            ...data,
            repair: data.repair!, // Asegurar que repair es string
            description: '', // Inicialmente vacío
            user_images: [null, null, null], // Sin imágenes inicialmente
            files: [undefined, undefined, undefined], // Sin archivos inicialmente
            kilometer: data.kilometer,
          };

          setAllRepairs((prev) => [...prev, dataWithImages]);
          clearForm();
        },
        {
          loading: 'Agregando reparación...',
          success: 'Reparación agregada exitosamente',
          error: (err) => err.message || 'Error al agregar la reparación',
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  }

  const [formattedToday] = useState(formatDocumentTypeName(new Date().toISOString()));

  const supabase = supabaseBrowser();
  const formatImagesUrl = async (image: File | undefined, domain: string, repair_id: string, index: number) => {
    if (!image) return;
    const maintenanceName = formatDocumentTypeName(tipo_de_mantenimiento.find((e) => e.id === repair_id)?.name || '');
    const formatedDomain = formatDocumentTypeName(domain);
    const url = `/${formatedDomain}/${maintenanceName}-(${formattedToday.replaceAll('/', '-')})/user-image/${index}`;

    const { data, error } = await supabase.storage.from('repair-images').upload(url, image);

    if (error) {
      throw new Error(`${error.message}`);
    }
    return data?.path;
  };

  const formatImages = async (image: File | undefined, domain: string, repair_id: string, index: number) => {
    if (!image) return;
    const maintenanceName = formatDocumentTypeName(tipo_de_mantenimiento.find((e) => e.id === repair_id)?.name || '');
    const formatedDomain = formatDocumentTypeName(domain);
    const url = `/${formatedDomain}/${maintenanceName}-(${formattedToday.replaceAll('/', '-')})/user-image/${index}`;

    return url;
  };

  const createRepair = async () => {
    // La descripción es opcional, no necesitamos validación

    await toast
      .promise(
        async () => {
          try {
            const vehicle_id = equipment?.find(
              (equip) =>
                equip?.domain?.toLowerCase() === allRepairs[0]?.domain?.toLowerCase() ||
                equip?.serie?.toLowerCase() === allRepairs[0]?.domain?.toLowerCase()
            ); //! OJO si se permiten mas de 1 vehiculo
            const condition = vehicle_id?.condition;

            const data = await Promise.all(
              allRepairs?.map(async (e) => {
                const user_images = e.files
                  ? await Promise.all(
                      e.files
                        .filter((image) => image)
                        ?.map((image, index) => formatImages(image, e.domain, e.repair, index))
                    )
                  : null;

                return {
                  reparation_type: e.repair,
                  equipment_id:
                    equipment.find((equip) => equip.domain === e.domain)?.id ||
                    equipment.find((equip) => equip.serie === e.domain)?.id ||
                    '',
                  user_description: e.description,
                  user_id,
                  user_images: user_images?.filter((img): img is string => img !== undefined) || null,
                  state: 'Pendiente' as const,
                  employee_id,
                  kilometer: e.kilometer,
                  scheduled: scheduledDate ? scheduledDate.toISOString() : null,
                };
              })
            );

            // Verificar la criticidad de todas las reparaciones
            const hasHighCriticity = allRepairs.some((e) => {
              const repair = tipo_de_mantenimiento.find((repair) => repair.id === e.repair);
              return repair?.criticity === 'Alta';
            });

            const hasMediumCriticity = allRepairs.some((e) => {
              const repair = tipo_de_mantenimiento.find((repair) => repair.id === e.repair);
              return repair?.criticity === 'Media';
            });

            if (hasHighCriticity && condition !== 'no operativo' && condition !== 'en reparacion') {
              const { data: vehicles, error } = await supabase
                .from('vehicles')
                .update({ condition: 'no operativo', kilometer: allRepairs[0].kilometer })
                .eq('id', vehicle_id?.id || '');
            } else if (hasMediumCriticity && condition !== 'no operativo' && condition !== 'en reparacion') {
              const { data: vehicles, error } = await supabase
                .from('vehicles')
                .update({ condition: 'operativo condicionado', kilometer: allRepairs[0].kilometer })
                .eq('id', vehicle_id?.id || '');
            } else {
              const { data: vehicles, error } = await supabase
                .from('vehicles')
                .update({ kilometer: allRepairs[0].kilometer })
                .eq('id', vehicle_id?.id || '');
            }

            // await fetch(`${URL}/api/repair_solicitud`, {
            //   method: 'POST',
            //   headers: {
            //     'Content-Type': 'application/json',
            //   },
            //   body: JSON.stringify(data),
            // });
            await createRepairSolicitud(data);

            // Subir imágenes de forma independiente, si una falla las demás continúan
            await Promise.all(
              allRepairs.map(async (e) => {
                if (e.files) {
                  await Promise.allSettled(
                    e.files
                      .filter((image) => image)
                      .map(async (image, index) => {
                        try {
                          await formatImagesUrl(image, e.domain, e.repair, index);
                        } catch (error) {
                          logger.error(`Error al subir imagen ${index} para reparación ${e.repair}`, {
                            data: { error },
                          });
                          // No lanzamos el error para que las demás imágenes se sigan subiendo
                        }
                      })
                  );
                }
              })
            );
            router.refresh();
            clearForm();
            setAllRepairs([]);
            if (employee_id && onReturn) {
              onReturn();
            }
          } catch (error) {
            logger.error('Error al crear reparaciones', { data: { error } });
            throw error;
          }
        },
        {
          loading: 'Creando tipo de reparación...',
          success: 'Tipo de reparación creado con éxito',
          error: 'Hubo un error al crear el tipo de reparación',
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  };

  const clearForm = () => {
    form.setValue('repair', '');
    setSelectedGroupId(null);
  };

  const handleDeleteRepair = (provicionalId: string) => {
    setAllRepairs((prev) => prev.filter((e) => e.provicionalId !== provicionalId));
  };

  // Funciones del modal
  const handleOpenDetailsModal = (provicionalId: string) => {
    setSelectedRepairId(provicionalId);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedRepairId(null);
  };

  const handleSaveDetails = (description: string, images: (string | null)[], files: (File | undefined)[]) => {
    setAllRepairs((prev) =>
      prev.map((repair) =>
        repair.provicionalId === selectedRepairId ? { ...repair, description, user_images: images, files } : repair
      )
    );
  };

  const vehicle = equipment.find(
    (equip) => equip.domain === form.getValues('domain') || equip.serie === form.getValues('domain')
  );
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(false);

  // Función para verificar si un grupo está completamente agregado
  const isGroupFullyAdded = useCallback(
    (groupId: string) => {
      const group = maintenance_groups.find((g) => g.id === groupId);
      if (!group) return false;

      const groupRepairIds = group.maintenance_group_type_of_repairs.map((r) => r.type_id);
      const addedRepairIds = allRepairs.map((r) => r.repair);

      // Verificar si todos los tipos de reparación del grupo están en la lista
      return groupRepairIds.every((id) => addedRepairIds.includes(id));
    },
    [maintenance_groups, allRepairs]
  );

  // Estado para el grupo seleccionado
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Función para agregar un grupo de reparaciones
  const handleAddGroup = async () => {
    if (!selectedGroupId) return;

    const group = maintenance_groups.find((g) => g.id === selectedGroupId);
    if (!group) return;

    await toast
      .promise(
        async () => {
          const groupRepairIds = group.maintenance_group_type_of_repairs.map((r) => r.type_id);
          const addedRepairIds = allRepairs.map((r) => r.repair);

          // Filtrar solo las reparaciones que no están ya agregadas
          const repairsToAdd = groupRepairIds.filter((repairId) => !addedRepairIds.includes(repairId));

          if (repairsToAdd.length === 0) {
            throw new Error('Todas las reparaciones de este grupo ya están agregadas');
          }

          // Verificar duplicados en la base de datos para cada reparación
          const validRepairs: string[] = [];
          for (const repairId of repairsToAdd) {
            const hasOpenRepair = await verifyIfExistOpenRepairSolicitud(repairId);
            if (!hasOpenRepair) {
              validRepairs.push(repairId);
            }
          }

          if (validRepairs.length === 0) {
            throw new Error('Todas las reparaciones del grupo ya tienen solicitudes abiertas');
          }

          // Agregar las reparaciones válidas
          const newRepairs = validRepairs.map((repairId) => ({
            provicionalId: crypto.randomUUID(),
            vehicle_id: form.getValues('vehicle_id'),
            repair: repairId,
            domain: form.getValues('domain'),
            description: '',
            user_images: [null, null, null] as (string | null)[],
            files: [undefined, undefined, undefined] as (File | undefined)[],
            kilometer: form.getValues('kilometer'),
          }));

          setAllRepairs((prev) => [...prev, ...newRepairs]);
          clearForm();

          return { count: validRepairs.length, groupName: group.name };
        },
        {
          loading: 'Agregando grupo de reparaciones...',
          success: (result) => `Se agregaron ${result.count} reparaciones del grupo "${result.groupName}"`,
          error: (err) => err.message || 'Error al agregar el grupo de reparaciones',
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  };

  const domainOptions = createFilterOptions(
    allRepairs,
    (repairIter) => repairIter.domain
    // FileText // Icono para documentos
  );

  return (
    <Card className="p-6">
      <ResizablePanelGroup direction="horizontal" className="pt-6 w-full">
        <ResizablePanel defaultSize={30} className="min-w-[260px]">
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-3 p-3 w-full">
                  <FormField
                    control={form.control}
                    name="vehicle_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Seleccionar equipo</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                disabled={limittedEquipment || default_equipment_id ? true : allRepairs?.length > 0}
                                variant="outline"
                                role="combobox"
                                className={cn('justify-between', !field.value && 'text-muted-foreground')}
                              >
                                {field.value
                                  ? equipment?.find((equip) => equip.id === field.value)?.domain ||
                                    equipment?.find((equip) => equip.id === field.value)?.serie
                                  : 'Selecciona un equipo'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className=" p-0">
                            <Command>
                              <CommandInput
                                placeholder="Buscar equipo..."
                                onValueChange={(value) => setSearchTerm(value)}
                              />
                              <CommandList className="max-h-[300px] overflow-auto">
                                <CommandEmpty>No se encontro el equipo</CommandEmpty>
                                <CommandGroup>
                                  {filteredEquipment.map((equip) => {
                                    return (
                                      <CommandItem
                                        value={equip.domain || equip.serie || ''}
                                        key={equip.domain}
                                        onSelect={handleSelectEquipment(equip)}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            equip.id === field.value ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                        {`${equip.domain ?? equip.serie} ${equip.intern_number ? ' (Nº' + equip.intern_number + ')' : ''}`}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kilometer"
                    // disabled={limittedEquipment ? false : allRepairs?.length > 0}
                    render={({ field }) => (
                      <FormItem className={cn(typeOfEquipment?.name === 'Vehículos' ? '' : 'hidden')}>
                        <FormLabel>Kilometraje</FormLabel>
                        <FormControl>
                          <Input
                            disabled={limittedEquipment ? false : allRepairs?.length > 0}
                            {...field}
                            placeholder="Kilometraje"
                            value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (isNaN(Number(value)) || value === ' ') {
                                return;
                              }

                              form.setValue('kilometer', value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="repair"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Selecciona un tipo de reparación</FormLabel>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn('justify-between', !field.value && 'text-muted-foreground')}
                              >
                                {field.value
                                  ? tipo_de_mantenimiento.find((item) => item.id === field.value)?.name
                                  : 'Tipos de reparaciones'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="p-0">
                            <Command>
                              <CommandInput placeholder="Buscar tipo de reparación..." />
                              <CommandList>
                                <CommandEmpty>No se encontró ningún tipo de reparación.</CommandEmpty>
                                <CommandGroup>
                                  {tipo_de_mantenimiento?.map((item) => (
                                    <CommandItem
                                      value={item.name}
                                      key={item.name}
                                      disabled={allRepairs.some((e) => e.repair === item.id)}
                                      onSelect={() => {
                                        form.setValue('repair', item.id);
                                        setOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          item.id === field.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      {item.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Select de Grupos de Reparación */}
                  <div className="flex flex-col space-y-2">
                    <Label>O selecciona un grupo de reparaciones</Label>
                    <Popover open={openGroup} onOpenChange={setOpenGroup}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn('w-full justify-between', !selectedGroupId && 'text-muted-foreground')}
                        >
                          {selectedGroupId
                            ? maintenance_groups.find((g) => g.id === selectedGroupId)?.name
                            : 'Selecciona un grupo'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[400px]">
                        <Command>
                          <CommandInput placeholder="Buscar grupo..." />
                          <CommandList className="max-h-[300px]">
                            <CommandEmpty>No se encontró ningún grupo.</CommandEmpty>
                            <CommandGroup>
                              {maintenance_groups?.map((group) => {
                                const groupRepairNames = group.maintenance_group_type_of_repairs
                                  .map((r) => tipo_de_mantenimiento.find((t) => t.id === r.type_id)?.name)
                                  .filter(Boolean);

                                return (
                                  <CommandItem
                                    value={group.name}
                                    key={group.id}
                                    disabled={isGroupFullyAdded(group.id)}
                                    onSelect={() => {
                                      setSelectedGroupId(group.id);
                                      setOpenGroup(false);
                                    }}
                                    className="flex-col items-start py-3"
                                  >
                                    <div className="flex items-center w-full">
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4 shrink-0',
                                          selectedGroupId === group.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      <div className="flex flex-col flex-1">
                                        <span className="font-medium">{group.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {group.maintenance_group_type_of_repairs.length} reparaciones
                                          {isGroupFullyAdded(group.id) && ' (Ya agregadas)'}
                                        </span>
                                      </div>
                                    </div>
                                    {groupRepairNames.length > 0 && (
                                      <div className="ml-6 mt-1 text-xs text-muted-foreground">
                                        • {groupRepairNames.join(' • ')}
                                      </div>
                                    )}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Campo de fecha de solicitud (aplica a todas las reparaciones del batch) */}
                  <div className="flex flex-col space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      Fecha de solicitud
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="DD/MM/YYYY"
                        value={scheduledInputValue}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setScheduledInputValue(raw);
                          const parsed = moment(raw, 'DD/MM/YYYY', true);
                          if (parsed.isValid()) {
                            setScheduledDate(parsed.toDate());
                          } else {
                            setScheduledDate(undefined);
                          }
                        }}
                        className="flex-1"
                      />
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" type="button" className="shrink-0">
                            <CalendarDays className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={(date) => {
                              setScheduledDate(date);
                              setScheduledInputValue(date ? moment(date).format('DD/MM/YYYY') : '');
                              setCalendarOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fecha de cuándo es esta OS. Permite cargar órdenes históricas con cualquier fecha.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 mt-4 pt-4 border-t justify-end pr-4 mb-2">
                  <Button
                    type="submit"
                    variant={'outline'}
                    className="w-full sm:w-auto"
                    disabled={form.formState.isSubmitting}
                  >
                    Agregar reparación
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel className="pl-6 min-w-0 overflow-hidden" defaultSize={70}>
          <div className="flex flex-col gap-4 w-full ">
            <CardTitle>Se registraran las siguientes reparaciones</CardTitle>

            <BaseDataTable
              columns={getRepairEntryColumns(tipo_de_mantenimiento, handleDeleteRepair, handleOpenDetailsModal)}
              data={allRepairs}
              tableId="repair-entry-table"
              savedVisibility={savedVisibility}
              toolbarOptions={{
                initialVisibleFilters: savedFilters || [],
                filterableColumns: [
                  {
                    columnId: 'Dominio',
                    title: 'Dominio',
                    options: domainOptions,
                  },
                ],
              }}
            />
            {allRepairs?.length > 0 && (
              <Button
                onClick={() => {
                  createRepair();
                }}
                className="w-1/3 self-center mt-3"
              >
                Registrar solicitudes
              </Button>
            )}
          </div>
        </ResizablePanel>
        {/* Modal de detalles */}
        <RepairDetailsModal
          isOpen={detailsModalOpen}
          onClose={handleCloseDetailsModal}
          repair={selectedRepair || null}
          repairType={selectedRepairType}
          onSave={handleSaveDetails}
        />
      </ResizablePanelGroup>
    </Card>
  );
}
