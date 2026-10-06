'use client';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import {
  searchEmployeeOptions,
  searchMaintenanceOrderOptions,
  searchOtherEquipmentOptions,
  searchVehicleOptions,
  type MovementFormLookups,
} from '../../actions/options.server';
import { SearchCombobox, type SearchOption } from '../../components/SearchCombobox';
import { contractLabel, DESTINATION_TYPE_LABELS } from '../../lib/labels';
import { STOCK_DESTINATION_TYPES, type StockMovementFormValues } from '../../schemas/stock-movement';

/** Valor del Select para "sin contrato" (un SelectItem no admite value vacio). */
const NO_CONTRACT = '__none__';

type SearchField = 'employeeId' | 'vehicleId' | 'otherEquipmentId' | 'maintenanceOrderId';

const SEARCHES: Record<
  'EMPLOYEE' | 'VEHICLE' | 'OTHER_EQUIPMENT' | 'MAINTENANCE_ORDER',
  {
    field: SearchField;
    search: (query: string) => Promise<{ items: SearchOption[]; total: number }>;
    placeholder: string;
    searchPlaceholder: string;
    noun: string;
  }
> = {
  EMPLOYEE: {
    field: 'employeeId',
    search: searchEmployeeOptions,
    placeholder: 'Elegí un empleado',
    searchPlaceholder: 'Buscar por legajo o nombre',
    noun: 'empleados',
  },
  VEHICLE: {
    field: 'vehicleId',
    search: searchVehicleOptions,
    placeholder: 'Elegí un vehículo',
    searchPlaceholder: 'Buscar por interno, dominio o serie',
    noun: 'vehículos',
  },
  OTHER_EQUIPMENT: {
    field: 'otherEquipmentId',
    search: searchOtherEquipmentOptions,
    placeholder: 'Elegí un equipo',
    searchPlaceholder: 'Buscar por interno, serie o tipo',
    noun: 'equipos',
  },
  MAINTENANCE_ORDER: {
    field: 'maintenanceOrderId',
    search: searchMaintenanceOrderOptions,
    placeholder: 'Elegí una orden abierta',
    searchPlaceholder: 'Buscar por número, dominio o interno',
    noun: 'órdenes abiertas',
  },
};

/** A quien se imputa una salida. Solo se ofrece lo vigente (activos, ordenes abiertas). */
export function DestinationFields({
  form,
  customers,
}: {
  form: UseFormReturn<StockMovementFormValues>;
  customers: MovementFormLookups['customers'];
}) {
  const [labels, setLabels] = useState<Partial<Record<SearchField, string>>>({});
  const [destinationType, customerId] = useWatch({ control: form.control, name: ['destinationType', 'customerId'] });
  const contracts = customers.find((c) => c.id === customerId)?.customer_services ?? [];
  const searchConfig = destinationType && destinationType !== 'CUSTOMER' ? SEARCHES[destinationType] : null;

  return (
    <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
      <FormField
        control={form.control}
        name="destinationType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Se imputa a</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí el destino" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {STOCK_DESTINATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DESTINATION_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {searchConfig && (
        <FormField
          key={searchConfig.field}
          control={form.control}
          name={searchConfig.field}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{DESTINATION_TYPE_LABELS[destinationType as keyof typeof DESTINATION_TYPE_LABELS]}</FormLabel>
              <SearchCombobox
                queryKey={['warehouse-destination', searchConfig.field]}
                search={searchConfig.search}
                value={field.value}
                selectedLabel={labels[searchConfig.field] ?? null}
                onSelect={(option) => {
                  field.onChange(option?.id ?? '');
                  setLabels((prev) => ({ ...prev, [searchConfig.field]: option?.label }));
                }}
                placeholder={searchConfig.placeholder}
                searchPlaceholder={searchConfig.searchPlaceholder}
                noun={searchConfig.noun}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {destinationType === 'CUSTOMER' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue('customerServiceId', '');
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={customers.length ? 'Elegí un cliente' : 'No hay clientes activos'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
            name="customerServiceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contrato (opcional)</FormLabel>
                <Select
                  value={field.value || NO_CONTRACT}
                  onValueChange={(v) => field.onChange(v === NO_CONTRACT ? '' : v)}
                  disabled={!customerId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_CONTRACT}>Sin contrato</SelectItem>
                    {contracts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {contractLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
