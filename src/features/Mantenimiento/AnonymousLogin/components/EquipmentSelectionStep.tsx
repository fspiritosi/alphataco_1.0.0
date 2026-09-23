'use client';

import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useEquipmentSearch } from '../hooks/useEquipmentSearch';
import { equipmentSelectionSchema, type EquipmentSelectionValues } from '../utils/login-schemas';

interface EquipmentSelectionStepProps {
  selectedEquipmentId: string | null;
  onSelect: (equipmentId: string) => void;
  onSubmit: (equipmentId: string) => void;
}

/**
 * Paso 1: identificar el equipo por dominio o serie cuando no llega por el QR.
 */
export function EquipmentSelectionStep({ selectedEquipmentId, onSelect, onSubmit }: EquipmentSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { options, isSearching, isTermTooShort } = useEquipmentSearch(searchTerm);

  const form = useForm<EquipmentSelectionValues>({
    resolver: zodResolver(equipmentSelectionSchema),
    defaultValues: { equipment_id: selectedEquipmentId || '' },
  });

  const selectedEquipment = options.find((equipment) => equipment.id === selectedEquipmentId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit(values.equipment_id))} className="space-y-4">
        <CardDescription className="text-center text-gray-700 mb-4">
          Ingrese el dominio o serie del equipo para continuar
        </CardDescription>
        <FormField
          control={form.control}
          name="equipment_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Equipo</FormLabel>
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn('justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {selectedEquipment ? selectedEquipment.label : 'Buscar por dominio o serie...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar equipo (mínimo 2 caracteres)..."
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandList>
                      {isSearching && (
                        <div className="py-6 text-center text-sm text-muted-foreground">Buscando...</div>
                      )}
                      {!isSearching && options.length === 0 && !isTermTooShort && (
                        <CommandEmpty>No se encontraron equipos</CommandEmpty>
                      )}
                      {!isSearching && isTermTooShort && (
                        <CommandEmpty>Ingrese al menos 2 caracteres para buscar</CommandEmpty>
                      )}
                      {!isSearching && options.length > 0 && (
                        <CommandGroup>
                          {options.map((equipment) => (
                            <CommandItem
                              value={equipment.label}
                              key={equipment.id}
                              onSelect={() => {
                                form.setValue('equipment_id', equipment.id);
                                onSelect(equipment.id);
                                setIsOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  equipment.id === field.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {equipment.label}
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
        <Button type="submit" className="w-full text-white" disabled={form.formState.isSubmitting}>
          Continuar
        </Button>
      </form>
    </Form>
  );
}
