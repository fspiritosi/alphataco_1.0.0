'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import { use, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { fetchCitiesByProvinceId } from '../../lib/actions/catalog-actions';
import { EmployeeFormData, Options } from './employee-form';

interface EmployeeContactDataFormProps {
  form: UseFormReturn<EmployeeFormData>;
  readOnly: boolean;
  options: Options['contactData']; // siempre viene
}

export function EmployeeContactDataForm({ form, readOnly, options }: EmployeeContactDataFormProps) {
  const citiesAwaited = use(options.citiesPromise);
  const [cities, setCities] = useState<typeof citiesAwaited>(citiesAwaited);
  const [loadingCities, setLoadingCities] = useState(false);
  const provinces = use(options.provincesPromise);

  const selectedProvince = form.watch('province');

  const handleProvinceSelect = async (provinceId: number) => {
    form.setValue('province', provinceId);
    form.setValue('city', '' as any); // Limpiar el campo city

    setLoadingCities(true);
    try {
      const newCities = await fetchCitiesByProvinceId(provinceId);
      setCities(newCities);
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calle */}
        <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calle *</FormLabel>
              <FormControl>
                <Input {...field} readOnly={readOnly} placeholder="Ingrese la calle" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Altura */}
        <FormField
          control={form.control}
          name="street_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Altura *</FormLabel>
              <FormControl>
                <Input {...field} readOnly={readOnly} placeholder="Ingrese la altura" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Provincia */}
        <FormField
          control={form.control}
          name="province"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provincia *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={readOnly || loadingCities}
                      className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {field.value
                        ? provinces.find((province) => province.id.toString() === field.value?.toString())?.name
                        : 'Seleccione una provincia'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command className="max-w-[300px]">
                    <CommandInput placeholder="Buscar provincia..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No se encontraron provincias.</CommandEmpty>
                      <CommandGroup>
                        {provinces.map((province) => (
                          <CommandItem
                            value={province.name}
                            key={province.id}
                            onSelect={() => {
                              handleProvinceSelect(province.id);
                            }}
                          >
                            {province.name}
                            <Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                province.id.toString() === field.value?.toString() ? 'opacity-100' : 'opacity-0'
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

        {/* Ciudad */}
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={readOnly || !selectedProvince || loadingCities}
                      className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {loadingCities
                        ? 'Cargando ciudades...'
                        : field.value
                          ? cities.find((city) => city.id.toString() === field.value?.toString())?.name
                          : 'Seleccione una ciudad'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 ">
                  <Command className="max-w-[300px]">
                    <CommandInput placeholder="Buscar ciudad..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>{loadingCities ? 'Cargando...' : 'No se encontraron ciudades.'}</CommandEmpty>
                      <CommandGroup>
                        {!loadingCities &&
                          cities.map((city) => (
                            <CommandItem
                              value={city.name}
                              key={city.id}
                              onSelect={() => {
                                form.setValue('city', city.id);
                              }}
                            >
                              {city.name}
                              <Check
                                className={cn(
                                  'ml-auto h-4 w-4',
                                  city.id.toString() === field.value?.toString() ? 'opacity-100' : 'opacity-0'
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

        {/* Código postal */}
        <FormField
          control={form.control}
          name="postal_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código postal *</FormLabel>
              <FormControl>
                <Input {...field} readOnly={readOnly} placeholder="Ingrese el código postal" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Teléfono */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono *</FormLabel>
              <FormControl>
                <Input {...field} readOnly={readOnly} placeholder="Ingrese el teléfono" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Email - campo completo */}
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email *</FormLabel>
            <FormControl>
              <Input {...field} type="email" readOnly={readOnly} placeholder="Ingrese el email" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
