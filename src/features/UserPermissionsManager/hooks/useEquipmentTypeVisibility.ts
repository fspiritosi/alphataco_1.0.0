'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  getEquipmentTypesForVisibility,
  getRoleHiddenEquipmentTypeIds,
  getUserEquipmentTypeVisibility,
} from '../actions/equipmentTypeVisibility.server';

/** Query keys de la visibilidad por tipo de equipamiento (ticket 690) */
export const equipmentTypeVisibilityKeys = {
  types: ['equipment-types-for-visibility'] as const,
  role: (roleId: number) => ['role-hidden-equipment-types', roleId] as const,
  allUsers: ['user-equipment-type-visibility'] as const,
  user: (userId: string) => ['user-equipment-type-visibility', userId] as const,
};

/**
 * Catálogo de tipos de equipamiento. Se lee al abrir el editor para que un tipo
 * creado o dado de baja aparezca o desaparezca sin recargar la página.
 */
export function useEquipmentTypesForVisibility(enabled = true) {
  return useQuery({
    queryKey: equipmentTypeVisibilityKeys.types,
    queryFn: () => getEquipmentTypesForVisibility(),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Baseline de tipos ocultos de un rol. Siempre se relee de la base al abrir el diálogo
 * (`staleTime: 0`) y no se refresca solo al volver a la ventana, para no mover el baseline
 * mientras el usuario está editando.
 */
export function useRoleHiddenEquipmentTypeIds(roleId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: equipmentTypeVisibilityKeys.role(roleId ?? 0),
    queryFn: () => getRoleHiddenEquipmentTypeIds(roleId ?? 0),
    enabled: enabled && roleId !== null,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

/** Excepciones del usuario + lo que resuelven sus roles */
export function useUserEquipmentTypeVisibility(userId: string) {
  return useQuery({
    queryKey: equipmentTypeVisibilityKeys.user(userId),
    queryFn: () => getUserEquipmentTypeVisibility(userId),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export type RoleEquipmentTypeChanges = { hide: string[]; show: string[] };

/**
 * Estado del bloque "Tipos de equipamiento" en el diálogo de rol.
 *
 * Guarda solo lo que el usuario cambió (`draft`) encima del baseline leído de la base,
 * así el valor mostrado se deriva sin sincronizar estado con efectos, y al guardar se
 * mandan altas y bajas explícitas: `hide` (tipos que el rol deja de ver) y `show`
 * (tipos que vuelve a ver). Un rol nuevo parte de "ve todo".
 */
export function useRoleEquipmentTypesDraft({ roleId, enabled }: { roleId: number | null; enabled: boolean }) {
  const typesQuery = useEquipmentTypesForVisibility(enabled);
  const baselineQuery = useRoleHiddenEquipmentTypeIds(roleId, enabled);
  // typeId → oculto. Solo contiene tipos cuyo valor difiere del baseline
  const [draft, setDraft] = useState<Record<string, boolean>>({});

  const isNewRole = roleId === null;
  const baselineData = baselineQuery.data;
  const baseline = useMemo(() => new Set(isNewRole ? [] : baselineData ?? []), [isNewRole, baselineData]);
  const isBaselineReady = isNewRole || (baselineQuery.isSuccess && !baselineQuery.isFetching);

  const hiddenTypeIds = useMemo(() => {
    const hidden = new Set(baseline);
    for (const [typeId, isHidden] of Object.entries(draft)) {
      if (isHidden) hidden.add(typeId);
      else hidden.delete(typeId);
    }
    return hidden;
  }, [baseline, draft]);

  const changes = useMemo<RoleEquipmentTypeChanges>(() => {
    const hide: string[] = [];
    const show: string[] = [];
    for (const [typeId, isHidden] of Object.entries(draft)) {
      if (isHidden && !baseline.has(typeId)) hide.push(typeId);
      if (!isHidden && baseline.has(typeId)) show.push(typeId);
    }
    return { hide, show };
  }, [baseline, draft]);

  const toggle = useCallback(
    (typeId: string, visible: boolean) => {
      setDraft((prev) => {
        const next = { ...prev };
        if (baseline.has(typeId) === !visible) delete next[typeId];
        else next[typeId] = !visible;
        return next;
      });
    },
    [baseline]
  );

  const reset = useCallback(() => setDraft({}), []);

  return {
    typesQuery,
    baselineQuery,
    isNewRole,
    isBaselineReady,
    hiddenTypeIds,
    changes,
    hasChanges: changes.hide.length > 0 || changes.show.length > 0,
    toggle,
    reset,
  };
}

export type RoleEquipmentTypesDraft = ReturnType<typeof useRoleEquipmentTypesDraft>;
