'use client';

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { VAT_RATE_LABELS, type VatRateId, type VoucherLetter } from '@/shared/lib/arca/catalogs';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { memo, useCallback, useRef } from 'react';
import { useFieldArray, useFormContext, useWatch, type Control } from 'react-hook-form';
import { toast } from 'sonner';
import { formatDecimalText } from '../../utils/number-text';
import { editorLineNet, newEditorLine, type EditorValues } from './editor-form';

/** Orden de las alícuotas en el select: de la más usada a la menos. */
const VAT_OPTIONS: VatRateId[] = [5, 4, 6, 8, 9, 3];

const COLUMN_GRID =
  '@3xl/lines:grid-cols-[minmax(0,1fr)_6.5rem_8.5rem_6.5rem_8rem_2.5rem] @3xl/lines:items-start @3xl/lines:gap-x-3';

type LinesEditorProps = {
  letter: VoucherLetter;
  currency: string;
  canEdit: boolean;
  canViewPrices: boolean;
};

/**
 * Líneas del comprobante. Una sola presentación que se adapta al ancho de SU columna (container
 * query `@container/lines`): en angosto cada línea es una tarjeta con labels visibles; en ancho,
 * una fila con encabezados de columna. Los labels siguen existiendo (sr-only) para que cada campo
 * tenga nombre accesible con su número de línea.
 */
export function InvoiceLinesEditor({ letter, currency, canEdit, canViewPrices }: LinesEditorProps) {
  const { control, getValues } = useFormContext<EditorValues>();
  // `keyName` propio: el `id` de la línea es un dato (lo usa el servidor para reconocer las de certificaciones).
  const { fields, append, remove, insert } = useFieldArray({ control, name: 'lines', keyName: 'key' });
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const showVat = letter !== 'C';
  const hasLocked = fields.some((f) => f.locked);

  const handleRemove = useCallback(
    (index: number) => {
      const removed = getValues(`lines.${index}`);
      remove(index);
      // Foco a la línea anterior (o al botón de agregar): nunca queda en el vacío.
      requestAnimationFrame(() => {
        const previous = document.querySelector<HTMLElement>(`[data-field="lines.${index - 1}.description"] textarea`);
        (previous ?? addButtonRef.current)?.focus();
      });
      // Reversible y frecuente: se deshace en vez de confirmar.
      toast(`Línea ${index + 1} quitada.`, {
        duration: 8000,
        action: { label: 'Deshacer', onClick: () => insert(index, removed) },
      });
    },
    [getValues, insert, remove]
  );

  return (
    <section aria-labelledby="invoice-lines-title" className="flex flex-col gap-3" data-field="lines">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="invoice-lines-title" className="text-lg font-semibold" tabIndex={-1}>
          Líneas <span className="text-muted-foreground font-normal tabular-nums">({fields.length})</span>
        </h2>
        {!canViewPrices && (
          <p className="text-muted-foreground text-sm">Los importes están ocultos: necesitás el permiso Ver precios.</p>
        )}
      </div>

      {hasLocked && (
        <p className="text-muted-foreground flex items-start gap-2 text-sm text-pretty">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Cantidades y precios de las líneas de certificaciones no se modifican. Para cambiarlos, quitá la certificación de
          esta factura.
        </p>
      )}

      <div className="@container/lines min-w-0">
        {fields.length === 0 ? (
          <div className="flex flex-col items-start gap-2 border px-4 py-6">
            <p className="font-medium">La factura no tiene líneas.</p>
            <p className="text-muted-foreground text-sm">Agregá al menos una para poder emitirla.</p>
          </div>
        ) : (
          <>
            {/* Encabezados visuales del modo fila (los campos tienen su propio label accesible). */}
            <div
              aria-hidden
              className={cn(
                'text-muted-foreground hidden border-b pb-2 text-xs font-medium tracking-wide uppercase @3xl/lines:grid',
                COLUMN_GRID
              )}
            >
              <span>Descripción</span>
              <span className="text-right">Cantidad</span>
              <span className="text-right">{canViewPrices ? 'P. unit. neto' : ''}</span>
              <span>{showVat ? 'IVA' : ''}</span>
              <span className="text-right">{canViewPrices ? 'Subtotal neto' : ''}</span>
              <span />
            </div>
            <ol className="flex flex-col divide-y">
              {fields.map((field, index) => (
                <InvoiceLineItem
                  key={field.key}
                  index={index}
                  control={control}
                  locked={field.locked}
                  lockedNet={field.lockedNet}
                  currency={currency}
                  showVat={showVat}
                  canEdit={canEdit}
                  canViewPrices={canViewPrices}
                  onRemove={handleRemove}
                />
              ))}
            </ol>
          </>
        )}
      </div>

      {canEdit && (
        <Button
          ref={addButtonRef}
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() =>
            append(newEditorLine(letter), { shouldFocus: true, focusName: `lines.${fields.length}.description` })
          }
        >
          <Plus aria-hidden />
          Agregar línea
        </Button>
      )}
    </section>
  );
}

