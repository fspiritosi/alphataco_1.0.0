'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { unwrapAction } from '@/features/Warehouses/lib/unwrap-action';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Landmark, Pencil, Plus, Power, RotateCcw, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  createTreasuryAccount,
  setTreasuryAccountActive,
  updateTreasuryAccount,
  type TreasuryAccountRow,
} from '../../actions/treasury-accounts.server';
import {
  TREASURY_ACCOUNT_KIND_LABELS,
  treasuryAccountFormSchema,
  type TreasuryAccountFormValues,
} from '../../schemas/payment-settings';

const logger = new Logger('Purchases/TreasuryAccountsSection');

const EMPTY: TreasuryAccountFormValues = { kind: 'BANK', name: '', bankName: '', accountNumber: '', cbu: '' };

/**
 * Cuentas y cajas desde las que se paga. Es el catalogo del futuro modulo de Tesoreria (saldos,
 * chequeras y conciliacion se suman ahi); desactivar una cuenta no toca los pagos registrados.
 */
export function TreasuryAccountsSection({ accounts, canUpdate }: { accounts: TreasuryAccountRow[]; canUpdate: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TreasuryAccountRow | 'new' | null>(null);

  const form = useForm<TreasuryAccountFormValues>({ resolver: zodResolver(treasuryAccountFormSchema), defaultValues: EMPTY });
  const kind = useWatch({ control: form.control, name: 'kind' });

  const openForm = (target: TreasuryAccountRow | 'new') => {
    form.reset(
      target === 'new'
        ? EMPTY
        : {
            kind: target.kind,
            name: target.name,
            bankName: target.bank_name ?? '',
            accountNumber: target.account_number ?? '',
            cbu: target.cbu ?? '',
          }
    );
    setEditing(target);
  };

  const save = useMutation({
    mutationFn: async (values: TreasuryAccountFormValues) =>
      unwrapAction(editing && editing !== 'new' ? await updateTreasuryAccount(editing.id, values) : await createTreasuryAccount(values)),
    onSuccess: (_data, values) => {
      toast.success(editing === 'new' ? `${values.name} creada` : `${values.name} actualizada`);
      setEditing(null);
      router.refresh();
    },
    onError: (error) => {
      logger.error('Error al guardar la cuenta', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la cuenta');
    },
  });

  const toggle = useMutation({
    mutationFn: async (account: TreasuryAccountRow) => unwrapAction(await setTreasuryAccountActive(account.id, !account.is_active)),
    onSuccess: (_data, account) => {
      toast.success(account.is_active ? `${account.name} desactivada` : `${account.name} reactivada`);
      router.refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo cambiar la cuenta'),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Cuentas y cajas</CardTitle>
          <CardDescription>Desde dónde se paga a los proveedores: cuentas bancarias y cajas de efectivo.</CardDescription>
        </div>
        {canUpdate && (
          <Button type="button" size="sm" variant="outline" onClick={() => openForm('new')}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay cuentas. Hacen falta para registrar pagos.</p>
        ) : (
          <ul className="divide-y">
            {accounts.map((a) => {
              const Icon = a.kind === 'BANK' ? Landmark : Wallet;
              return (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={a.is_active ? 'truncate' : 'truncate text-muted-foreground'}>{a.name}</span>
                      {!a.is_active && <Badge variant="outline">Inactiva</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {TREASURY_ACCOUNT_KIND_LABELS[a.kind]}
                      {a.bank_name ? ` · ${a.bank_name}` : ''}
                      {a.account_number ? ` · ${a.account_number}` : ''}
                      {a.cbu ? ` · CBU ${a.cbu}` : ''}
                    </p>
                  </div>
                  {canUpdate && (
                    <>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Editar ${a.name}`} onClick={() => openForm(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={a.is_active ? `Desactivar ${a.name}` : `Reactivar ${a.name}`}
                        onClick={() => toggle.mutate(a)}
                        disabled={toggle.isPending}
                      >
                        {a.is_active ? <Power className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Nueva cuenta o caja' : 'Editar cuenta o caja'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="space-y-4">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BANK">{TREASURY_ACCOUNT_KIND_LABELS.BANK}</SelectItem>
                        <SelectItem value="CASH">{TREASURY_ACCOUNT_KIND_LABELS.CASH}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input autoFocus placeholder={kind === 'BANK' ? 'Banco Galicia CC $' : 'Caja administración'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {kind === 'BANK' && (
                <>
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de cuenta (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cbu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CBU (opcional)</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" maxLength={22} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
