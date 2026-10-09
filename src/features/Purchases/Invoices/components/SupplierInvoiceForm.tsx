'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnhancedDatePicker } from '@/components/ui/enhanced-datepicket';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { SearchCombobox } from '@/features/Warehouses/components/SearchCombobox';
import { formatMoney, formatQuantity, formatUnitCost } from '@/features/Warehouses/lib/format';
import { unwrapAction } from '@/features/Warehouses/lib/unwrap-action';
import { Logger } from '@/lib/logger';
import { CBTE_TYPES, DEFAULT_VAT_RATE_ID, VAT_RATE_LABELS, isCbteTypeId, type VoucherLetter } from '@/shared/lib/arca/catalogs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, Plus, ReceiptText, Trash2, TriangleAlert } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  createSupplierInvoice,
  getSupplierInvoiceFormData,
  updateSupplierInvoice,
  uploadSupplierInvoiceAttachment,
  type SupplierInvoiceFormData,
} from '../../actions/invoices.server';
import { searchSupplierOptions } from '../../actions/suppliers.server';
import { convertOrderLineForLetter, expectedOrderPrice, pendingToInvoice, pickableOrderLines } from '../../lib/invoice-form';
import { expectedSupplierLetter } from '../../lib/invoice-letter';
import { SUPPLIER_INVOICE_OBSERVATION_LABELS } from '../../lib/invoice-status';
import { computeInvoiceLine, computeSupplierInvoiceTotals, vatBreakdown } from '../../lib/invoice-totals';
import { invalidatePurchases } from '../../lib/invalidate';
import { comparePrices } from '../../lib/order-totals';
import { trimDecimals } from '../../lib/quantity-format';
import {
  INVOICE_ATTACHMENT_MAX_BYTES,
  INVOICE_ATTACHMENT_TYPES,
  SUPPLIER_INVOICE_CBTE_TYPES,
  SUPPLIER_INVOICE_TAX_KINDS,
  SUPPLIER_INVOICE_TAX_LABELS,
  supplierInvoiceFormSchema,
  type SupplierInvoiceFormValues,
} from '../../schemas/invoices';

const logger = new Logger('Purchases/SupplierInvoiceForm');

/** El comprobante + el PDF (opcional; se sube despues de guardar). */
const formSchema = supplierInvoiceFormSchema.and(
  z.object({
    attachment: z
      .custom<File | null>((value) => value === null || value instanceof File)
      .refine((file) => !file || file.size <= INVOICE_ATTACHMENT_MAX_BYTES, 'El archivo supera los 10 MB')
      .refine((file) => !file || (INVOICE_ATTACHMENT_TYPES as readonly string[]).includes(file.type), 'Tiene que ser PDF o imagen'),
  })
);

type FormValues = z.infer<typeof formSchema>;
type OrderLineOption = SupplierInvoiceFormData['orders'][number]['lines'][number] & { orderId: string; orderNumber: string };

export type SupplierInvoiceFormMode = { kind: 'create' } | { kind: 'edit'; invoiceId: string; label: string };

const RATE_OPTIONS = Object.entries(VAT_RATE_LABELS).map(([id, label]) => ({ id, label }));

const letterOf = (cbteType: number): VoucherLetter | null => (isCbteTypeId(cbteType) ? CBTE_TYPES[cbteType].letter : null);
const kindOf = (cbteType: number) => (isCbteTypeId(cbteType) ? CBTE_TYPES[cbteType].kind : 'invoice');

const emptyValues = (): FormValues => ({
  supplierId: '',
  cbteType: 1,
  salesPoint: '',
  number: '',
  issueDate: moment().format('YYYY-MM-DD'),
  dueDate: '',
  vatPeriod: moment().format('YYYY-MM'),
  cae: '',
  caeDueDate: '',
  relatedInvoiceId: '',
  notes: '',
  lines: [],
  vat: [],
  untaxed: '',
  exempt: '',
  taxes: [],
  attachment: null,
});

