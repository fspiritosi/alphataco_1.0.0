import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Building, Check, ChevronsUpDown, X } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import type { GetCustomersClientType } from '@/features/Operaciones/PartesDiarios/actions/actionsClient';

type CustomerDataSectionProps = {
  form: UseFormReturn<any>;
  customers: GetCustomersClientType[];
  isCreating: boolean;
  selectedRow: any;
  selectedCustomerId: string | null;
  selectedServiceId: string | null;
  selectedCustomer: GetCustomersClientType | null;
  customerServices: any[];
  serviceItems: any[];
  isSectorDisabled: boolean;
  isAreaDisabled: boolean;
  handleCustomerChange: (id: string) => void;
  handleServiceChange: (id: string) => void;
  disabled?: boolean;
};

export function CustomerDataSection({
  form,
  customers,
  isCreating,
  selectedRow,
  selectedCustomerId,
  selectedServiceId,
  selectedCustomer,
  customerServices,
  serviceItems,
  isSectorDisabled,
  isAreaDisabled,
  handleCustomerChange,
  handleServiceChange,
  disabled,
}: CustomerDataSectionProps) {
  const activeCustomers = customers?.filter((c) => c.is_active) || [];
  const customerSectors = Array.from(
    new Set(
      selectedCustomer?.customer_services
        ?.flatMap((service) => service.service_sectors || [])
        .filter((sector: any) => sector.sectors && sector.service_id === selectedServiceId)
        .map((sector: any) => ({ sector_id: sector.sectors?.id, id: sector.id }))
    )
  ).map((data: any) => ({
    id: data.id,
    name:
      selectedCustomer?.customer_services
        ?.flatMap((service) => service.service_sectors || [])
        .find((sector: any) => sector.sectors?.id === data.sector_id)?.sectors?.name || '',
  }));

  // Filtrar áreas del cliente seleccionado
  const customerAreas = Array.from(
    new Set(
      selectedCustomer?.customer_services
        ?.flatMap((service) => service.service_areas || [])
        .filter((area: any) => area.areas_cliente && area.service_id === selectedServiceId)
        .map((area: any) => ({ id: area.id, area_id: area.areas_cliente?.id }))
    )
  ).map((data: any) => ({
    id: data.id,
    name:
      selectedCustomer?.customer_services
        ?.flatMap((service) => service.service_areas || [])
        .find((area: any) => area.areas_cliente?.id === data.area_id)?.areas_cliente?.nombre || '',
  }));

  return (
    <div className="space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Building className="h-4 w-4" />
        Datos del Cliente
      </h4>
      <div className="grid grid-cols-1 gap-4 w-full">
        {/* Cliente */}
        <FormField
          control={form.control}
          name="customer"
          render={({ field }) => (
            <FormItem className="flex flex-col w-full">
              <FormLabel>Cliente</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={!isCreating || disabled}
                      className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {isCreating
                        ? field.value
                          ? activeCustomers.find((c) => c.id === field.value)?.name
                          : 'Seleccionar cliente'
                        : selectedRow?.customer}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent align="start" className="max-w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." className="h-9" disabled={!isCreating} />
                    <CommandList>
                      <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      <CommandGroup heading="Clientes activos">
                        {activeCustomers.map((customer) => (
                          <CommandItem
                            value={customer.name}
                            key={customer.id}
                            onSelect={() => handleCustomerChange(customer.id)}
                            disabled={!isCreating}
                          >
                            {customer.name}
                            <Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                customer.id === field.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Servicio */}
        <FormField
          control={form.control}
          name="services"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Servicio</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={disabled}
                      className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {field.value
                        ? customerServices.find((s) => s.id === field.value)?.service_name || selectedRow?.services
                        : 'Seleccionar servicio'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent align="start" className="max-w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar servicio..." className="h-9" disabled={disabled} />
                    <CommandList>
                      <CommandEmpty>
                        {!selectedCustomerId
                          ? 'Seleccione un cliente primero.'
                          : customerServices.length === 0
                            ? 'No hay servicios activos para este cliente.'
                            : 'No se encontraron servicios que coincidan.'}
                      </CommandEmpty>
                      {customerServices.length > 0 && (
                        <CommandGroup>
                          {customerServices.map((service) => (
                            <CommandItem
                              value={service.service_name || ''}
                              key={service.id}
                              onSelect={() => handleServiceChange(service.id)}
                              disabled={disabled}
                            >
                              {service.service_name}
                              <Check
                                className={cn(
                                  'ml-auto h-4 w-4',
                                  service.id === field.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ítem */}
        <FormField
          control={form.control}
          name="item"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Ítem</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={disabled}
                      className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {field.value
                        ? serviceItems.find((i) => i.id === field.value)?.item_name || selectedRow?.item
                        : 'Seleccionar ítem'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder={!selectedServiceId ? 'Seleccione un servicio primero' : 'Buscar ítem...'}
                      className="h-9"
                      disabled={disabled}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {!selectedServiceId
                          ? 'Seleccione un servicio primero.'
                          : serviceItems.length === 0
                            ? 'No hay ítems disponibles para este servicio.'
                            : 'No se encontraron ítems que coincidan.'}
                      </CommandEmpty>
                      {serviceItems.length > 0 && (
                        <CommandGroup>
                          {serviceItems.map((item) => (
                            <CommandItem
                              value={`${item.id}-${item.item_name}`}
                              key={item.id}
                              onSelect={() => {
                                form.setValue('item', item.id);
                                // Limpiar recursos que el nuevo item no requiere
                                if (!item.needs_personnel) form.setValue('employees', []);
                                if (!item.needs_equipment) form.setValue('equipment', []);
                              }}
                              disabled={disabled}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{item.item_name}</span>
                                {item.measure_units?.unit && (
                                  <Badge variant="outline" className="ml-2">
                                    {item.measure_units.unit}
                                  </Badge>
                                )}
                              </div>
                              <Check
                                className={cn('ml-2 h-4 w-4', item.id === field.value ? 'opacity-100' : 'opacity-0')}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sector del Cliente */}
        <FormField
          control={form.control}
          name="sector_service_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Sector del Cliente *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={isSectorDisabled || disabled}
                      className={cn(
                        'w-full justify-between',
                        !field.value && 'text-muted-foreground',
                        isSectorDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {field.value
                        ? customerSectors.find((s) => s.id === field.value)?.name || selectedRow?.sector
                        : 'Seleccionar sector'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar sector..."
                      className="h-9"
                      disabled={isSectorDisabled || disabled}
                    />
                    <CommandList>
                      <CommandEmpty>No hay sectores disponibles.</CommandEmpty>
                      {customerSectors.length > 0 && (
                        <CommandGroup>
                          {customerSectors.map((sector) => (
                            <CommandItem
                              value={sector.name || ''}
                              key={sector.id}
                              onSelect={() => form.setValue('sector_service_id', sector.id)}
                              disabled={disabled}
                            >
                              {sector.name || 'Sin nombre'}
                              <Check
                                className={cn(
                                  'ml-auto h-4 w-4',
                                  sector.id === field.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Área del Cliente */}
        <FormField
          control={form.control}
          name="areas_service_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Área del Cliente *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={isAreaDisabled || disabled}
                      className={cn(
                        'w-full justify-between',
                        !field.value && 'text-muted-foreground',
                        isAreaDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {field.value
                        ? customerAreas.find((a) => a.id === field.value)?.name || selectedRow?.area
                        : 'Seleccionar área'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar área..." className="h-9" disabled={isAreaDisabled || disabled} />
                    <CommandList>
                      <CommandEmpty>No hay áreas disponibles.</CommandEmpty>
                      {customerAreas.length > 0 && (
                        <CommandGroup>
                          {customerAreas.map((area) => (
                            <CommandItem
                              value={area.name || ''}
                              key={area.id}
                              onSelect={() => form.setValue('areas_service_id', area.id)}
                              disabled={disabled}
                            >
                              {area.name || 'Sin nombre'}
                              <Check
                                className={cn('ml-auto h-4 w-4', area.id === field.value ? 'opacity-100' : 'opacity-0')}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Equipos de Cliente */}
        <FormField
          control={form.control}
          name="equipos_cliente"
          render={({ field }) => {
            const selectedCustomerEquipment = form.watch('equipos_cliente') || [];
            const customerEquipments = selectedCustomer?.equipos_clientes || [];

            return (
              <FormItem className="flex flex-col">
                <FormLabel>Equipos de Cliente (Máx. 2)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={disabled || customerEquipments.length === 0}
                        className="w-full justify-between"
                      >
                        {selectedCustomerEquipment.length > 0
                          ? `${selectedCustomerEquipment.length} equipo(s) seleccionado(s)`
                          : 'Seleccionar equipos'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar equipo..." />
                      <CommandList>
                        <CommandEmpty>No hay equipos disponibles.</CommandEmpty>
                        <CommandGroup>
                          {customerEquipments.map((equipment: any) => {
                            const isSelected = selectedCustomerEquipment.includes(equipment.id);
                            return (
                              <CommandItem
                                key={equipment.id}
                                onSelect={() => {
                                  const newValue = isSelected
                                    ? selectedCustomerEquipment.filter((id: string) => id !== equipment.id)
                                    : selectedCustomerEquipment.length < 2
                                      ? [...selectedCustomerEquipment, equipment.id]
                                      : selectedCustomerEquipment;
                                  form.setValue('equipos_cliente', newValue);
                                }}
                                disabled={!isSelected && selectedCustomerEquipment.length >= 2}
                              >
                                <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                {equipment.name}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCustomerEquipment.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedCustomerEquipment.map((eqId: string) => {
                      const eq = customerEquipments.find((e: any) => e.id === eqId);
                      return (
                        <Badge key={eqId} variant="secondary" className="gap-1">
                          {eq?.name}
                          <button
                            type="button"
                            aria-label="Quitar equipo"
                            className="ml-1 inline-flex cursor-pointer rounded hover:bg-muted-foreground/20"
                            onClick={() => {
                              form.setValue(
                                'equipos_cliente',
                                selectedCustomerEquipment.filter((id: string) => id !== eqId)
                              );
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>
    </div>
  );
}
