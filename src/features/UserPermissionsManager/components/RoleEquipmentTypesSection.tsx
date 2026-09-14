'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { useId } from 'react';
import type { RoleEquipmentTypesDraft } from '../hooks/useEquipmentTypeVisibility';
import {
  EquipmentTypesSectionEmpty,
  EquipmentTypesSectionError,
  EquipmentTypesSectionHeader,
  EquipmentTypesSectionSkeleton,
} from './EquipmentTypesSectionParts';

interface RoleEquipmentTypesSectionProps {
  draft: RoleEquipmentTypesDraft;
  /** Bloquea las casillas mientras se guarda el rol */
  disabled?: boolean;
  /** Error del último guardado de este bloque (el resto del rol pudo haberse guardado) */
  saveError?: string | null;
}

/**
 * Bloque "Tipos de equipamiento" dentro del módulo Mantenimiento del editor de rol
 * (ticket 690). No guarda por su cuenta: modifica el borrador y el diálogo lo persiste
 * con el mismo botón "Guardar" que el resto del rol.
 */
export function RoleEquipmentTypesSection({ draft, disabled = false, saveError }: RoleEquipmentTypesSectionProps) {
  const titleId = useId();
  const { typesQuery, baselineQuery, isNewRole, isBaselineReady, hiddenTypeIds, changes, toggle } = draft;

  const types = typesQuery.data ?? [];
  const visibleCount = types.filter((type) => !hiddenTypeIds.has(type.id)).length;
  // isPending (sin datos todavía), no isLoading: una query en cola sin fetch en curso
  // da isLoading=false y se dibujarían las casillas sin el baseline del rol
  const isLoading = typesQuery.isPending || (!isNewRole && baselineQuery.isPending);
  const hasLoadError = typesQuery.isError || (!isNewRole && baselineQuery.isError);
  const canEdit = isBaselineReady && !disabled;

  const retry = () => {
    if (typesQuery.isError) void typesQuery.refetch();
    if (baselineQuery.isError) void baselineQuery.refetch();
  };

  return (
    <div role="group" aria-labelledby={titleId} aria-busy={isLoading} className="space-y-2.5">
      <EquipmentTypesSectionHeader
        titleId={titleId}
        compact
        description="Destilda los tipos cuyas solicitudes de mantenimiento no debe ver este rol. Los vehículos no se ven afectados."
        visibleCount={isLoading || hasLoadError ? undefined : visibleCount}
        total={isLoading || hasLoadError ? undefined : types.length}
      />

      {isLoading ? (
        <EquipmentTypesSectionSkeleton compact />
      ) : hasLoadError ? (
        <EquipmentTypesSectionError onRetry={retry} isRetrying={typesQuery.isFetching || baselineQuery.isFetching} />
      ) : types.length === 0 ? (
        <EquipmentTypesSectionEmpty />
      ) : (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => {
            const isVisible = !hiddenTypeIds.has(type.id);
            const checkboxId = `${titleId}-${type.id}`;

            return (
              <label
                key={type.id}
                htmlFor={checkboxId}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 transition-colors',
                  canEdit ? 'cursor-pointer hover:border-primary/30' : 'cursor-not-allowed opacity-60',
                  isVisible ? 'border-primary/50 bg-primary/10' : 'border-border/50'
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={isVisible}
                  disabled={!canEdit}
                  onCheckedChange={(checked) => toggle(type.id, checked === true)}
                  className="h-3 w-3"
                />
                <span
                  className={cn('min-w-0 truncate text-xs font-medium', !isVisible && 'text-muted-foreground')}
                  title={type.name}
                >
                  {type.name}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Siempre montado para que el lector de pantalla anuncie el delta al cambiar */}
      <p role="status" aria-live="polite" className="text-[11px] text-muted-foreground tabular-nums">
        {changes.hide.length > 0 || changes.show.length > 0 ? (
          <>
            Sin guardar:{' '}
            {changes.hide.length > 0 && (
              <span className="font-medium text-destructive">
                se ocultan {changes.hide.length} {changes.hide.length === 1 ? 'tipo' : 'tipos'}
              </span>
            )}
            {changes.hide.length > 0 && changes.show.length > 0 && ' · '}
            {changes.show.length > 0 && (
              <span className="font-medium text-foreground">
                se vuelven a mostrar {changes.show.length} {changes.show.length === 1 ? 'tipo' : 'tipos'}
              </span>
            )}
          </>
        ) : null}
      </p>

      {saveError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle aria-hidden="true" />
          <AlertDescription className="text-xs">{saveError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
