'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Logger } from '@/lib/logger';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, ChevronLeft, Loader2, Search, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  closeServiceOrder,
  createServiceOrder,
  searchVehicleByDomain,
  type VehicleSearchResult,
} from '../actions/actions.server';
import { TireDiagram } from './TireDiagram';

const logger = new Logger('features/Mantenimiento/Gomeria/Ordenes/ServiceOrderWizard');

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ServiceOrderWizardProps {
  vehicleId?: string; // Pre-set from QR scan
  companyId: string;
  mode: 'qr' | 'dashboard';
  onClose: () => void;
}

// ─── Steps ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

// ─── Component ───────────────────────────────────────────────────────────────

export function ServiceOrderWizard({ vehicleId: presetVehicleId, companyId, mode, onClose }: ServiceOrderWizardProps) {
  // Step: 1=vehicle selection, 2=order setup, 3=operation
  // Skip step 1 when vehicleId is pre-set (QR mode)
  const skipVehicleStep = mode === 'qr' && !!presetVehicleId;
  const [step, setStep] = useState<Step>(skipVehicleStep ? 2 : 1);

  // Vehicle & Trailer
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);
  const [selectedTrailer, setSelectedTrailer] = useState<VehicleSearchResult | null>(null);
  const [hasTrailer, setHasTrailer] = useState(false);

  // Km
  const [kilometer, setKilometer] = useState('');

  // Active service order
  const [serviceOrderId, setServiceOrderId] = useState<string | null>(null);

  // Intervention counter
  const [interventionCount, setInterventionCount] = useState(0);

  const activeVehicleId = presetVehicleId ?? selectedVehicle?.id ?? null;

  const handleVehicleSelect = useCallback((vehicle: VehicleSearchResult) => {
    setSelectedVehicle(vehicle);
  }, []);

  const handleTrailerSelect = useCallback((vehicle: VehicleSearchResult) => {
    setSelectedTrailer(vehicle);
  }, []);

  // ─── Create order mutation ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => {
      if (!activeVehicleId) throw new Error('No se ha seleccionado un vehículo');
      return createServiceOrder({
        vehicle_id: activeVehicleId,
        trailer_vehicle_id: hasTrailer ? selectedTrailer?.id ?? null : null,
        kilometer: kilometer || null,
        company_id: companyId,
      });
    },
    onSuccess: (order) => {
      setServiceOrderId(order.id);
      setStep(3);
    },
    onError: (error) => {
      logger.error('Error creating service order', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al crear la orden');
    },
  });

  // ─── Close order mutation ────────────────────────────────────────────────
  const closeMutation = useMutation({
    mutationFn: () => {
      if (!serviceOrderId) throw new Error('No hay orden activa');
      return closeServiceOrder(serviceOrderId);
    },
    onSuccess: () => {
      toast.success('Orden cerrada correctamente');
      onClose();
    },
    onError: (error) => {
      logger.error('Error closing service order', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al cerrar la orden');
    },
  });

  // ─── Step labels ────────────────────────────────────────────────────────
  const STEP_LABELS: Record<Step, string> = {
    1: 'Seleccionar vehículo',
    2: 'Configurar orden',
    3: 'Operación',
  };

  const totalSteps = skipVehicleStep ? 2 : 3;
  const currentStepDisplay = skipVehicleStep ? step - 1 : step;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          {step > 1 && !serviceOrderId && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setStep((s) => (s - 1) as Step)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <p className="text-xs text-muted-foreground">
              Paso {currentStepDisplay} de {totalSteps}
            </p>
            <p className="font-semibold text-sm">{STEP_LABELS[step]}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {step === 1 && (
          <Step1VehicleSelection
            companyId={companyId}
            selectedVehicle={selectedVehicle}
            onSelect={handleVehicleSelect}
          />
        )}

        {step === 2 && (
          <Step2OrderSetup
            vehicleDomain={presetVehicleId ? '(vehículo escaneado)' : selectedVehicle?.domain ?? null}
            vehicleInternNumber={presetVehicleId ? null : selectedVehicle?.intern_number ?? null}
            hasTrailer={hasTrailer}
            onHasTrailerChange={setHasTrailer}
            selectedTrailer={selectedTrailer}
            onTrailerSelect={handleTrailerSelect}
            kilometer={kilometer}
            onKilometerChange={setKilometer}
            companyId={companyId}
          />
        )}

        {step === 3 && serviceOrderId && activeVehicleId && (
          <Step3Operation
            vehicleId={activeVehicleId}
            trailerId={hasTrailer ? selectedTrailer?.id ?? null : null}
            trailerDomain={selectedTrailer?.domain ?? null}
            serviceOrderId={serviceOrderId}
            companyId={companyId}
            interventionCount={interventionCount}
            onIntervention={() => setInterventionCount((c) => c + 1)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex justify-between gap-2">
        {step === 1 && (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => setStep(2)} disabled={!selectedVehicle?.tire_template_id}>
              Siguiente
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            {!skipVehicleStep && (
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
            )}
            {skipVehicleStep && (
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            )}
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || (hasTrailer && !selectedTrailer?.tire_template_id)}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Iniciar Operación'
              )}
            </Button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              {interventionCount} intervención{interventionCount !== 1 ? 'es' : ''} en esta sesión
            </div>
            <Button variant="gh_orange" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cerrando...
                </>
              ) : (
                'Cerrar Orden'
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Vehicle Selection ────────────────────────────────────────────────

interface Step1Props {
  companyId: string;
  selectedVehicle: VehicleSearchResult | null;
  onSelect: (vehicle: VehicleSearchResult) => void;
}

function Step1VehicleSelection({ companyId, selectedVehicle, onSelect }: Step1Props) {
  const [query, setQuery] = useState('');

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['vehicle-search', companyId, query],
    queryFn: () => searchVehicleByDomain(query, companyId),
    enabled: query.trim().length >= 1,
    staleTime: 10 * 1000,
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar por dominio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isFetching && <Skeleton className="h-10 w-full" />}

      {!isFetching && query.trim().length > 0 && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">No se encontraron vehículos</p>
      )}

      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((v) => (
            <VehicleSearchRow key={v.id} vehicle={v} selected={selectedVehicle?.id === v.id} onSelect={onSelect} />
          ))}
        </div>
      )}

      {selectedVehicle && (
        <div className="rounded-md border border-primary bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground mb-1">Vehículo seleccionado</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{selectedVehicle.domain}</p>
              {selectedVehicle.intern_number && (
                <p className="text-xs text-muted-foreground">Int. {selectedVehicle.intern_number}</p>
              )}
            </div>
            {!selectedVehicle.tire_template_id && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                Sin plantilla
              </div>
            )}
          </div>
        </div>
      )}

      {selectedVehicle && !selectedVehicle.tire_template_id && (
        <p className="text-xs text-destructive">
          Este vehículo no tiene plantilla de cubiertas asignada y no puede ser utilizado para una orden de gomería.
        </p>
      )}
    </div>
  );
}

