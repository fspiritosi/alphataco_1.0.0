'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getActiveClothingBrands,
  getActiveClothingSizes,
  getItemBrandSizes,
  setItemBrandSizes,
} from '@/features/Clothing/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('ItemBrandSizeManager');

// ============================================================================
// TYPES
// ============================================================================

interface ItemBrandSizeManagerProps {
  /** If provided, operates in server mode (fetches/saves). If undefined, local mode (buffers in memory). */
  itemId?: string;
}

/** Internal representation: a brand with its selected size IDs */
interface BrandSizeGroup {
  brandId: string;
  sizeIds: string[];
}

export interface ItemBrandSizeManagerRef {
  /** Returns all pending combinations (local mode) or current server combinations */
  getCombinations: () => { brandId: string; sizeId: string }[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ItemBrandSizeManager = forwardRef<ItemBrandSizeManagerRef, ItemBrandSizeManagerProps>(
  function ItemBrandSizeManager({ itemId }, ref) {
    const queryClient = useQueryClient();
    const isLocalMode = !itemId;

    // ─── Local mode state (used when no itemId) ─────────────────────────────
    const [localGroups, setLocalGroups] = useState<BrandSizeGroup[]>([]);

    // ─── Fetch existing combinations (server mode only) ─────────────────────
    const { data: existingEntries, isLoading: isLoadingEntries } = useQuery({
      queryKey: ['item-brand-sizes', itemId],
      queryFn: () => getItemBrandSizes(itemId!),
      staleTime: 30 * 1000,
      enabled: !!itemId,
    });

    // ─── Fetch active brands and sizes (for comboboxes) ─────────────────────
    const { data: activeBrands, isLoading: isLoadingBrands } = useQuery({
      queryKey: ['active-clothing-brands'],
      queryFn: () => getActiveClothingBrands(),
      staleTime: 5 * 60 * 1000,
    });

    const { data: activeSizes, isLoading: isLoadingSizes } = useQuery({
      queryKey: ['active-clothing-sizes'],
      queryFn: () => getActiveClothingSizes(),
      staleTime: 5 * 60 * 1000,
    });

    // ─── UI state for "add combination" section ─────────────────────────────
    const [showAddSection, setShowAddSection] = useState(false);
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // ─── Derive current groups ──────────────────────────────────────────────
    const serverGroups = useMemo<BrandSizeGroup[]>(() => {
      if (!existingEntries) return [];

      const map = new Map<string, string[]>();
      for (const entry of existingEntries) {
        const brandId = entry.clothing_brand_id;
        const sizeId = entry.clothing_size_id;
        const existing = map.get(brandId) ?? [];
        existing.push(sizeId);
        map.set(brandId, existing);
      }

      return Array.from(map.entries()).map(([brandId, sizeIds]) => ({ brandId, sizeIds }));
    }, [existingEntries]);

    const currentGroups = isLocalMode ? localGroups : serverGroups;

    // ─── Expose combinations to parent via ref ──────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        getCombinations: () => {
          const groups = isLocalMode ? localGroups : serverGroups;
          return groups.flatMap((g) => g.sizeIds.map((sizeId) => ({ brandId: g.brandId, sizeId })));
        },
      }),
      [isLocalMode, localGroups, serverGroups]
    );

    // ─── Handler: toggle size checkbox in the "add" section ─────────────────
    const handleToggleSize = useCallback((sizeId: string, checked: boolean) => {
      setSelectedSizeIds((prev) => (checked ? [...prev, sizeId] : prev.filter((id) => id !== sizeId)));
    }, []);

    // ─── Handler: remove an entire brand group ──────────────────────────────
    const handleRemoveBrandGroup = useCallback(
      async (brandIdToRemove: string) => {
        if (isLocalMode) {
          setLocalGroups((prev) => prev.filter((g) => g.brandId !== brandIdToRemove));
          toast.success('Combinación eliminada');
          return;
        }

        logger.debug('Removing brand group', { data: { itemId, brandIdToRemove } });

        const remainingEntries = (existingEntries ?? [])
          .filter((e) => e.clothing_brand_id !== brandIdToRemove)
          .map((e) => ({ brandId: e.clothing_brand_id, sizeId: e.clothing_size_id }));

        try {
          await setItemBrandSizes(itemId!, remainingEntries);
          toast.success('Combinación eliminada');
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['item-brand-sizes', itemId] }),
            queryClient.invalidateQueries({ queryKey: ['clothing-items'] }),
          ]);
        } catch (error) {
          logger.error('Error removing brand group', { data: { error, itemId, brandIdToRemove } });
          toast.error('Error al eliminar la combinación');
        }
      },
      [isLocalMode, existingEntries, itemId, queryClient]
    );

    // ─── Handler: save the new combination ──────────────────────────────────
    const handleSaveNewCombination = useCallback(async () => {
      if (!selectedBrandId || selectedSizeIds.length === 0) {
        toast.error('Seleccioná una marca y al menos un talle');
        return;
      }

      if (isLocalMode) {
        setLocalGroups((prev) => {
          const withoutBrand = prev.filter((g) => g.brandId !== selectedBrandId);
          return [...withoutBrand, { brandId: selectedBrandId, sizeIds: selectedSizeIds }];
        });
        toast.success('Combinación agregada');
        setShowAddSection(false);
        setSelectedBrandId('');
        setSelectedSizeIds([]);
        return;
      }

      logger.debug('Saving new brand-size combination', {
        data: { itemId, brandId: selectedBrandId, sizeIds: selectedSizeIds },
      });

      setIsSaving(true);

      try {
        const existing = (existingEntries ?? []).map((e) => ({
          brandId: e.clothing_brand_id,
          sizeId: e.clothing_size_id,
        }));

        const newEntries = selectedSizeIds.map((sizeId) => ({
          brandId: selectedBrandId,
          sizeId,
        }));

        const existingForOtherBrands = existing.filter((e) => e.brandId !== selectedBrandId);

        await setItemBrandSizes(itemId!, [...existingForOtherBrands, ...newEntries]);

        toast.success('Combinación guardada');
        setShowAddSection(false);
        setSelectedBrandId('');
        setSelectedSizeIds([]);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['item-brand-sizes', itemId] }),
          queryClient.invalidateQueries({ queryKey: ['clothing-items'] }),
        ]);
      } catch (error) {
        logger.error('Error saving brand-size combination', { data: { error, itemId } });
        toast.error('Error al guardar la combinación');
      } finally {
        setIsSaving(false);
      }
    }, [selectedBrandId, selectedSizeIds, isLocalMode, existingEntries, itemId, queryClient]);

    const handleCancelAdd = useCallback(() => {
      setShowAddSection(false);
      setSelectedBrandId('');
      setSelectedSizeIds([]);
    }, []);

    // ─── Helpers ────────────────────────────────────────────────────────────
    const getBrandName = useCallback(
      (brandId: string) => activeBrands?.find((b) => b.id === brandId)?.name ?? brandId,
      [activeBrands]
    );

    const getSizeName = useCallback(
      (sizeId: string) => activeSizes?.find((s) => s.id === sizeId)?.name ?? sizeId,
      [activeSizes]
    );

    const isLoading = isLocalMode
      ? isLoadingBrands || isLoadingSizes
      : isLoadingEntries || isLoadingBrands || isLoadingSizes;

    // ─── Render ─────────────────────────────────────────────────────────────
    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Marcas y Talles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Marcas y Talles</CardTitle>
            {!showAddSection && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddSection(true)}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar combinación
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current combinations grouped by brand */}
          {currentGroups.length === 0 && !showAddSection ? (
            <p className="text-sm text-muted-foreground">Sin combinaciones asignadas.</p>
          ) : (
            <div className="space-y-3">
              {currentGroups.map(({ brandId, sizeIds }) => (
                <div key={brandId} className="flex items-start justify-between gap-2 rounded-md border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{getBrandName(brandId)}</p>
                    <div className="flex flex-wrap gap-1">
                      {sizeIds.map((sizeId) => (
                        <Badge key={sizeId} variant="secondary" className="text-xs">
                          {getSizeName(sizeId)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBrandGroup(brandId)}
                    className="h-7 w-7 shrink-0 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Eliminar marca</span>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add combination section */}
          {showAddSection && (
            <div className="rounded-md border border-dashed p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Nueva combinación</p>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelAdd} className="h-7 w-7 p-0">
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Cancelar</span>
                </Button>
              </div>

              {/* Brand selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Marca</Label>
                <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccioná una marca..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(activeBrands ?? []).map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Size multi-select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Talles</Label>
                {(activeSizes ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay talles activos disponibles.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {(activeSizes ?? []).map((size) => (
                      <div key={size.id} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`size-${size.id}`}
                          checked={selectedSizeIds.includes(size.id)}
                          onCheckedChange={(checked) => handleToggleSize(size.id, checked === true)}
                        />
                        <Label htmlFor={`size-${size.id}`} className="cursor-pointer text-sm font-normal">
                          {size.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save button */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCancelAdd} className="h-8">
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNewCombination}
                  disabled={isSaving || !selectedBrandId || selectedSizeIds.length === 0}
                  className="h-8"
                >
                  {isSaving ? 'Guardando...' : 'Guardar combinación'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
