'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { Undo2, UserCog } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  removeUserEquipmentTypeVisibility,
  setUserEquipmentTypeVisibility,
  type UserEquipmentTypeVisibility,
} from '../actions/equipmentTypeVisibility.server';
import {
  equipmentTypeVisibilityKeys,
  useEquipmentTypesForVisibility,
  useUserEquipmentTypeVisibility,
} from '../hooks/useEquipmentTypeVisibility';
import {
  EquipmentTypesSectionEmpty,
  EquipmentTypesSectionError,
  EquipmentTypesSectionHeader,
  EquipmentTypesSectionSkeleton,
} from './EquipmentTypesSectionParts';

const logger = new Logger('UserEquipmentTypesSection');

interface UserEquipmentTypesSectionProps {
  userId: string;
  disabled?: boolean;
}

type VisibilityChange = {
  typeId: string;
  typeName: string;
  /** `null` = borrar la excepción y volver a heredar de los roles */
  isVisible: boolean | null;
};

type UserRoleVisibility = UserEquipmentTypeVisibility['roles'][number];

function joinRoleNames(roles: UserRoleVisibility[]): string {
  return roles.map((role) => role.name).join(', ');
}

/** Explica de dónde sale el valor de la casilla (tooltip + descripción accesible) */
function describeSource({
  typeId,
  override,
  inheritedVisible,
  roles,
}: {
  typeId: string;
  override: boolean | undefined;
  inheritedVisible: boolean;
  roles: UserRoleVisibility[];
}): string {
  if (override !== undefined) {
    if (override === inheritedVisible) return 'Excepción de este usuario (coincide con lo que indican sus roles).';
    return override
      ? 'Excepción de este usuario: lo ve aunque sus roles lo ocultan.'
      : 'Excepción de este usuario: no lo ve aunque sus roles lo muestran.';
  }
  if (roles.length === 0) return 'Sin roles asignados: se ve por defecto.';
  if (!inheritedVisible) return `Lo ocultan todos sus roles: ${joinRoleNames(roles)}.`;

  const rolesShowing = roles.filter((role) => !role.hiddenTypeIds.includes(typeId));
  return rolesShowing.length === roles.length
    ? 'Ninguno de sus roles lo oculta.'
    : `Lo ve por ${rolesShowing.length === 1 ? 'el rol' : 'los roles'}: ${joinRoleNames(rolesShowing)}.`;
}

/**
 * Bloque "Tipos de equipamiento" dentro del módulo Mantenimiento del editor de permisos
 * del usuario (ticket 690). Igual que los permisos custom, cada casilla guarda al instante:
 * si el valor elegido difiere de lo que resuelven sus roles se guarda una excepción; si
 * coincide, se borra la excepción y vuelve a heredar.
 */
