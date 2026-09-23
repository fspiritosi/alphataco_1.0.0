'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  createTireForVehicle,
  getTireBrandsForVehicle,
} from '@/features/Mantenimiento/Gomeria/Catalogo/actions/actions.server';
import { getTireTypesForVehicle } from '@/features/Mantenimiento/Gomeria/Tipos/actions/actions.server';
import { tireRetreadLabels, tireTreadTypeLabels } from '@/features/Mantenimiento/Gomeria/shared/tire-mappers';
import { TireRetreadLevel } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { getAvailableTiresForVehicle, type AvailableTire } from '../actions/actions.server';

const logger = new Logger('TireReplacePicker');

// ─── Props ───────────────────────────────────────────────────────────────────

interface TireReplacePickerProps {
  /** Vehículo que se está atendiendo: de él sale la empresa del stock y del alta rápida. */
  vehicleId: string;
  onSelect: (tire: AvailableTire) => void;
  selectedTireId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TireReplacePicker({ vehicleId, onSelect, selectedTireId }: TireReplacePickerProps) {
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: tires = [], isLoading } = useQuery({
    queryKey: ['available-tires', vehicleId],
    queryFn: () => getAvailableTiresForVehicle(vehicleId),
    staleTime: 30 * 1000,
  });

  const filtered = tires.filter(
    (t) =>
      search.trim() === '' ||
      t.serial_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.brand?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.tire_type?.size ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por serie, marca o medida..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nueva
        </Button>
      </div>

      {tires.length === 0 && !showCreateDialog ? (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground space-y-2">
          <p>No hay cubiertas disponibles en stock</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Crear cubierta
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-52">
          <div className="space-y-1 pr-2">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Sin resultados para &quot;{search}&quot;</p>
            ) : (
              filtered.map((tire) => (
                <TirePickerRow key={tire.id} tire={tire} selected={tire.id === selectedTireId} onSelect={onSelect} />
              ))
            )}
          </div>
        </ScrollArea>
      )}

      <QuickCreateTireDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        vehicleId={vehicleId}
        onCreated={(newTire) => {
          onSelect(newTire);
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface TirePickerRowProps {
  tire: AvailableTire;
  selected: boolean;
  onSelect: (tire: AvailableTire) => void;
}

function TirePickerRow({ tire, selected, onSelect }: TirePickerRowProps) {
  const treadType = tire.tire_type?.tread_type;
  const treadLabel = treadType ? tireTreadTypeLabels[treadType] ?? treadType : '—';
  const retreadLabel = tire.retread_level ? tireRetreadLabels[tire.retread_level] : null;
  const isMissing = tire.status === 'MISSING';

  return (
    <button
      type="button"
      onClick={() => onSelect(tire)}
      className={cn(
        'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
        selected && 'border-primary bg-primary/5',
        isMissing && !selected && 'border-destructive/30 bg-destructive/5'
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium">{tire.serial_number}</span>
          {isMissing && (
            <Badge variant="destructive" className="text-[10px] py-0">
              Extraviada
            </Badge>
          )}
          {tire.is_new ? (
            <Badge variant="success" className="text-[10px] py-0">
              Nueva
            </Badge>
          ) : retreadLabel ? (
            <Badge variant="yellow" className="text-[10px] py-0">
              {retreadLabel}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] py-0">
              Usada
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{tire.brand?.name ?? '—'}</span>
          <span>·</span>
          <span>{tire.tire_type?.size ?? '—'}</span>
          <span>·</span>
          <span>{treadLabel}</span>
          {tire.tread_depth != null && (
            <>
              <span>·</span>
              <span>{Number(tire.tread_depth).toFixed(0)} %</span>
            </>
          )}
        </div>
        {isMissing && selected && (
          <p className="text-[10px] text-destructive mt-1">
            Al usarla, dejará de estar extraviada y pasará a estado instalada.
          </p>
        )}
      </div>
      {selected && <CheckCircle2 className="ml-2 h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

// ─── Quick Create Tire Dialog ────────────────────────────────────────────────

const quickTireSchema = z.object({
  serial_number: z.string().min(1, 'Número de serie requerido'),
  brand_id: z.string().uuid('Seleccione una marca'),
  tire_type_id: z.string().uuid('Seleccione un tipo'),
  is_new: z.boolean().default(true),
  retread_level: z.nativeEnum(TireRetreadLevel).nullable().optional(),
});

type QuickTireValues = z.infer<typeof quickTireSchema>;

interface QuickCreateTireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  onCreated: (tire: AvailableTire) => void;
}

function QuickCreateTireDialog({ open, onOpenChange, vehicleId, onCreated }: QuickCreateTireDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<QuickTireValues>({
    resolver: zodResolver(quickTireSchema),
    defaultValues: {
      serial_number: '',
      brand_id: '',
      tire_type_id: '',
      is_new: true,
      retread_level: null,
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['tire-brands-for-vehicle', vehicleId],
    queryFn: () => getTireBrandsForVehicle(vehicleId),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tireTypes = [] } = useQuery({
    queryKey: ['tire-types-for-vehicle', vehicleId],
    queryFn: () => getTireTypesForVehicle(vehicleId),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: (values: QuickTireValues) =>
      createTireForVehicle({
        vehicle_id: vehicleId,
        serial_number: values.serial_number,
        brand_id: values.brand_id,
        tire_type_id: values.tire_type_id,
        is_new: values.is_new,
        retread_level: values.retread_level ?? null,
        tread_depth: null,
      }),
    onSuccess: async (newTire) => {
      toast.success(`Cubierta ${newTire.serial_number} creada`);
      // Invalidate available tires so the new one appears
      await queryClient.invalidateQueries({ queryKey: ['available-tires', vehicleId] });
      form.reset();
      // Build an AvailableTire-compatible object for auto-selection
      const brandId = form.getValues('brand_id');
      const selectedBrand = brands.find((b) => b.id === brandId) ?? brands.find((b) => b.id === newTire.brand_id);
      const selectedType = tireTypes.find((t) => t.id === newTire.tire_type_id);
      onCreated({
        id: newTire.id,
        serial_number: newTire.serial_number,
        status: 'AVAILABLE',
        is_new: newTire.is_new,
        retread_level: newTire.retread_level,
        tread_depth: newTire.tread_depth,
        brand: { id: selectedBrand?.id ?? brandId, name: selectedBrand?.name ?? '' },
        tire_type: {
          id: selectedType?.id ?? newTire.tire_type_id,
          size: selectedType?.size ?? '',
          tread_type: selectedType?.tread_type ?? 'SMOOTH',
        },
      });
    },
    onError: (error) => {
      logger.error('Error creating tire inline', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al crear la cubierta');
    },
  });

  const isNew = form.watch('is_new');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear cubierta rápida</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="grid gap-4">
            {/* Serial */}
            <FormField
              control={form.control}
              name="serial_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de serie</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: ABC001" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brand + Type — full width each */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar marca..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tire_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de cubierta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar medida / tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tireTypes.map((tt) => (
                          <SelectItem key={tt.id} value={tt.id}>
                            {tt.size} — {tireTreadTypeLabels[tt.tread_type] ?? tt.tread_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Condition row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="is_new"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border px-3 py-2.5">
                    <FormLabel className="text-sm font-normal">{field.value ? 'Nueva' : 'Usada'}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isNew && (
                <FormField
                  control={form.control}
                  name="retread_level"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={(v) => field.onChange(v === '_none' ? null : v)}
                        value={field.value ?? '_none'}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Precurado..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none">Sin precurado</SelectItem>
                          {Object.values(TireRetreadLevel).map((level) => (
                            <SelectItem key={level} value={level}>
                              {tireRetreadLabels[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear y seleccionar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
