'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import { use, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { getSubTypesByType, getTypesOfVehicles, getVehicleTypes } from '../lib/actions/vehicle-catalog-actions';
import { getVehicleTypeFields } from '../lib/utils/vehicle-utils';

interface VehicleTechnicalDataFormProps {
  form: UseFormReturn<any>;
  readOnly?: boolean;
  typesPromise: ReturnType<typeof getVehicleTypes>;
  subTypesPromise: ReturnType<typeof getSubTypesByType>;
  typesOfVehiclesPromise: ReturnType<typeof getTypesOfVehicles>;
}

export function VehicleTechnicalDataForm({
  form,
  readOnly = false,
  typesPromise,
  subTypesPromise,
}: VehicleTechnicalDataFormProps) {
  const types = use(typesPromise);
  const subTypesInitial = use(subTypesPromise);
  const [subTypes, setSubTypes] = useState<typeof subTypesInitial>(subTypesInitial);

  const [loadingSubTypes, setLoadingSubTypes] = useState(false);

  const typeOfVehicle = form.watch('type_of_vehicle');
  const year = form.watch('year');
  const typeFields = getVehicleTypeFields(typeOfVehicle);

  // useEffect(() => {
  //     const loadCatalogs = async () => {
  //         try {
  //             const typesData = await getVehicleTypes()
  //             setTypes(typesData)
  //         } catch (error) {
  //             console.error("Error loading types:", error)
  //         }
  //     }

  //     loadCatalogs()
  // }, [])

  const handleTypeChange = async (typeId: string) => {
    form.setValue('type', typeId);
    form.setValue('subType', ''); // Reset subtype when type changes

    const selectedType = types.find((t) => t.id === typeId);
    if (selectedType) {
      setLoadingSubTypes(true);
      try {
        const subTypesData = await getSubTypesByType(selectedType.id);
        setSubTypes(subTypesData);
      } catch (error) {
        console.error('Error loading subtypes:', error);
      } finally {
        setLoadingSubTypes(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="engine"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motor del equipo</FormLabel>
              <FormControl>
                <Input {...field} disabled={readOnly} placeholder="Ingrese el tipo de motor" />
              </FormControl>
              <FormDescription>Ingrese el tipo de motor del equipo</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tipo {!typeFields.showSerie && <span className="text-red-500">*</span>}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      disabled={readOnly}
                      variant="outline"
                      role="combobox"
                      className={cn('justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {types.find((t) => t.id === field.value)?.name || 'Seleccionar tipo'}

                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar tipo..." />
                    <CommandList>
                      <CommandEmpty>No se encontró el tipo</CommandEmpty>
                      <CommandGroup>
                        {types.map((type) => (
                          <CommandItem
                            key={type.id}
                            value={type.id.toString()}
                            onSelect={() => handleTypeChange(type.id)}
                          >
                            <Check
                              className={cn('mr-2 h-4 w-4', type.id === field.value ? 'opacity-100' : 'opacity-0')}
                            />
                            {type.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>Selecciona el tipo</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subType"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                Sub Tipo de Unidad {!typeFields.showSerie && <span className="text-red-500">*</span>}
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      disabled={readOnly || loadingSubTypes || !form.getValues('type')}
                      variant="outline"
                      role="combobox"
                      className={cn('justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {loadingSubTypes
                        ? 'Cargando...'
                        : subTypes.find((s) => s.id === field.value)?.name || 'Seleccionar subtipo'}

                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar subtipo..." />
                    <CommandList>
                      <CommandEmpty>No se encontró el subtipo</CommandEmpty>
                      <CommandGroup>
                        {subTypes.map((subType) => (
                          <CommandItem
                            key={subType.id}
                            value={subType.id}
                            onSelect={() => {
                              form.setValue('subType', subType.id);
                            }}
                          >
                            <Check
                              className={cn('mr-2 h-4 w-4', subType.id === field.value ? 'opacity-100' : 'opacity-0')}
                            />
                            {subType.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>Selecciona el subtipo</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {typeFields.showChassis && (
          <FormField
            control={form.control}
            name="chassis"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Chasis del equipo {typeFields.requireChassis && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={readOnly} placeholder="Ingrese el chasis" />
                </FormControl>
                <FormDescription>Ingrese el chasis del equipo</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {typeFields.showSerie && (
          <FormField
            control={form.control}
            name="serie"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Serie del equipo {typeFields.requireSerie && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={readOnly} placeholder="Ingrese la serie" />
                </FormControl>
                <FormDescription>Ingrese la serie del equipo</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {typeFields.showDomain && (
          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Dominio del equipo {typeFields.requireDomain && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={readOnly}
                    placeholder="Ingrese el dominio"
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>Ingrese el dominio del equipo</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {typeFields.showKilometer && (
          <FormField
            control={form.control}
            name="kilometer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kilometraje</FormLabel>
                <FormControl>
                  <Input {...field} disabled={readOnly} placeholder="Kilometraje" type="number" min="0" />
                </FormControl>
                <FormDescription>Ingrese el kilometraje del equipo</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="intern_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número interno del equipo</FormLabel>
              <FormControl>
                <Input {...field} disabled={readOnly} placeholder="Ingrese el número interno" />
              </FormControl>
              <FormDescription>Ingrese el número interno del equipo</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