interface VehicleSearchRowProps {
  vehicle: VehicleSearchResult;
  selected: boolean;
  onSelect: (vehicle: VehicleSearchResult) => void;
}

function VehicleSearchRow({ vehicle, selected, onSelect }: VehicleSearchRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(vehicle)}
      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${selected ? 'border-primary bg-primary/5' : ''}`}
    >
      <div>
        <p className="font-medium">{vehicle.domain}</p>
        {vehicle.intern_number && <p className="text-xs text-muted-foreground">Int. {vehicle.intern_number}</p>}
      </div>
      <div className="flex items-center gap-2">
        {!vehicle.tire_template_id ? (
          <Badge variant="destructive" className="text-[10px]">
            Sin plantilla
          </Badge>
        ) : (
          <Badge variant="success" className="text-[10px]">
            Con plantilla
          </Badge>
        )}
        {selected && <Check className="h-4 w-4 text-primary" />}
      </div>
    </button>
  );
}

// ─── Step 2: Order Setup ──────────────────────────────────────────────────────

interface Step2Props {
  vehicleDomain: string | null;
  vehicleInternNumber: string | null;
  hasTrailer: boolean;
  onHasTrailerChange: (v: boolean) => void;
  selectedTrailer: VehicleSearchResult | null;
  onTrailerSelect: (v: VehicleSearchResult) => void;
  kilometer: string;
  onKilometerChange: (v: string) => void;
  companyId: string;
}

function Step2OrderSetup({
  vehicleDomain,
  vehicleInternNumber,
  hasTrailer,
  onHasTrailerChange,
  selectedTrailer,
  onTrailerSelect,
  kilometer,
  onKilometerChange,
  companyId,
}: Step2Props) {
  return (
    <div className="space-y-4">
      {vehicleDomain && (
        <div className="rounded-md bg-muted/40 border p-3 text-sm">
          <span className="text-muted-foreground text-xs">Vehículo: </span>
          <span className="font-semibold">{vehicleDomain}</span>
          {vehicleInternNumber && (
            <span className="ml-2 text-muted-foreground text-xs">(Int. {vehicleInternNumber})</span>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="km" className="text-sm">
          Kilómetros actuales
        </Label>
        <Input
          id="km"
          type="text"
          inputMode="numeric"
          placeholder="ej. 125000"
          value={kilometer}
          onChange={(e) => onKilometerChange(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Agregar Enganche</p>
          <p className="text-xs text-muted-foreground">El enganche también recibirá intervenciones</p>
        </div>
        <Switch checked={hasTrailer} onCheckedChange={onHasTrailerChange} />
      </div>

      {hasTrailer && (
        <TrailerSelector companyId={companyId} selectedTrailer={selectedTrailer} onSelect={onTrailerSelect} />
      )}
    </div>
  );
}

interface TrailerSelectorProps {
  companyId: string;
  selectedTrailer: VehicleSearchResult | null;
  onSelect: (v: VehicleSearchResult) => void;
}

function TrailerSelector({ companyId, selectedTrailer, onSelect }: TrailerSelectorProps) {
  const [query, setQuery] = useState('');

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['trailer-search', companyId, query],
    queryFn: () => searchVehicleByDomain(query, companyId),
    enabled: query.trim().length >= 1,
    staleTime: 10 * 1000,
  });

  return (
    <div className="space-y-2 pl-2 border-l-2 border-muted">
      <Label className="text-xs">Buscar enganche por dominio</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Dominio del enganche..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isFetching && <Skeleton className="h-10 w-full" />}

      {!isFetching && query.trim().length > 0 && results.length === 0 && (
        <p className="text-xs text-muted-foreground">No se encontraron vehículos</p>
      )}

      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((v) => (
            <VehicleSearchRow key={v.id} vehicle={v} selected={selectedTrailer?.id === v.id} onSelect={onSelect} />
          ))}
        </div>
      )}

      {selectedTrailer && !selectedTrailer.tire_template_id && (
        <div className="flex items-center gap-1.5 text-destructive text-xs rounded-md border border-destructive/30 bg-destructive/5 p-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          El enganche no tiene plantilla de cubiertas asignada
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Operation ────────────────────────────────────────────────────────

interface Step3Props {
  vehicleId: string;
  trailerId: string | null;
  trailerDomain: string | null;
  serviceOrderId: string;
  companyId: string;
  interventionCount: number;
  onIntervention: () => void;
}

function Step3Operation({
  vehicleId,
  trailerId,
  trailerDomain,
  serviceOrderId,
  companyId,
  interventionCount,
  onIntervention,
}: Step3Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="yellow">Orden abierta</Badge>
        <span className="text-muted-foreground text-xs">Toque una posición para registrar una intervención</span>
      </div>

      {interventionCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-green-600" />
          {interventionCount} intervención{interventionCount !== 1 ? 'es' : ''} registrada
          {interventionCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Vehicle diagram */}
      <TireDiagram
        vehicleId={vehicleId}
        serviceOrderId={serviceOrderId}
        companyId={companyId}
        onInterventionDone={onIntervention}
      />

      {/* Trailer diagram (if present) */}
      {trailerId && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-dashed" />
            <p className="text-xs text-muted-foreground whitespace-nowrap">Enganche: {trailerDomain ?? trailerId}</p>
            <div className="flex-1 border-t border-dashed" />
          </div>
          <TireDiagram
            vehicleId={trailerId}
            serviceOrderId={serviceOrderId}
            companyId={companyId}
            label={`Enganche: ${trailerDomain ?? ''}`}
            onInterventionDone={onIntervention}
          />
        </>
      )}
    </div>
  );
}
