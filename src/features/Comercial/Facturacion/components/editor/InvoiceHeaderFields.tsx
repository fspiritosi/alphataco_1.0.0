'use client';

import { EnhancedDatePicker } from '@/components/ui/enhanced-datepicket';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatSalesPointNumber } from '@/features/Empresa/General/FiscalData/utils/format';
import { CONCEPTS, type ConceptId } from '@/shared/lib/arca/catalogs';
import moment from 'moment';
import Link from 'next/link';
import { useFormContext, useWatch } from 'react-hook-form';
import { issueDateWindowDays } from '../../lib/invoice-validation';
import { FISCAL_DATA_HREF } from '../../utils/invoice-links';
import type { EditorValues } from './editor-form';

const CONCEPT_IDS = Object.keys(CONCEPTS).map(Number) as ConceptId[];

type SalesPoint = { id: string; number: number; name: string; is_active: boolean };

/** Fecha del form (`YYYY-MM-DD` | null) ↔ `Date` del date picker. */
function toPickerDate(value: string | null): Date | undefined {
  return value ? moment(value, 'YYYY-MM-DD').toDate() : undefined;
}
function fromPickerDate(date: Date | undefined): string | null {
  return date ? moment(date).format('YYYY-MM-DD') : null;
}

type Props = {
  salesPoints: SalesPoint[];
  canEdit: boolean;
  /** Viene de certificaciones: el concepto es Servicios y no se cambia. */
  conceptFixed: boolean;
};

/** Encabezado del comprobante: punto de venta, fecha, concepto, período y vencimiento del pago. */
export function InvoiceHeaderFields({ salesPoints, canEdit, conceptFixed }: Props) {
  const { control } = useFormContext<EditorValues>();
  const concept = useWatch({ control, name: 'concept' });
  const includesServices = concept !== 1;
  const activeSalesPoints = salesPoints.filter((sp) => sp.is_active);

  return (
    <section aria-labelledby="invoice-header-title" className="flex flex-col gap-4">
      <h2 id="invoice-header-title" className="text-lg font-semibold">
        Encabezado
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {activeSalesPoints.length === 0 && salesPoints.length === 0 ? (
          <div data-field="salesPointId" className="text-sm sm:col-span-2" tabIndex={-1}>
            <p className="font-medium">Punto de venta</p>
            <p className="text-muted-foreground">
              No hay puntos de venta activos.{' '}
              <Link href={FISCAL_DATA_HREF} className="text-foreground font-medium underline underline-offset-4">
                Cargá uno en Datos fiscales
              </Link>
            </p>
          </div>
        ) : (
          <FormField
            control={control}
            name="salesPointId"
            render={({ field }) => (
              <FormItem data-field="salesPointId">
                <FormLabel>Punto de venta</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                  <FormControl>
                    <SelectTrigger ref={field.ref} className="w-full tabular-nums">
                      <SelectValue placeholder="Elegí un punto de venta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup>
                      {salesPoints.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id} disabled={!sp.is_active}>
                          <span className="tabular-nums">{formatSalesPointNumber(sp.number)}</span> · {sp.name}
                          {!sp.is_active && ' (desactivado)'}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={control}
          name="issueDate"
          render={({ field }) => (
            <FormItem data-field="issueDate">
              <FormLabel>Fecha de emisión</FormLabel>
              <FormControl>
                <EnhancedDatePicker
                  name={field.name}
                  date={toPickerDate(field.value)}
                  setDate={(date) => field.onChange(fromPickerDate(date) ?? '')}
                />
              </FormControl>
              <FormDescription>
                ARCA acepta hasta {issueDateWindowDays(concept)} días antes o después de hoy.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {conceptFixed ? (
          <div className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Concepto</span>
            <span>
              Servicios <span className="text-muted-foreground">· sale de las certificaciones y no se cambia.</span>
            </span>
          </div>
        ) : (
          <FormField
            control={control}
            name="concept"
            render={({ field }) => (
              <FormItem className="sm:col-span-2" data-field="concept">
                <FormLabel>Concepto</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                    disabled={!canEdit}
                    className="flex flex-wrap gap-x-6 gap-y-2"
                  >
                    {CONCEPT_IDS.map((id) => (
                      <FormItem key={id} className="flex flex-row items-center gap-2">
                        <FormControl>
                          <RadioGroupItem value={String(id)} />
                        </FormControl>
                        <FormLabel className="font-normal">{CONCEPTS[id]}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {includesServices && (
          <>
            <FormField
              control={control}
              name="serviceFrom"
              render={({ field }) => (
                <FormItem data-field="serviceFrom">
                  <FormLabel>Período facturado desde</FormLabel>
                  <FormControl>
                    <EnhancedDatePicker
                      name={field.name}
                      date={toPickerDate(field.value)}
                      setDate={(date) => field.onChange(fromPickerDate(date))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="serviceTo"
              render={({ field }) => (
                <FormItem data-field="serviceTo">
                  <FormLabel>Período facturado hasta</FormLabel>
                  <FormControl>
                    <EnhancedDatePicker
                      name={field.name}
                      date={toPickerDate(field.value)}
                      setDate={(date) => field.onChange(fromPickerDate(date))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="paymentDueDate"
              render={({ field }) => (
                <FormItem data-field="paymentDueDate">
                  <FormLabel>Vencimiento del pago</FormLabel>
                  <FormControl>
                    <EnhancedDatePicker
                      name={field.name}
                      date={toPickerDate(field.value)}
                      setDate={(date) => field.onChange(fromPickerDate(date))}
                    />
                  </FormControl>
                  <FormDescription>Con servicios, ARCA lo pide.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </div>
    </section>
  );
}
