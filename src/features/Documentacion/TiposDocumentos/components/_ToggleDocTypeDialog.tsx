'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Power } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';

import { analyzeDocumentTypeImpact } from '../actions/consistency.server';
import { deactivateDocumentType, hardDeleteDocumentType, reactivateDocumentType } from '../actions/mutations.server';
import type { DocumentTypeListItem } from '../actions/queries.server';

// ============================================
// TIPOS
// ============================================

interface ToggleDocTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentTypeListItem;
  onSuccess: () => void;
}

type DeactivateOption = 'deactivate_keep' | 'deactivate_delete_empty' | 'hard_delete';
type ActivateOption = 'activate_recreate' | 'activate_no_alerts';

// ============================================
// SUBCOMPONENTE: CONTENIDO DE DESACTIVACIÓN
// ============================================

interface DeactivateContentProps {
  uploadedCount: number;
  emptyAlertCount: number;
  mandatory: boolean;
  canHardDelete: boolean;
  selectedOption: DeactivateOption;
  onOptionChange: (value: DeactivateOption) => void;
}

function DeactivateContent({
  uploadedCount,
  emptyAlertCount,
  mandatory,
  canHardDelete,
  selectedOption,
  onOptionChange,
}: DeactivateContentProps) {
  // Case B: docs were uploaded — no hard delete
  if (uploadedCount > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            Este tipo tiene{' '}
            <Badge variant="outline" className="font-semibold">
              {uploadedCount}
            </Badge>{' '}
            documento{uploadedCount !== 1 ? 's' : ''} subido{uploadedCount !== 1 ? 's' : ''}. No se puede eliminar
            permanentemente.
          </p>
        </div>
        <RadioGroup value={selectedOption} onValueChange={(v) => onOptionChange(v as DeactivateOption)}>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <RadioGroupItem value="deactivate_keep" id="deactivate_keep" className="mt-0.5" />
            <Label htmlFor="deactivate_keep" className="cursor-pointer font-normal leading-snug">
              Desactivar y mantener{' '}
              {emptyAlertCount > 0 ? (
                <>
                  las{' '}
                  <Badge variant="secondary" className="font-semibold">
                    {emptyAlertCount}
                  </Badge>{' '}
                  alerta{emptyAlertCount !== 1 ? 's' : ''} vacía{emptyAlertCount !== 1 ? 's' : ''}
                </>
              ) : (
                'las alertas existentes'
              )}
            </Label>
          </div>
          {emptyAlertCount > 0 ? (
            <div className="flex items-start gap-3 rounded-md border p-3">
              <RadioGroupItem value="deactivate_delete_empty" id="deactivate_delete_empty" className="mt-0.5" />
              <Label htmlFor="deactivate_delete_empty" className="cursor-pointer font-normal leading-snug">
                Desactivar y borrar las{' '}
                <Badge variant="secondary" className="font-semibold">
                  {emptyAlertCount}
                </Badge>{' '}
                alerta{emptyAlertCount !== 1 ? 's' : ''} vacía{emptyAlertCount !== 1 ? 's' : ''}
              </Label>
            </div>
          ) : null}
        </RadioGroup>
      </div>
    );
  }

  // Case C: Non-mandatory type
  if (!mandatory) {
    return (
      <RadioGroup value={selectedOption} onValueChange={(v) => onOptionChange(v as DeactivateOption)}>
        <div className="flex items-start gap-3 rounded-md border p-3">
          <RadioGroupItem value="deactivate_keep" id="deactivate_keep" className="mt-0.5" />
          <Label htmlFor="deactivate_keep" className="cursor-pointer font-normal leading-snug">
            Desactivar el tipo de documento
          </Label>
        </div>
        {canHardDelete ? (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 p-3">
            <RadioGroupItem
              value="hard_delete"
              id="hard_delete"
              className="mt-0.5 border-destructive text-destructive"
            />
            <Label htmlFor="hard_delete" className="cursor-pointer font-normal leading-snug text-destructive">
              Eliminar permanentemente el tipo y todas sus alertas
            </Label>
          </div>
        ) : null}
      </RadioGroup>
    );
  }

  // Case A: mandatory, uploadedCount === 0
  return (
    <RadioGroup value={selectedOption} onValueChange={(v) => onOptionChange(v as DeactivateOption)}>
      <div className="flex items-start gap-3 rounded-md border p-3">
        <RadioGroupItem value="deactivate_keep" id="deactivate_keep" className="mt-0.5" />
        <Label htmlFor="deactivate_keep" className="cursor-pointer font-normal leading-snug">
          Desactivar y mantener alertas
        </Label>
      </div>
      {emptyAlertCount > 0 ? (
        <div className="flex items-start gap-3 rounded-md border p-3">
          <RadioGroupItem value="deactivate_delete_empty" id="deactivate_delete_empty" className="mt-0.5" />
          <Label htmlFor="deactivate_delete_empty" className="cursor-pointer font-normal leading-snug">
            Desactivar y borrar las{' '}
            <Badge variant="secondary" className="font-semibold">
              {emptyAlertCount}
            </Badge>{' '}
            alerta{emptyAlertCount !== 1 ? 's' : ''} vacía{emptyAlertCount !== 1 ? 's' : ''}
          </Label>
        </div>
      ) : null}
      {canHardDelete ? (
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 p-3">
          <RadioGroupItem value="hard_delete" id="hard_delete" className="mt-0.5 border-destructive text-destructive" />
          <Label htmlFor="hard_delete" className="cursor-pointer font-normal leading-snug text-destructive">
            Eliminar permanentemente (tipo + alertas)
          </Label>
        </div>
      ) : null}
    </RadioGroup>
  );
}