type LineItemProps = {
  index: number;
  control: Control<EditorValues>;
  locked: boolean;
  lockedNet: string | null;
  currency: string;
  showVat: boolean;
  canEdit: boolean;
  canViewPrices: boolean;
  onRemove: (index: number) => void;
};

/**
 * Una línea. Memoizada y con su propio `useWatch`: tipear en la línea 3 re-renderiza esa línea y
 * los totales, no el editor entero.
 */
const InvoiceLineItem = memo(function InvoiceLineItem({
  index,
  control,
  locked,
  lockedNet,
  currency,
  showVat,
  canEdit,
  canViewPrices,
  onRemove,
}: LineItemProps) {
  const n = index + 1;
  const [quantity, unitPrice] = useWatch({ control, name: [`lines.${index}.quantity`, `lines.${index}.unitPrice`] });
  const net = editorLineNet({ locked, lockedNet, quantity, unitPrice });
  const editableNumbers = canEdit && !locked;
  const labelClass = '@3xl/lines:sr-only';

  return (
    <li className={cn('grid grid-cols-2 gap-x-3 gap-y-3 py-3', COLUMN_GRID)} data-field={`lines.${index}`}>
      <FormField
        control={control}
        name={`lines.${index}.description`}
        render={({ field }) => (
          <FormItem className="col-span-2 @3xl/lines:col-span-1" data-field={`lines.${index}.description`}>
            <FormLabel className={labelClass}>Descripción, línea {n}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                rows={1}
                readOnly={!canEdit}
                autoComplete="off"
                className="min-h-9 resize-none py-1.5"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`lines.${index}.quantity`}
        render={({ field }) => (
          <FormItem data-field={`lines.${index}.quantity`}>
            <FormLabel className={labelClass}>
              Cantidad, línea {n}
            </FormLabel>
            <FormControl>
              {editableNumbers ? (
                <Input {...field} type="text" inputMode="decimal" autoComplete="off" placeholder="0" className="text-right tabular-nums" />
              ) : (
                <Input
                  name={field.name}
                  ref={field.ref}
                  value={formatDecimalText(field.value || '0', 0)}
                  readOnly
                  className="bg-muted/40 text-right tabular-nums"
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {canViewPrices ? (
        <FormField
          control={control}
          name={`lines.${index}.unitPrice`}
          render={({ field }) => (
            <FormItem data-field={`lines.${index}.unitPrice`}>
              <FormLabel className={labelClass}>Precio unitario neto (sin IVA), línea {n}</FormLabel>
              <FormControl>
                {editableNumbers ? (
                  <Input {...field} type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" className="text-right tabular-nums" />
                ) : (
                  <Input
                    name={field.name}
                    ref={field.ref}
                    value={formatDecimalText(field.value || '0', 2)}
                    readOnly
                    className="bg-muted/40 text-right tabular-nums"
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <span className="hidden @3xl/lines:block" />
      )}

      {showVat ? (
        <FormField
          control={control}
          name={`lines.${index}.vatRateId`}
          render={({ field }) => (
            <FormItem data-field={`lines.${index}.vatRateId`}>
              <FormLabel className={labelClass}>IVA, línea {n}</FormLabel>
              <Select
                value={field.value === null ? '' : String(field.value)}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={!canEdit}
              >
                <FormControl>
                  <SelectTrigger ref={field.ref} className="w-full tabular-nums">
                    <SelectValue placeholder="Elegí" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    {VAT_OPTIONS.map((id) => (
                      <SelectItem key={id} value={String(id)}>
                        {VAT_RATE_LABELS[id]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <span className="hidden @3xl/lines:block" />
      )}

      {canViewPrices ? (
        <div className="flex flex-col gap-2 @3xl/lines:pt-2 @3xl/lines:text-right">
          <span className={cn('text-sm font-medium', labelClass)}>Subtotal neto, línea {n}</span>
          <span className="text-muted-foreground text-sm whitespace-nowrap tabular-nums">
            {net === null ? '—' : `${currency} ${formatDecimalText(net, 2)}`}
          </span>
        </div>
      ) : (
        <span className="hidden @3xl/lines:block" />
      )}

      <div className="col-span-2 flex justify-end @3xl/lines:col-span-1">
        {canEdit && !locked && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={`Quitar línea ${n}`}
            onClick={() => onRemove(index)}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
    </li>
  );
});

