'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import moment from 'moment';
import type { Dispatch, SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { PreparteFormData } from '../../schemas/preparte-form';
import type { Cliente } from '../PreparteManager';
import type { AreaOption, ContractItemOption, Contrato, EquipmentOption, ItemRow, SectorOption } from './types';

const logger = new Logger('PreparteForm');

interface CustomerContractSectionProps {
  form: UseFormReturn<PreparteFormData>;
  clientes: Cliente[];
  contratos: Contrato[];
  isEditing: boolean;
  isLoading: boolean;
  isLoadingContratos: boolean;
}

/**
 * Datos del cliente: cliente, contrato, fecha de solicitud, solicitante y estado.
 * Sección extraída de `PreparteForm` (el formulario superaba las 1.000 líneas).
 */
export function CustomerContractSection({ form, clientes, contratos, isEditing, isLoading, isLoadingContratos }: CustomerContractSectionProps) {
  return (
    <>
            {/* Selector de Clientes */}
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <MultiSelectCombobox
                    data-testid="cliente-select"
                    options={clientes.map((cliente) => ({
                      label: cliente.name,
                      value: cliente.id,
                    }))}
                    disabled={isEditing}
                    selectedValues={field.value ? [field.value] : []} // Asegurar que sea un array
                    onChange={(selectedIds) => {
                      const value = selectedIds[0] || '';
                      field.onChange(value);
                      // reset dependientes - los hooks se refrescan automáticamente al cambiar cliente_id
                      form.setValue('contrato_id', '');
                      form.setValue('sector_service_id', '');
                      form.setValue('areas_service_id', '');
                      form.setValue('equipos_cliente', []);
                    }}
                    placeholder={clientes.find((c) => c.id === field.value)?.name || 'Seleccionar cliente'}
                    emptyMessage="No hay clientes disponibles"
                    maxSelections={1} // Para selección única
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Selector de Contrato */}
            <FormField
              control={form.control}
              name="contrato_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contrato</FormLabel>
                  <MultiSelectCombobox
                    data-testid="contrato-select"
                    options={contratos.map((contrato) => ({
                      label: contrato.service_name || 'Sin nombre',
                      value: contrato.id,
                    }))}
                    selectedValues={field.value ? [field.value] : []}
                    onChange={(selectedIds) => {
                      const value = selectedIds[0] || '';
                      field.onChange(value);
                      // reset dependientes del contrato
                      form.setValue('sector_service_id', '');
                      form.setValue('areas_service_id', '');
                      form.setValue('equipos_cliente', []);
                    }}
                    placeholder="Seleccionar contrato"
                    emptyMessage="No hay contratos disponibles"
                    disabled={!form.watch('cliente_id') || isLoading || isEditing}
                    isLoading={isLoadingContratos}
                    maxSelections={1}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de Solicitud */}
            <FormField
              control={form.control}
              name="requestDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Solicitud</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          disabled={isEditing}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar fecha</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(selectedDate) => {
                          if (!selectedDate) return;
                          if (selectedDate > new Date()) return;
                          field.onChange(selectedDate);
                        }}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Solicitante */}
            <FormField
              control={form.control}
              name="solicitante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solicitante</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ingrese el solicitante"
                      className="bg-background"
                      {...field}
                      disabled={isEditing}
                      data-testid="solicitante-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => {
                  // Obtener el valor actual del estado
                  const currentStatusWatch = form.watch('status');
                  // const currentStatus = field.value as string;

                  return (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Seleccione un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            className="hover:bg-accent bg-background"
                            value="pendiente"
                            disabled={field.value === 'pendiente'}
                          >
                            Pendiente
                          </SelectItem>
                          <SelectItem className="hover:bg-accent" value="reprogramado">
                            Reprogramado
                          </SelectItem>
                          <SelectItem className="hover:bg-accent" value="cancelado">
                            Cancelado
                          </SelectItem>
                          <SelectItem value="rechazado">Rechazado</SelectItem>
                          <SelectItem value="confirmado" disabled={true}>
                            Confirmado
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />

                      {currentStatusWatch === 'cancelado' && (
                        <div className="mt-6">
                          <FormField
                            control={form.control}
                            name="cancel_reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Motivo de cancelación</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ingrese el motivo de cancelación"
                                    {...field}
                                    value={field.value || ''}
                                    className="bg-background"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      {currentStatusWatch === 'rechazado' && (
                        <div className="mt-6">
                          <FormField
                            control={form.control}
                            name="rejected_reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Motivo de rechazo</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ingrese el motivo de rechazo"
                                    {...field}
                                    value={field.value || ''}
                                    className="bg-background"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      {currentStatusWatch === 'reprogramado' && (
                        <div className="mt-6">
                          <FormField
                            control={form.control}
                            name="reprogram"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel className="mt-2">Fecha de reprogramación</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={'outline'}
                                        className={cn(
                                          'pl-3 text-left font-normal',
                                          !field.value && 'text-muted-foreground'
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, 'PPP', { locale: es })
                                        ) : (
                                          <span>Seleccionar fecha</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => moment(date).isBefore(moment().startOf('day'))}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="reprogram_reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Motivo del Reprogramado</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ingrese el motivo del reprogramado"
                                    {...field}
                                    value={field.value || ''}
                                    className="bg-background"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </FormItem>
                  );
                }}
              />
            )}
    </>
  );
}