// ============================================
// SUBCOMPONENTE: CONTENIDO DE ACTIVACIÓN
// ============================================

interface ActivateContentProps {
  missingAlertCount: number;
  mandatory: boolean;
  selectedOption: ActivateOption;
  onOptionChange: (value: ActivateOption) => void;
}

function ActivateContent({ missingAlertCount, mandatory, selectedOption, onOptionChange }: ActivateContentProps) {
  if (missingAlertCount > 0 && mandatory) {
    return (
      <RadioGroup value={selectedOption} onValueChange={(v) => onOptionChange(v as ActivateOption)}>
        <div className="flex items-start gap-3 rounded-md border p-3">
          <RadioGroupItem value="activate_recreate" id="activate_recreate" className="mt-0.5" />
          <Label htmlFor="activate_recreate" className="cursor-pointer font-normal leading-snug">
            Activar y crear{' '}
            <Badge variant="secondary" className="font-semibold">
              {missingAlertCount}
            </Badge>{' '}
            alerta{missingAlertCount !== 1 ? 's' : ''} pendiente{missingAlertCount !== 1 ? 's' : ''}
          </Label>
        </div>
        <div className="flex items-start gap-3 rounded-md border p-3">
          <RadioGroupItem value="activate_no_alerts" id="activate_no_alerts" className="mt-0.5" />
          <Label htmlFor="activate_no_alerts" className="cursor-pointer font-normal leading-snug">
            Activar sin crear alertas
          </Label>
        </div>
      </RadioGroup>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Se activará el tipo de documento y se podrán volver a crear documentos de este tipo.
    </p>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function _ToggleDocTypeDialog({ open, onOpenChange, documentType, onSuccess }: ToggleDocTypeDialogProps) {
  const queryClient = useQueryClient();
  const isDeactivating = documentType.is_active;

  const [deactivateOption, setDeactivateOption] = useState<DeactivateOption>('deactivate_keep');
  const [activateOption, setActivateOption] = useState<ActivateOption>('activate_recreate');

  const {
    data: impact,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['doc-type-impact', documentType.id],
    queryFn: () => analyzeDocumentTypeImpact(documentType.id),
    enabled: open,
    staleTime: 0,
    // Un tipo global rechaza siempre (`GLOBAL_DOCUMENT_TYPE_READ_ONLY`): reintentar no cambia
    // nada y sólo demora el mensaje.
    retry: false,
  });

  const errorMessage = error ? (error instanceof Error ? error.message : 'No se pudo analizar el impacto') : null;

  const invalidateAndClose = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['doc-types'] });
    onSuccess();
  }, [queryClient, onSuccess]);

  const deactivateMutation = useMutation({
    mutationFn: (opts: { deleteEmptyAlerts: boolean }) => deactivateDocumentType(documentType.id, opts),
    onSuccess: () => {
      toast.success('Tipo de documento desactivado');
      invalidateAndClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al desactivar');
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () => hardDeleteDocumentType(documentType.id),
    onSuccess: () => {
      toast.success('Tipo de documento eliminado permanentemente');
      invalidateAndClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (opts: { recreateAlerts: boolean }) => reactivateDocumentType(documentType.id, opts),
    onSuccess: () => {
      toast.success('Tipo de documento activado');
      invalidateAndClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al activar');
    },
  });

  const isMutationPending =
    deactivateMutation.isPending || hardDeleteMutation.isPending || reactivateMutation.isPending;

  const handleConfirm = useCallback(() => {
    if (isDeactivating) {
      if (deactivateOption === 'hard_delete') {
        hardDeleteMutation.mutate();
      } else {
        deactivateMutation.mutate({
          deleteEmptyAlerts: deactivateOption === 'deactivate_delete_empty',
        });
      }
    } else {
      reactivateMutation.mutate({
        recreateAlerts: activateOption === 'activate_recreate',
      });
    }
  }, [isDeactivating, deactivateOption, activateOption, hardDeleteMutation, deactivateMutation, reactivateMutation]);

  const isHardDelete = isDeactivating && deactivateOption === 'hard_delete';
  const confirmVariant = isHardDelete ? 'destructive' : isDeactivating ? 'destructive' : 'default';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Power className={`h-4 w-4 ${isDeactivating ? 'text-destructive' : 'text-green-600'}`} />
            {isDeactivating ? 'Desactivar' : 'Activar'} &ldquo;{documentType.name}&rdquo;
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {isDeactivating
              ? 'Opciones para desactivar el tipo de documento'
              : 'Opciones para activar el tipo de documento'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : errorMessage ? (
            // Sin esto el diálogo quedaba VACÍO cuando el análisis fallaba (el caso típico es un
            // tipo global, que no se edita desde una empresa) y el botón de confirmar seguía
            // habilitado: el usuario apretaba y sólo veía el toast del error de la mutación.
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          ) : impact ? (
            isDeactivating ? (
              <DeactivateContent
                uploadedCount={impact.uploadedCount}
                emptyAlertCount={impact.emptyAlertCount}
                mandatory={impact.docType.mandatory}
                canHardDelete={impact.canHardDelete}
                selectedOption={deactivateOption}
                onOptionChange={setDeactivateOption}
              />
            ) : (
              <ActivateContent
                missingAlertCount={impact.missingAlertCount}
                mandatory={impact.docType.mandatory}
                selectedOption={activateOption}
                onOptionChange={setActivateOption}
              />
            )
          ) : null}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMutationPending}>
            {errorMessage ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading || isMutationPending || errorMessage !== null}
          >
            {isMutationPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : isHardDelete ? (
              'Eliminar permanentemente'
            ) : isDeactivating ? (
              'Desactivar'
            ) : (
              'Activar'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