export function UserEquipmentTypesSection({ userId, disabled = false }: UserEquipmentTypesSectionProps) {
  const titleId = useId();
  const queryClient = useQueryClient();
  const visibilityKey = equipmentTypeVisibilityKeys.user(userId);
  const [announcement, setAnnouncement] = useState('');

  const typesQuery = useEquipmentTypesForVisibility();
  const visibilityQuery = useUserEquipmentTypeVisibility(userId);

  const mutationKey = ['set-user-equipment-type-visibility', userId];
  const pendingCount = useIsMutating({ mutationKey });
  const [pendingTypeIds, setPendingTypeIds] = useState<ReadonlySet<string>>(new Set());

  const visibilityMutation = useMutation({
    mutationKey,
    mutationFn: async ({ typeId, isVisible }: VisibilityChange) => {
      if (isVisible === null) await removeUserEquipmentTypeVisibility(userId, typeId);
      else await setUserEquipmentTypeVisibility(userId, typeId, isVisible);
    },
    // Actualización optimista: la casilla responde al instante y se revierte si falla
    onMutate: async ({ typeId, isVisible }) => {
      setPendingTypeIds((prev) => new Set(prev).add(typeId));
      await queryClient.cancelQueries({ queryKey: visibilityKey });
      const previous = queryClient.getQueryData<UserEquipmentTypeVisibility>(visibilityKey);
      if (previous) {
        queryClient.setQueryData<UserEquipmentTypeVisibility>(visibilityKey, {
          ...previous,
          overrides: [
            ...previous.overrides.filter((override) => override.typeId !== typeId),
            ...(isVisible === null ? [] : [{ typeId, isVisible }]),
          ],
        });
      }
      return { previous };
    },
    onSuccess: (_result, { typeName, isVisible }) => {
      setAnnouncement(
        isVisible === null
          ? `${typeName}: vuelve a heredar de sus roles.`
          : `${typeName}: ${isVisible ? 'ahora lo ve' : 'ya no lo ve'} (excepción de este usuario).`
      );
    },
    onError: (error, { typeName }, context) => {
      logger.error('Error al guardar visibilidad de tipo de equipamiento', { data: { error, userId, typeName } });
      if (context?.previous) queryClient.setQueryData(visibilityKey, context.previous);
      toast.error(`No se pudo guardar "${typeName}"`, {
        description: 'Se restauró el valor anterior. Intenta de nuevo.',
      });
    },
    onSettled: (_result, _error, { typeId }) => {
      setPendingTypeIds((prev) => {
        const next = new Set(prev);
        next.delete(typeId);
        return next;
      });
      // Refrescar solo cuando termina la última: evita pisar otra casilla optimista en vuelo
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.invalidateQueries({ queryKey: visibilityKey });
      }
    },
  });

  const visibility = visibilityQuery.data;
  const resolved = useMemo(() => {
    const hiddenByRoles = new Set(visibility?.hiddenByRolesTypeIds ?? []);
    const overrides = new Map((visibility?.overrides ?? []).map((override) => [override.typeId, override.isVisible]));
    return { hiddenByRoles, overrides };
  }, [visibility]);

  const types = typesQuery.data ?? [];
  const roles = visibility?.roles ?? [];
  // isPending (sin datos todavía), no isLoading: una query en cola sin fetch en curso
  // da isLoading=false y se dibujarían las casillas con la configuración vacía
  const isLoading = typesQuery.isPending || visibilityQuery.isPending;
  const hasLoadError = typesQuery.isError || visibilityQuery.isError;

  const rows = types.map((type) => {
    const inheritedVisible = !resolved.hiddenByRoles.has(type.id);
    const override = resolved.overrides.get(type.id);
    return {
      type,
      inheritedVisible,
      override,
      isVisible: override ?? inheritedVisible,
      description: describeSource({ typeId: type.id, override, inheritedVisible, roles }),
    };
  });
  const visibleCount = rows.filter((row) => row.isVisible).length;
  const overridesCount = rows.filter((row) => row.override !== undefined).length;

  const handleToggle = (row: (typeof rows)[number], nextVisible: boolean) => {
    if (disabled || pendingTypeIds.has(row.type.id)) return;
    // Si coincide con lo que dicen sus roles no hace falta excepción: vuelve a heredar
    visibilityMutation.mutate({
      typeId: row.type.id,
      typeName: row.type.name,
      isVisible: nextVisible === row.inheritedVisible ? null : nextVisible,
    });
  };

  const handleInherit = (row: (typeof rows)[number]) => {
    if (disabled || pendingTypeIds.has(row.type.id)) return;
    visibilityMutation.mutate({ typeId: row.type.id, typeName: row.type.name, isVisible: null });
  };

  const retry = () => {
    if (typesQuery.isError) void typesQuery.refetch();
    if (visibilityQuery.isError) void visibilityQuery.refetch();
  };

  return (
    <div role="group" aria-labelledby={titleId} aria-busy={isLoading || pendingCount > 0} className="space-y-3">
      <EquipmentTypesSectionHeader
        titleId={titleId}
        description={`Tildado: ve las solicitudes de mantenimiento de ese tipo. Cada cambio se guarda al instante y pisa lo que indican sus roles. Los vehículos no se ven afectados.${
          overridesCount > 0 ? ` Excepciones de este usuario: ${overridesCount}.` : ''
        }`}
        visibleCount={isLoading || hasLoadError ? undefined : visibleCount}
        total={isLoading || hasLoadError ? undefined : types.length}
      />

      {isLoading ? (
        <EquipmentTypesSectionSkeleton />
      ) : hasLoadError ? (
        <EquipmentTypesSectionError onRetry={retry} isRetrying={typesQuery.isFetching || visibilityQuery.isFetching} />
      ) : types.length === 0 ? (
        <EquipmentTypesSectionEmpty />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const checkboxId = `${titleId}-${row.type.id}`;
            const descriptionId = `${checkboxId}-source`;
            const isPending = pendingTypeIds.has(row.type.id);
            const isOverride = row.override !== undefined;
            const isRowDisabled = disabled || isPending;

            return (
              <div
                key={row.type.id}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-md border px-3 py-1.5 transition-colors',
                  row.isVisible ? 'border-primary/50 bg-primary/10' : 'border-border/50',
                  !isRowDisabled && 'hover:border-primary/30',
                  disabled && 'opacity-60'
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={row.isVisible}
                  disabled={isRowDisabled}
                  aria-describedby={descriptionId}
                  onCheckedChange={(checked) => handleToggle(row, checked === true)}
                />
                <label
                  htmlFor={checkboxId}
                  title={row.type.name}
                  className={cn(
                    'min-w-0 flex-1 truncate py-1 text-xs font-medium',
                    isRowDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
                    !row.isVisible && 'text-muted-foreground'
                  )}
                >
                  {row.type.name}
                </label>
                <span id={descriptionId} className="sr-only">
                  {row.description}
                </span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={isOverride ? 'secondary' : 'outline'}
                      className={cn('h-5 px-1.5 text-[10px]', !isOverride && 'font-medium text-muted-foreground')}
                      aria-hidden="true"
                    >
                      {isOverride && <UserCog />}
                      {isOverride ? 'Personalizado' : 'Heredado'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-64 text-xs">{row.description}</p>
                  </TooltipContent>
                </Tooltip>

                {isOverride && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={isRowDisabled}
                    onClick={() => handleInherit(row)}
                    aria-label={`Volver a heredar de sus roles: ${row.type.name}`}
                    title="Volver a heredar de sus roles"
                  >
                    <Undo2 />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Siempre montado: una región que se monta y desmonta no se anuncia */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
