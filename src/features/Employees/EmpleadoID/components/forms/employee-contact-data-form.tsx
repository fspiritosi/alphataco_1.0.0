'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { getAllProvinceOptions, getCitiesByProvince } from '../../actions.server';
import type { EmployeeFormData } from './employee-form';

interface EmployeeContactDataFormProps {
  form: UseFormReturn<EmployeeFormData>;
}

export function EmployeeContactDataForm({ form }: EmployeeContactDataFormProps) {
  const { data: provinces = [], isLoading: loadingProvinces } = useQuery({
    queryKey: ['catalog', 'provinces'],
    queryFn: () => getAllProvinceOptions(),
    staleTime: 10 * 60 * 1000,
  });

  const selectedProvince = form.watch('province');

  const { data: cities = [], isLoading: loadingCities } = useQuery({
    queryKey: ['catalog', 'cities', selectedProvince],
    queryFn: () => getCitiesByProvince(BigInt(selectedProvince!)),
    staleTime: 10 * 60 * 1000,
    enabled: !!selectedProvince,
  });

  const handleProvinceSelect = (provinceId: bigint) => {
    form.setValue('province', Number(provinceId));
    form.setValue('city', '' as unknown as number); // Limpiar ciudad al cambiar provincia
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
                <Input {...field} placeholder="Ingrese la calle" />
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
                <Input {...field} placeholder="Ingrese la altura" />
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
              {loadingProvinces ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={loadingCities}
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
                                handleProvinceSelect(province.id as bigint);
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
              )}
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
              {loadingCities ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={!selectedProvince}
                        className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                      >
                        {field.value
                          ? cities.find((city) => city.id.toString() === field.value?.toString())?.name
                          : !selectedProvince
                            ? 'Primero seleccione una provincia'
                            : 'Seleccione una ciudad'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 ">
                    <Command className="max-w-[300px]">
                      <CommandInput placeholder="Buscar ciudad..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No se encontraron ciudades.</CommandEmpty>
                        <CommandGroup>
                          {cities.map((city) => (
                            <CommandItem
                              value={city.name}
                              key={city.id}
                              onSelect={() => {
                                form.setValue('city', Number(city.id));
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
              )}
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
                <Input {...field} placeholder="Ingrese el código postal" />
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
                <Input {...field} placeholder="Ingrese el teléfono" />
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
              <Input {...field} type="email" placeholder="Ingrese el email" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
