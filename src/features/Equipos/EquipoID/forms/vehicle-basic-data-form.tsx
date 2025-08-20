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
import { getModelsByBrand, getTypesOfVehicles, getVehicleBrands } from '../lib/actions/vehicle-catalog-actions';

interface VehicleBasicDataFormProps {
  form: UseFormReturn<any>;
  readOnly?: boolean;
  typesOfVehiclesPromise: ReturnType<typeof getTypesOfVehicles>;
  brandsPromise: ReturnType<typeof getVehicleBrands>;
  modelsPromise: ReturnType<typeof getModelsByBrand>;
}

export function VehicleBasicDataForm({
  form,
  readOnly = false,
  typesOfVehiclesPromise,
  brandsPromise,
  modelsPromise,
}: VehicleBasicDataFormProps) {
  const brands = use(brandsPromise);
  const modelsInitial = use(modelsPromise);
  const typesOfVehicles = use(typesOfVehiclesPromise);
  const [models, setModels] = useState<typeof modelsInitial>(modelsInitial);
  const [loadingModels, setLoadingModels] = useState(false);

  const handleBrandChange = async (brandName: string) => {
    form.setValue('brand', brandName);
    form.setValue('model', ''); // Reset model when brand changes

    const selectedBrand = brands.find((b) => b.name === brandName);
    if (selectedBrand) {
      setLoadingModels(true);
      try {
        const modelsData = await getModelsByBrand(selectedBrand.id);
        setModels(modelsData);
      } catch (error) {
        console.error('Error loading models:', error);
      } finally {
        setLoadingModels(false);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        control={form.control}
        name="type_of_vehicle"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>
              Tipo de equipo <span className="text-red-500">*</span>
            </FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    disabled={readOnly}
                    variant="outline"
                    role="combobox"
                    className={cn('justify-between', !field.value && 'text-muted-foreground')}
                  >
                    {typesOfVehicles.find((type) => type.id.toString() === field.value)?.name ||
                      'Seleccionar tipo de equipo'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar tipo de equipo..." />
                  <CommandList>
                    <CommandEmpty>No se encontró ningún resultado</CommandEmpty>
                    <CommandGroup>
                      {typesOfVehicles.map((type) => (
                        <CommandItem
                          key={type.id}
                          value={type.id.toString()}
                          onSelect={() => {
                            form.setValue('type_of_vehicle', type.id.toString());
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              type.id.toString() === field.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {type.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormDescription>Selecciona el tipo de equipo</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="brand"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>
              Marca <span className="text-red-500">*</span>
            </FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    disabled={readOnly}
                    variant="outline"
                    role="combobox"
                    className={cn('justify-between', !field.value && 'text-muted-foreground')}
                  >
                    {brands.find((brand) => brand.id.toString() === field.value)?.name || 'Seleccionar marca'}

                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 max-h-[200px] overflow-y-auto">
                <Command>
                  <CommandInput placeholder="Buscar marca..." />
                  <CommandList>
                    <CommandEmpty>Marca no encontrada</CommandEmpty>
                    <CommandGroup>
                      {brands.map((brand) => (
                        <CommandItem
                          key={brand.id}
                          value={brand.id.toString()}
                          onSelect={() => handleBrandChange(brand.id.toString())}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              brand.id.toString() === field.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {brand.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormDescription>Selecciona la marca del equipo</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="model"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>
              Modelo <span className="text-red-500">*</span>
            </FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    disabled={readOnly || loadingModels}
                    variant="outline"
                    role="combobox"
                    className={cn('justify-between', !field.value && 'text-muted-foreground')}
                  >
                    {loadingModels
                      ? 'Cargando...'
                      : models.find((model) => model.id.toString() === field.value)?.name || 'Seleccionar modelo'}

                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar modelo..." />
                  <CommandList>
                    <CommandEmpty>Modelo no encontrado</CommandEmpty>
                    <CommandGroup>
                      {models.map((model) => (
                        <CommandItem
                          key={model.id}
                          value={model.id.toString()}
                          onSelect={() => {
                            form.setValue('model', model.id.toString());
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              model.id.toString() === field.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {model.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormDescription>Selecciona el modelo del equipo</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="year"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Año <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                disabled={readOnly}
                placeholder="Año"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
              />
            </FormControl>
            <FormDescription>Ingrese el año del equipo</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