/**
 * Cargar o editar un comprobante de proveedor (spec Compras etapa 4 §4): datos, lineas (desde OC o
 * gastos), IVA por alicuota, tributos y total en vivo, con un solo Guardar. El control lo hace el
 * servidor; la fila avisa antes de guardar si el precio o la alicuota difieren de la OC.
 */
export function SupplierInvoiceForm({
  mode,
  initialValues,
  initialData,
  initialSupplierLabel,
}: {
  mode: SupplierInvoiceFormMode;
  initialValues?: SupplierInvoiceFormValues;
  initialData: SupplierInvoiceFormData;
  initialSupplierLabel?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [supplierLabel, setSupplierLabel] = useState<string | null>(initialSupplierLabel ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues ? { ...initialValues, attachment: null } : emptyValues(),
  });
  const lines = useFieldArray({ control: form.control, name: 'lines' });
  const taxes = useFieldArray({ control: form.control, name: 'taxes' });

  const supplierId = useWatch({ control: form.control, name: 'supplierId' });
  const cbteType = useWatch({ control: form.control, name: 'cbteType' });
  const watchedLines = useWatch({ control: form.control, name: 'lines' });
  const watchedVat = useWatch({ control: form.control, name: 'vat' });
  const watchedTaxes = useWatch({ control: form.control, name: 'taxes' });
  const untaxed = useWatch({ control: form.control, name: 'untaxed' });
  const exempt = useWatch({ control: form.control, name: 'exempt' });

  const excludeInvoiceId = mode.kind === 'edit' ? mode.invoiceId : undefined;
  const { data: formData, isFetching: loadingSupplier } = useQuery({
    queryKey: ['supplier-invoice-form', supplierId, excludeInvoiceId ?? null],
    queryFn: () => getSupplierInvoiceFormData(supplierId || undefined, { excludeInvoiceId }),
    initialData: supplierId === (initialData.supplier?.id ?? '') ? initialData : undefined,
    staleTime: 30 * 1000,
  });
  const data = formData ?? null;

  const letter = letterOf(cbteType);
  const kind = kindOf(cbteType);
  const expected = data?.supplier
    ? expectedSupplierLetter({
        supplierVatConditionId: data.supplier.vat_condition_id,
        supplierName: data.supplier.name,
        companyTaxCondition: data.companyTaxCondition,
      })
    : null;

  const orderLines = useMemo(() => {
    const map = new Map<string, OrderLineOption>();
    for (const order of data?.orders ?? []) {
      for (const line of order.lines) map.set(line.orderLineId, { ...line, orderId: order.id, orderNumber: order.number });
    }
    return map;
  }, [data]);

  // Importes en vivo (las lineas invalidas no suman: el schema las marca con su error).
  const amounts = (watchedLines ?? []).map((line) =>
    letter
      ? line.kind === 'order'
        ? computeInvoiceLine({ letter, quantity: line.quantity, unitPrice: line.unitPrice, vatRateId: line.vatRateId ? Number(line.vatRateId) : null })
        : computeInvoiceLine({ letter, net: line.net, vatRateId: line.vatRateId ? Number(line.vatRateId) : null })
      : null
  );
  const computedVat = letter
    ? vatBreakdown(
        amounts.flatMap((a, i) => (a ? [{ netTotal: a.netTotal, vatRateId: watchedLines[i]?.vatRateId ? Number(watchedLines[i]!.vatRateId) : null }] : [])),
        letter
      )
    : [];
  // `vat` del form guarda solo lo que el usuario corrigio; el resto es el calculado.
  const vatShown = computedVat.map((v) => ({ ...v, amount: watchedVat?.find((o) => o.vatRateId === v.vatRateId)?.amount ?? v.amount }));
  const totals = computeSupplierInvoiceTotals({
    lines: amounts.flatMap((a) => (a ? [a] : [])),
    vat: vatShown,
    untaxed,
    exempt,
    taxes: watchedTaxes ?? [],
  });

  const changeType = (next: number) => {
    const before = letterOf(form.getValues('cbteType'));
    const after = letterOf(next);
    form.setValue('cbteType', next, { shouldValidate: form.formState.isSubmitted });
    if (kindOf(next) === 'invoice') form.setValue('relatedInvoiceId', '');
    if (before && after && before !== after) {
      // C no discrimina IVA: las lineas de OC pasan de neto a final (o al reves) y recuperan la
      // alicuota de su OC; los gastos van sin alicuota en C y con la de defecto al salir de C.
      form.setValue('vat', []);
      form.getValues('lines').forEach((line, i) => {
        const source = line.kind === 'order' ? orderLines.get(line.orderLineId) : undefined;
        if (source) {
          const converted = convertOrderLineForLetter(line, source, before, after);
          form.setValue(`lines.${i}.unitPrice`, converted.unitPrice);
          form.setValue(`lines.${i}.vatRateId`, converted.vatRateId);
        } else if (after === 'C') {
          form.setValue(`lines.${i}.vatRateId`, '');
        } else if (before === 'C') {
          form.setValue(`lines.${i}.vatRateId`, String(DEFAULT_VAT_RATE_ID));
        }
      });
    }
  };

  const changeIssueDate = (value: string) => {
    const previousMonth = form.getValues('issueDate').slice(0, 7);
    form.setValue('issueDate', value, { shouldValidate: form.formState.isSubmitted });
    // El periodo acompaña al mes de emision mientras el usuario no lo haya movido.
    if (value && form.getValues('vatPeriod') === previousMonth) form.setValue('vatPeriod', value.slice(0, 7));
  };

  const changeSupplier = (option: { id: string; label: string } | null) => {
    form.setValue('supplierId', option?.id ?? '', { shouldValidate: form.formState.isSubmitted });
    setSupplierLabel(option?.label ?? null);
    form.setValue('relatedInvoiceId', '');
    // Las lineas de OC son del proveedor anterior.
    const keep = form.getValues('lines').filter((line) => line.kind === 'expense');
    form.setValue('lines', keep);
  };

  const setVatAmount = (vatRateId: number, amount: string) => {
    const others = (form.getValues('vat') ?? []).filter((v) => v.vatRateId !== vatRateId);
    form.setValue('vat', [...others, { vatRateId, amount }]);
  };

  const addOrderLines = (selected: (OrderLineOption & { quantity: string })[]) => {
    for (const line of selected) {
      lines.append({
        kind: 'order',
        orderLineId: line.orderLineId,
        expenseCategoryId: '',
        description: '',
        quantity: line.quantity,
        unitPrice: trimDecimals(expectedOrderPrice(line, letter ?? 'A')),
        net: '',
        vatRateId: letter === 'C' ? '' : String(line.vatRateId),
      });
    }
    setPickerOpen(false);
  };

  const addExpense = () =>
    lines.append({
      kind: 'expense',
      orderLineId: '',
      expenseCategoryId: data?.categories.length === 1 ? data.categories[0]!.id : '',
      description: '',
      quantity: '',
      unitPrice: '',
      net: '',
      vatRateId: letter === 'C' ? '' : String(DEFAULT_VAT_RATE_ID),
    });

  const save = useMutation({
    mutationFn: async ({ attachment, ...values }: FormValues) => {
      // Solo viajan las correcciones de IVA de alicuotas que siguen en las lineas.
      const rates = new Set(computedVat.map((v) => v.vatRateId));
      const payload = { ...values, vat: letter === 'C' ? [] : values.vat.filter((v) => rates.has(v.vatRateId)) };
      const saved = unwrapAction(
        mode.kind === 'edit' ? await updateSupplierInvoice(mode.invoiceId, payload) : await createSupplierInvoice(payload)
      );
      let attachError: string | null = null;
      if (attachment) {
        const body = new FormData();
        body.set('file', attachment);
        const uploaded = await uploadSupplierInvoiceAttachment(saved.id, body);
        if (!uploaded.ok) attachError = uploaded.error;
      }
      return { ...saved, attachError };
    },
    onSuccess: (saved) => {
      const verb = mode.kind === 'edit' ? 'guardada' : 'cargada';
      if (saved.status === 'OBSERVED') {
        const kinds = [...new Set(saved.observations.map((o) => SUPPLIER_INVOICE_OBSERVATION_LABELS[o.code]))].join(', ');
        const n = saved.observations.length;
        toast.warning(`${saved.label} ${verb}: observada, ${n} ${n === 1 ? 'diferencia' : 'diferencias'} (${kinds})`, {
          description: 'Quien tenga permiso de aprobar la revisa en el detalle.',
        });
      } else {
        toast.success(`${saved.label} ${verb}: conforme`);
      }
      if (saved.attachError) toast.warning('El comprobante quedó guardado, pero no se pudo subir el archivo', { description: saved.attachError });
      invalidatePurchases(queryClient);
      router.push(`/dashboard/purchases/invoices/${saved.id}`);
      router.refresh();
    },
    onError: (error) => {
      logger.error('Error al guardar el comprobante', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el comprobante');
    },
  });

  const linesError = form.formState.errors.lines;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del comprobante</CardTitle>
            <CardDescription>Como figura en la factura del proveedor.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Proveedor</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      queryKey={['purchase-supplier-options']}
                      search={searchSupplierOptions}
                      value={field.value}
                      selectedLabel={supplierLabel}
                      onSelect={changeSupplier}
                      placeholder="Elegí el proveedor"
                      searchPlaceholder="Razón social o CUIT…"
                      noun="proveedores"
                    />
                  </FormControl>
                  {expected && (
                    <FormDescription className={expected.ok && letter && expected.letter !== letter ? 'text-amber-700 dark:text-amber-400' : ''}>
                      {expected.ok ? expected.reason : expected.error}
                      {expected.ok && letter && expected.letter !== letter && ' Si la cargás igual, queda observada.'}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cbteType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={String(field.value)} onValueChange={(value) => changeType(Number(value))}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUPPLIER_INVOICE_CBTE_TYPES.map((id) => (
                        <SelectItem key={id} value={String(id)}>
                          {CBTE_TYPES[id].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-[2fr_3fr] gap-2">
              <FormField
                control={form.control}
                name="salesPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Punto de venta</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="0003" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="00012345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="issueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de emisión</FormLabel>
                  <FormControl>
                    <EnhancedDatePicker
                      date={field.value ? moment(field.value, 'YYYY-MM-DD').toDate() : undefined}
                      setDate={(date) => changeIssueDate(date ? moment(date).format('YYYY-MM-DD') : '')}
                      placeholder="DD/MM/AAAA"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimiento del pago (opcional)</FormLabel>
                  <FormControl>
                    <EnhancedDatePicker
                      date={field.value ? moment(field.value, 'YYYY-MM-DD').toDate() : undefined}
                      setDate={(date) => field.onChange(date ? moment(date).format('YYYY-MM-DD') : '')}
                      placeholder="DD/MM/AAAA"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vatPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período IVA</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                  <FormDescription>El mes del Libro IVA. Si el comprobante llegó tarde, imputalo al mes en curso.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-[3fr_2fr] gap-2">
              <FormField
                control={form.control}
                name="cae"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CAE (opcional)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" maxLength={14} placeholder="14 dígitos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="caeDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vto. CAE</FormLabel>
                    <FormControl>
                      <EnhancedDatePicker
                        date={field.value ? moment(field.value, 'YYYY-MM-DD').toDate() : undefined}
                        setDate={(date) => field.onChange(date ? moment(date).format('YYYY-MM-DD') : '')}
                        placeholder="DD/MM/AAAA"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {kind !== 'invoice' && (
              <FormField
                control={form.control}
                name="relatedInvoiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factura que corrige (opcional)</FormLabel>
                    <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}>
                      <FormControl>
                        <SelectTrigger disabled={!supplierId}>
                          <SelectValue placeholder="Sin vincular" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin vincular</SelectItem>
                        {(data?.invoices ?? [])
                          .filter((invoice) => letter && invoice.label.includes(`Factura ${letter} `))
                          .map((invoice) => (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              {invoice.label} · {moment(invoice.issueDate, 'YYYY-MM-DD').format('DD/MM/YYYY')} · {formatMoney(invoice.total)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="attachment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comprobante escaneado (opcional)</FormLabel>
                  <FormControl>
                    <Input type="file" accept="application/pdf,image/*" onChange={(e) => field.onChange(e.target.files?.[0] ?? null)} />
                  </FormControl>
                  <FormDescription>PDF o imagen, hasta 10 MB.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Observaciones (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Líneas</CardTitle>
              <CardDescription>Desde una OC del proveedor (lo recibido y no facturado) o gastos sin OC.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={!supplierId || loadingSupplier} onClick={() => setPickerOpen(true)}>
                <PackagePlus className="mr-1 h-4 w-4" />
                Agregar desde OC
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={addExpense}>
                <Plus className="mr-1 h-4 w-4" />
                Agregar gasto
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.fields.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {supplierId ? 'Agregá las líneas del comprobante.' : 'Elegí el proveedor para traer sus OC, o agregá un gasto.'}
              </p>
            )}
            {lines.fields.map((field, index) => (
              <InvoiceLineFields
                key={field.id}
                form={form}
                index={index}
                letter={letter}
                orderLine={orderLines.get(watchedLines?.[index]?.orderLineId ?? '') ?? null}
                categories={data?.categories ?? []}
                amount={amounts[index] ?? null}
                onRemove={() => lines.remove(index)}
              />
            ))}
            {linesError?.message && <p className="text-sm text-destructive">{linesError.message}</p>}
            {linesError?.root?.message && <p className="text-sm text-destructive">{linesError.root.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">IVA, tributos y total</CardTitle>
            <CardDescription>
              {letter === 'C'
                ? 'Un comprobante C no discrimina IVA.'
                : 'El IVA de cada alícuota se calcula de las líneas. Si el proveedor redondeó distinto, corregilo: más de $1 de diferencia la deja observada.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vatShown.length > 0 && (
              <div className="space-y-2">
                {vatShown.map((v) => (
                  <div key={v.vatRateId} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[8rem_1fr_10rem]">
                    <span className="text-sm font-medium">IVA {VAT_RATE_LABELS[v.vatRateId as keyof typeof VAT_RATE_LABELS]}</span>
                    <span className="hidden text-sm text-muted-foreground tabular-nums sm:block">sobre {formatMoney(v.base)}</span>
                    <Input
                      aria-label={`IVA ${VAT_RATE_LABELS[v.vatRateId as keyof typeof VAT_RATE_LABELS]}`}
                      inputMode="decimal"
                      className="text-right tabular-nums"
                      value={v.amount}
                      onChange={(e) => setVatAmount(v.vatRateId, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="untaxed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No gravado</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exempt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exento</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Percepciones e impuestos</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => taxes.append({ kind: 'VAT_PERCEPTION', provinceId: '', description: '', amount: '' })}
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar
              </Button>
            </div>
            {taxes.fields.map((field, index) => (
              <TaxFields
                key={field.id}
                form={form}
                index={index}
                provinces={data?.provinces ?? []}
                onRemove={() => taxes.remove(index)}
              />
            ))}

            <Separator />
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
              <dt className="text-muted-foreground">{letter === 'C' ? 'Importe de las líneas' : 'Neto gravado'}</dt>
              <dd className="text-right">{formatMoney(totals.netTaxed)}</dd>
              {letter !== 'C' && (
                <>
                  <dt className="text-muted-foreground">IVA</dt>
                  <dd className="text-right">{formatMoney(totals.vatTotal)}</dd>
                </>
              )}
              <dt className="text-muted-foreground">No gravado y exento</dt>
              <dd className="text-right">{formatMoney(String(Number(totals.netUntaxed) + Number(totals.exempt)))}</dd>
              <dt className="text-muted-foreground">Percepciones e impuestos</dt>
              <dd className="text-right">
                {formatMoney(String(Number(totals.vatPerceptions) + Number(totals.grossIncomePerceptions) + Number(totals.otherTaxes)))}
              </dd>
              <dt className="text-base font-semibold">Total</dt>
              <dd className="text-right text-base font-semibold">{formatMoney(totals.total)}</dd>
            </dl>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            <ReceiptText className="mr-1 h-4 w-4" />
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>

      <OrderLinesPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        orders={data?.orders ?? []}
        kind={kind}
        alreadyAdded={new Set((watchedLines ?? []).map((l) => l.orderLineId).filter(Boolean))}
        onAdd={addOrderLines}
      />
    </Form>
  );
}

function InvoiceLineFields({
  form,
  index,
  letter,
  orderLine,
  categories,
  amount,
  onRemove,
}: {
  form: UseFormReturn<FormValues>;
  index: number;
  letter: VoucherLetter | null;
  orderLine: OrderLineOption | null;
  categories: SupplierInvoiceFormData['categories'];
  amount: { netTotal: string; vatAmount: string } | null;
  onRemove: () => void;
}) {
  const line = useWatch({ control: form.control, name: `lines.${index}` });
  const isOrder = line?.kind === 'order';

  const expectedPrice = orderLine && letter ? expectedOrderPrice(orderLine, letter) : null;
  const priceDiffers = isOrder && expectedPrice !== null && line.unitPrice !== '' && comparePrices(line.unitPrice.replace(',', '.'), expectedPrice) !== 0;
  const rateDiffers = isOrder && orderLine && letter !== 'C' && line.vatRateId !== '' && Number(line.vatRateId) !== orderLine.vatRateId;
  const pending = orderLine ? pendingToInvoice(orderLine) : '0';

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-sm">
          {isOrder ? (
            orderLine ? (
              <>
                <p className="font-medium">
                  <span className="font-mono">{orderLine.orderNumber}</span> · {orderLine.label}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Recibido {formatQuantity(orderLine.received)} {orderLine.unitAbbr} · facturado {formatQuantity(orderLine.invoiced)} · por facturar{' '}
                  {formatQuantity(pending)} {orderLine.unitAbbr}
                </p>
              </>
            ) : (
              <p className="font-medium text-muted-foreground">Línea de OC</p>
            )
          ) : (
            <p className="font-medium">Gasto sin OC</p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Quitar la línea" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isOrder ? (
          <>
            <FormField
              control={form.control}
              name={`lines.${index}.quantity`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`lines.${index}.unitPrice`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{letter === 'C' ? 'Precio unitario final' : 'Precio unitario neto'}</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <>
            <FormField
              control={form.control}
              name={`lines.${index}.expenseCategoryId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={categories.length ? 'Elegí el concepto' : 'Sin conceptos: crealos en Configuración'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`lines.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Luz de octubre, base Neuquén" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`lines.${index}.net`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{letter === 'C' ? 'Importe' : 'Neto'}</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        {letter !== 'C' && (
          <FormField
            control={form.control}
            name={`lines.${index}.vatRateId`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alícuota</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="IVA" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RATE_OPTIONS.map((rate) => (
                      <SelectItem key={rate.id} value={rate.id}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="space-y-1">
          {priceDiffers && expectedPrice && (
            <p className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              En la {orderLine?.orderNumber} el precio es {formatUnitCost(expectedPrice)}: va a quedar observada.
            </p>
          )}
          {rateDiffers && orderLine && (
            <p className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              En la {orderLine.orderNumber} la alícuota es {VAT_RATE_LABELS[orderLine.vatRateId as keyof typeof VAT_RATE_LABELS]}: va a quedar observada.
            </p>
          )}
        </div>
        <span className="ml-auto tabular-nums text-muted-foreground">
          {amount ? `${letter === 'C' ? 'Importe' : 'Neto'} ${formatMoney(amount.netTotal)}` : '—'}
        </span>
      </div>
    </div>
  );
}

function TaxFields({
  form,
  index,
  provinces,
  onRemove,
}: {
  form: UseFormReturn<FormValues>;
  index: number;
  provinces: SupplierInvoiceFormData['provinces'];
  onRemove: () => void;
}) {
  const kind = useWatch({ control: form.control, name: `taxes.${index}.kind` });
  return (
    <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[12rem_1fr_9rem_auto] sm:items-start">
      <FormField
        control={form.control}
        name={`taxes.${index}.kind`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sm:sr-only">Tipo</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SUPPLIER_INVOICE_TAX_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {SUPPLIER_INVOICE_TAX_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {kind === 'GROSS_INCOME_PERCEPTION' ? (
        <FormField
          control={form.control}
          name={`taxes.${index}.provinceId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sm:sr-only">Provincia</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Provincia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={form.control}
          name={`taxes.${index}.description`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sm:sr-only">Descripción</FormLabel>
              <FormControl>
                <Input placeholder={kind === 'OTHER_TAX' ? 'Qué tributo es' : 'Detalle (opcional)'} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name={`taxes.${index}.amount`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sm:sr-only">Importe</FormLabel>
            <FormControl>
              <Input inputMode="decimal" placeholder="Importe" className="text-right tabular-nums" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 justify-self-end" aria-label="Quitar el tributo" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function OrderLinesPicker({
  open,
  onOpenChange,
  orders,
  kind,
  alreadyAdded,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: SupplierInvoiceFormData['orders'];
  kind: 'invoice' | 'debit_note' | 'credit_note';
  alreadyAdded: Set<string>;
  onAdd: (lines: (OrderLineOption & { quantity: string })[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const isCredit = kind === 'credit_note';
  const options = pickableOrderLines(orders, kind, alreadyAdded);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const close = (value: boolean) => {
    if (!value) setSelected(new Set());
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar desde OC</DialogTitle>
          <DialogDescription>
            {isCredit
              ? 'Líneas ya facturadas que la nota de crédito puede acreditar, con el precio y la alícuota de la OC.'
              : 'Líneas recibidas y todavía no facturadas, con el precio y la alícuota de la OC.'}
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <Alert>
            <AlertDescription>
              {isCredit ? 'Este proveedor no tiene líneas facturadas para acreditar.' : 'Este proveedor no tiene líneas recibidas pendientes de facturar.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {options.map((order) => (
              <div key={order.id} className="space-y-2">
                <p className="font-mono text-sm font-medium">{order.number}</p>
                {order.lines.map((line) => {
                  const id = `pick-${line.orderLineId}`;
                  return (
                    <div key={line.orderLineId} className="flex items-start gap-3 rounded-md border p-2">
                      <Checkbox id={id} checked={selected.has(line.orderLineId)} onCheckedChange={() => toggle(line.orderLineId)} />
                      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm">
                        <span className="block">{line.label}</span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {isCredit ? 'Facturado' : 'Por facturar'} {formatQuantity(line.quantity)} {line.unitAbbr} · {formatUnitCost(line.unitPrice)} +{' '}
                          {VAT_RATE_LABELS[line.vatRateId as keyof typeof VAT_RATE_LABELS]}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={selected.size === 0}
            onClick={() => {
              onAdd(options.flatMap((order) => order.lines.filter((line) => selected.has(line.orderLineId))));
              setSelected(new Set());
            }}
          >
            Agregar {selected.size > 0 ? selected.size : ''} {selected.size === 1 ? 'línea' : 'líneas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
