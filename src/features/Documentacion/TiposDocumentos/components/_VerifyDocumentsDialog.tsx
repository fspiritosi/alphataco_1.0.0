'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Minus, Plus, UserMinus, UserPlus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { fixDocumentTypeConsistency, verifyDocumentTypeConsistency } from '../actions/actions.server';
import { _VerifyDocumentsSkeleton } from './_VerifyDocumentsSkeleton';

// ============================================================================
// CONSTANTS & PROPS
// ============================================================================

const MAX_DISPLAY_ROWS = 20;

interface VerifyDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTypeId: string;
  documentTypeName: string;
  applies: 'Persona' | 'Equipos';
  isSpecial: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function _VerifyDocumentsDialog({
  open,
  onOpenChange,
  documentTypeId,
  documentTypeName,
  applies,
  isSpecial,
}: VerifyDocumentsDialogProps) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);

  // === Query de verificacion ===
  const {
    data: result,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['verify-document-consistency', documentTypeId],
    queryFn: () => verifyDocumentTypeConsistency(documentTypeId),
    enabled: open && !!documentTypeId,
    staleTime: 0,
    retry: false,
  });

  // === Mutacion de correccion ===
  const fixMutation = useMutation({
    mutationFn: () => {
      if (!result) throw new Error('No hay datos de verificacion');
      return fixDocumentTypeConsistency(documentTypeId, {
        createAlerts: result.missing.map((r) => r.id),
        removeAlerts: result.orphan.map((r) => r.alertId),
      });
    },
    onSuccess: (data) => {
      toast.success(
        `Se corrigieron ${data.created + data.removed} inconsistencias (${data.created} creadas, ${data.removed} eliminadas)`
      );
      queryClient.invalidateQueries({ queryKey: ['doc-types'] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Error al corregir inconsistencias');
    },
  });

  const handleFix = useCallback(() => {
    setShowConfirm(false);
    fixMutation.mutate();
  }, [fixMutation]);

  const hasInconsistencies = result && (result.stats.totalMissing > 0 || result.stats.totalOrphan > 0);

  const resourceLabel = applies === 'Persona' ? 'empleados' : 'equipos';
  const MissingIcon = applies === 'Persona' ? UserPlus : Plus;
  const OrphanIcon = applies === 'Persona' ? UserMinus : Minus;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Verificacion de Documentos</DialogTitle>
            <DialogDescription>Verificando consistencia para &ldquo;{documentTypeName}&rdquo;</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Loading */}
            {isLoading && <_VerifyDocumentsSkeleton />}

            {/* Error */}
            {error && !isLoading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <h3 className="text-lg font-semibold">Error al verificar</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {error instanceof Error ? error.message : 'Error desconocido'}
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </div>
            )}

            {/* Sin inconsistencias */}
            {result && !hasInconsistencies && !isLoading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <h3 className="text-lg font-semibold">Todo en orden</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {isSpecial
                    ? `Los ${result.stats.totalResources} ${resourceLabel} que cumplen las condiciones tienen su alerta asignada correctamente.`
                    : `Los ${result.stats.totalResources} ${resourceLabel} activos tienen su alerta asignada correctamente.`}
                </p>
              </div>
            )}

            {/* Con inconsistencias */}
            {result && hasInconsistencies && !isLoading && (
              <div className="space-y-4">
                {/* Badges de resumen */}
                <div className="flex flex-wrap gap-2">
                  {result.stats.totalMissing > 0 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-700 gap-1">
                      <MissingIcon className="h-3.5 w-3.5" />
                      {result.stats.totalMissing} faltantes
                    </Badge>
                  )}
                  {result.stats.totalOrphan > 0 && (
                    <Badge variant="outline" className="border-red-500 text-red-700 gap-1">
                      <OrphanIcon className="h-3.5 w-3.5" />
                      {result.stats.totalOrphan} sobrantes
                    </Badge>
                  )}
                </div>

                {/* Descripcion */}
                <p className="text-sm text-muted-foreground">
                  Se encontraron inconsistencias entre las condiciones configuradas y las alertas existentes en la base
                  de datos.
                </p>

                {/* Card Faltantes */}
                {result.stats.totalMissing > 0 && (
                  <Card className="border-l-4 border-l-amber-500 border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Alertas faltantes</CardTitle>
                      <CardDescription>
                        Estos {resourceLabel} cumplen las condiciones pero no tienen la alerta de documento asignada.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {applies === 'Persona' && result.applies === 'Persona' && (
                        <EmployeeTable
                          data={result.missing}
                          maxRows={MAX_DISPLAY_ROWS}
                          total={result.stats.totalMissing}
                        />
                      )}
                      {applies === 'Equipos' && result.applies === 'Equipos' && (
                        <EquipmentTable
                          data={result.missing}
                          maxRows={MAX_DISPLAY_ROWS}
                          total={result.stats.totalMissing}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Card Sobrantes */}
                {result.stats.totalOrphan > 0 && (
                  <Card className="border-l-4 border-l-red-500 border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Alertas sobrantes</CardTitle>
                      <CardDescription>
                        Estos {resourceLabel} ya no cumplen las condiciones y tienen una alerta vacia (sin documento
                        subido) que puede eliminarse de forma segura.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {applies === 'Persona' && result.applies === 'Persona' && (
                        <EmployeeTable
                          data={result.orphan}
                          maxRows={MAX_DISPLAY_ROWS}
                          total={result.stats.totalOrphan}
                        />
                      )}
                      {applies === 'Equipos' && result.applies === 'Equipos' && (
                        <EquipmentTable
                          data={result.orphan}
                          maxRows={MAX_DISPLAY_ROWS}
                          total={result.stats.totalOrphan}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {hasInconsistencies && (
              <Button onClick={() => setShowConfirm(true)} disabled={fixMutation.isPending}>
                {fixMutation.isPending ? 'Corrigiendo...' : 'Corregir inconsistencias'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmacion */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar correccion</AlertDialogTitle>
            <AlertDialogDescription>
              Se crearan {result?.stats.totalMissing ?? 0} alertas nuevas y se eliminaran{' '}
              {result?.stats.totalOrphan ?? 0} alertas vacias. Esta accion no elimina documentos ya subidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFix}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// TABLAS SIMPLES
// ============================================================================

function EmployeeTable({
  data,
  maxRows,
  total,
}: {
  data: { id: string; file_number: string | null; lastname: string; firstname: string }[];
  maxRows: number;
  total: number;
}) {
  const displayed = data.slice(0, maxRows);
  const remaining = total - displayed.length;

  return (
    <div className="text-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Legajo</th>
            <th className="pb-2 pr-4 font-medium">Apellido</th>
            <th className="pb-2 font-medium">Nombre</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((emp) => (
            <tr key={emp.id} className="border-b last:border-0">
              <td className="py-1.5 pr-4 tabular-nums">{emp.file_number ?? '-'}</td>
              <td className="py-1.5 pr-4">{emp.lastname}</td>
              <td className="py-1.5">{emp.firstname}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && <p className="mt-2 text-xs text-muted-foreground">y {remaining} mas...</p>}
    </div>
  );
}

function EquipmentTable({
  data,
  maxRows,
  total,
}: {
  data: {
    id: string;
    domain: string | null;
    intern_number: string | null;
    brand: string | null;
    type: string | null;
  }[];
  maxRows: number;
  total: number;
}) {
  const displayed = data.slice(0, maxRows);
  const remaining = total - displayed.length;

  return (
    <div className="text-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Dominio</th>
            <th className="pb-2 pr-4 font-medium">N. Interno</th>
            <th className="pb-2 pr-4 font-medium">Marca</th>
            <th className="pb-2 font-medium">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((veh) => (
            <tr key={veh.id} className="border-b last:border-0">
              <td className="py-1.5 pr-4">{veh.domain ?? '-'}</td>
              <td className="py-1.5 pr-4">{veh.intern_number ?? '-'}</td>
              <td className="py-1.5 pr-4">{veh.brand ?? '-'}</td>
              <td className="py-1.5">{veh.type ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && <p className="mt-2 text-xs text-muted-foreground">y {remaining} mas...</p>}
    </div>
  );
}
