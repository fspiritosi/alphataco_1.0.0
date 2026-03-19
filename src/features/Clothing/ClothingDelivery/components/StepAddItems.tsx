'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getBrandsForItem,
  getItemsForDelivery,
  getSizesForItemBrand,
} from '@/features/Clothing/ClothingDelivery/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { useQuery } from '@tanstack/react-query';
import { Package, Plus, Trash2 } from 'lucide-react';
import { useCallback, useId } from 'react';

const logger = new Logger('Clothing/StepAddItems');

export type WizardItem = {
  clothingItemId: string;
  itemName: string;
  clothingBrandId?: string;
  brandName?: string;
  clothingSizeId?: string;
  sizeName?: string;
  quantity: number;
};

interface ItemRowProps {
  index: number;
  item: WizardItem;
  companyId: string;
  onUpdate: (index: number, updated: Partial<WizardItem>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function ItemRow({ index, item, companyId, onUpdate, onRemove, canRemove }: ItemRowProps) {
  const idPrefix = useId();

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['clothing-items-for-delivery', companyId],
    queryFn: () => getItemsForDelivery(companyId),
    staleTime: 60_000,
  });

  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ['clothing-brands-for-item', item.clothingItemId],
    queryFn: () => getBrandsForItem(item.clothingItemId),
    staleTime: 60_000,
    enabled: !!item.clothingItemId,
  });

  const { data: sizes = [], isLoading: loadingSizes } = useQuery({
    queryKey: ['clothing-sizes-for-item-brand', item.clothingItemId, item.clothingBrandId],
    queryFn: () => getSizesForItemBrand(item.clothingItemId, item.clothingBrandId!),
    staleTime: 60_000,
    enabled: !!item.clothingItemId && !!item.clothingBrandId,
  });

  const handleItemChange = useCallback(
    (itemId: string) => {
      const selected = items.find((i) => i.id === itemId);
      logger.debug('Item selected in row', { data: { index, itemId } });
      onUpdate(index, {
        clothingItemId: itemId,
        itemName: selected?.name ?? '',
        clothingBrandId: undefined,
        brandName: undefined,
        clothingSizeId: undefined,
        sizeName: undefined,
      });
    },
    [index, items, onUpdate]
  );

  const handleBrandChange = useCallback(
    (brandId: string) => {
      const selected = brands.find((b) => b?.id === brandId);
      logger.debug('Brand selected in row', { data: { index, brandId } });
      onUpdate(index, {
        clothingBrandId: brandId,
        brandName: selected?.name ?? '',
        clothingSizeId: undefined,
        sizeName: undefined,
      });
    },
    [index, brands, onUpdate]
  );

  const handleSizeChange = useCallback(
    (sizeId: string) => {
      const selected = sizes.find((s) => s?.id === sizeId);
      logger.debug('Size selected in row', { data: { index, sizeId } });
      onUpdate(index, {
        clothingSizeId: sizeId,
        sizeName: selected?.name ?? '',
      });
    },
    [index, sizes, onUpdate]
  );

  const handleQuantityChange = useCallback(
    (val: string) => {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 1) {
        onUpdate(index, { quantity: num });
      }
    },
    [index, onUpdate]
  );

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Package className="h-4 w-4" />
          Artículo {index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Article */}
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-item`} className="text-xs">
            Artículo <span className="text-destructive">*</span>
          </Label>
          <Select value={item.clothingItemId || undefined} onValueChange={handleItemChange}>
            <SelectTrigger id={`${idPrefix}-item`} className="h-9">
              <SelectValue placeholder={loadingItems ? 'Cargando...' : 'Seleccionar artículo'} />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.code ? `[${i.code}] ${i.name}` : i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-qty`} className="text-xs">
            Cantidad <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${idPrefix}-qty`}
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Brand */}
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-brand`} className="text-xs">
            Marca
          </Label>
          <Select
            value={item.clothingBrandId || undefined}
            onValueChange={handleBrandChange}
            disabled={!item.clothingItemId || loadingBrands}
          >
            <SelectTrigger id={`${idPrefix}-brand`} className="h-9">
              <SelectValue
                placeholder={
                  !item.clothingItemId
                    ? 'Seleccione artículo primero'
                    : loadingBrands
                      ? 'Cargando...'
                      : brands.length === 0
                        ? 'Sin marcas disponibles'
                        : 'Seleccionar marca'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) =>
                b ? (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-size`} className="text-xs">
            Talle
          </Label>
          <Select
            value={item.clothingSizeId || undefined}
            onValueChange={handleSizeChange}
            disabled={!item.clothingBrandId || loadingSizes}
          >
            <SelectTrigger id={`${idPrefix}-size`} className="h-9">
              <SelectValue
                placeholder={
                  !item.clothingBrandId
                    ? 'Seleccione marca primero'
                    : loadingSizes
                      ? 'Cargando...'
                      : sizes.length === 0
                        ? 'Sin talles disponibles'
                        : 'Seleccionar talle'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((s) =>
                s ? (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

interface StepAddItemsProps {
  companyId: string;
  items: WizardItem[];
  onChange: (items: WizardItem[]) => void;
}

const emptyItem = (): WizardItem => ({
  clothingItemId: '',
  itemName: '',
  clothingBrandId: undefined,
  brandName: undefined,
  clothingSizeId: undefined,
  sizeName: undefined,
  quantity: 1,
});

export function StepAddItems({ companyId, items, onChange }: StepAddItemsProps) {
  const handleAdd = useCallback(() => {
    onChange([...items, emptyItem()]);
  }, [items, onChange]);

  const handleUpdate = useCallback(
    (index: number, updated: Partial<WizardItem>) => {
      const next = items.map((item, i) => (i === index ? { ...item, ...updated } : item));
      onChange(next);
    },
    [items, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange]
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1.5 text-foreground">Artículos a entregar</p>
        <p className="text-sm text-muted-foreground mb-3">
          Agregue todos los artículos de la entrega. Debe haber al menos uno.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <ItemRow
            key={index}
            index={index}
            item={item}
            companyId={companyId}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            canRemove={items.length > 1}
          />
        ))}
      </div>

      <Button type="button" variant="outline" onClick={handleAdd} className="w-full gap-2 border-dashed">
        <Plus className="h-4 w-4" />
        Agregar artículo
      </Button>
    </div>
  );
}
