import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  getActiveEmployeesForDailyReportClient,
  getActiveEquipmentsForDailyReportClient,
} from '@/features/Operaciones/PartesDiarios/actions/actionsClient';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2, Users, X } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

type ResourcesSectionProps = {
  form: UseFormReturn<any>;
  isCreating: boolean;
  selectedRow: any;
  disabled?: boolean;
};

export function ResourcesSection({ form, isCreating, selectedRow, disabled }: ResourcesSectionProps) {
  // Fetch employees con useQuery
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['active-employees'],
    queryFn: getActiveEmployeesForDailyReportClient,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Fetch equipments con useQuery
  const { data: equipments = [], isLoading: isLoadingEquipments } = useQuery({
    queryKey: ['active-equipments'],
    queryFn: getActiveEquipmentsForDailyReportClient,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const selectedEmployees = form.watch('employees') || [];
  const selectedEquipment = form.watch('equipment') || [];

  return (
    <div className="space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Users className="h-4 w-4" />
        Recursos Empresa (Al menos 1 empleado O 1 equipo)
      </h4>
      <div className="grid grid-cols-1 gap-4 w-full">
        {/* Empleados */}
        <FormField
          control={form.control}
          name="employees"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Empleados</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={disabled || isLoadingEmployees}
                      className="w-full justify-between"
                    >
                      {isLoadingEmployees ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cargando empleados...
                        </>
                      ) : selectedEmployees.length > 0 ? (
                        `${selectedEmployees.length} empleado(s) seleccionado(s)`
                      ) : (
                        'Seleccionar empleados'
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar empleado..." />
                    <CommandList>
                      {isLoadingEmployees ? (
                        <div className="p-4 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">Cargando empleados...</p>
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                          <CommandGroup>
                            {employees.map((employee) => {
                              const isSelected = selectedEmployees.includes(employee.id);
                              const isInactive = employee.is_active === false;
                              return (
                                <CommandItem
                                  key={employee.id}
                                  onSelect={() => {
                                    const newValue = isSelected
                                      ? selectedEmployees.filter((id: string) => id !== employee.id)
                                      : [...selectedEmployees, employee.id];
                                    form.setValue('employees', newValue);
                                  }}
                                  className={cn(isInactive && 'bg-red-50 dark:bg-red-900/20')}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className={cn(isInactive && 'text-red-700 dark:text-red-400')}>
                                      {employee.firstname} {employee.lastname}
                                    </span>
                                    {isInactive && (
                                      <Badge variant="destructive" className="text-[10px] h-5">
                                        Inactivo
                                      </Badge>
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedEmployees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedEmployees.map((empId: string) => {
                    const emp = employees.find((e) => e.id === empId);
                    const isInactive = emp?.is_active === false;
                    return (
                      <Badge
                        key={empId}
                        variant={isInactive ? 'destructive' : 'secondary'}
                        className={cn(
                          'gap-1',
                          isInactive && 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {emp?.firstname} {emp?.lastname}
                        {isInactive && <span className="text-[10px]">(Inactivo)</span>}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => {
                            form.setValue(
                              'employees',
                              selectedEmployees.filter((id: string) => id !== empId)
                            );
                          }}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Equipos Empresa */}
        <FormField
          control={form.control}
          name="equipment"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Equipos Empresa</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={disabled || isLoadingEquipments}
                      className="w-full justify-between"
                    >
                      {isLoadingEquipments ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cargando equipos...
                        </>
                      ) : selectedEquipment.length > 0 ? (
                        `${selectedEquipment.length} equipo(s) seleccionado(s)`
                      ) : (
                        'Seleccionar equipos'
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar equipo..." />
                    <CommandList>
                      {isLoadingEquipments ? (
                        <div className="p-4 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">Cargando equipos...</p>
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No se encontraron equipos.</CommandEmpty>
                          <CommandGroup>
                            {equipments.map((equipment) => {
                              const isSelected = selectedEquipment.includes(equipment.id);
                              const isInactive = equipment.is_active === false;
                              const displayName = equipment.domain || equipment.intern_number || 'Sin identificación';
                              return (
                                <CommandItem
                                  key={equipment.id}
                                  onSelect={() => {
                                    const newValue = isSelected
                                      ? selectedEquipment.filter((id: string) => id !== equipment.id)
                                      : [...selectedEquipment, equipment.id];
                                    form.setValue('equipment', newValue);
                                  }}
                                  className={cn(isInactive && 'bg-red-50 dark:bg-red-900/20')}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className={cn(isInactive && 'text-red-700 dark:text-red-400')}>
                                      {displayName}
                                    </span>
                                    {isInactive && (
                                      <Badge variant="destructive" className="text-[10px] h-5">
                                        Inactivo
                                      </Badge>
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedEquipment.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedEquipment.map((eqId: string) => {
                    const eq = equipments.find((e) => e.id === eqId);
                    const isInactive = eq?.is_active === false;
                    const displayName = eq?.domain || eq?.intern_number || 'Sin identificación';
                    return (
                      <Badge
                        key={eqId}
                        variant={isInactive ? 'destructive' : 'secondary'}
                        className={cn(
                          'gap-1',
                          isInactive && 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {displayName}
                        {isInactive && <span className="text-[10px]">(Inactivo)</span>}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => {
                            form.setValue(
                              'equipment',
                              selectedEquipment.filter((id: string) => id !== eqId)
                            );
                          }}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
