'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useState } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { getAllActiveEmployeesForDailyReport } from '../actions/actions';

type Employee = Awaited<ReturnType<typeof getAllActiveEmployeesForDailyReport>>[number];

interface EmployeeRoleSelectProps {
  field: ControllerRenderProps<any, any>;
  employees: Employee[];
  selectedCustomerId: string | null;
  label: string;
  placeholder?: string;
  disabledEmployeeIds?: string[]; // IDs de empleados que no pueden seleccionarse (ya seleccionados en otro rol)
}

export function EmployeeRoleSelect({
  field,
  employees,
  selectedCustomerId,
  label,
  placeholder = 'Seleccionar empleado',
  disabledEmployeeIds = [],
}: EmployeeRoleSelectProps) {
  const [open, setOpen] = useState(false);

  // Filtrar empleados activos
  const allEmployees = employees || [];

  // Obtener el empleado seleccionado
  const selectedEmployee = allEmployees.find((emp) => emp.id === field.value);

  // Agrupar empleados por posición
  const positionsMap: Record<string, Employee[]> = {};
  allEmployees.forEach((employee) => {
    const position = employee.company_positions?.name || 'Sin posición';
    if (!positionsMap[position]) {
      positionsMap[position] = [];
    }
    positionsMap[position].push(employee);
  });
  const positionsArray = Object.keys(positionsMap).sort();

  const formatName = (employee: Employee) => {
    return `${employee.lastname.charAt(0).toUpperCase() + employee.lastname.slice(1).toLowerCase()} ${employee.firstname.charAt(0).toUpperCase() + employee.firstname.slice(1).toLowerCase()}`;
  };

  return (
    <FormItem className="flex flex-col">
      <FormLabel>{label}</FormLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              disabled={!selectedCustomerId}
              className={cn(
                'w-full justify-between',
                !field.value && 'text-muted-foreground',
                !selectedCustomerId && 'opacity-50 cursor-not-allowed'
              )}
            >
              {selectedEmployee ? formatName(selectedEmployee) : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar empleado..." />
            <CommandList>
              <CommandEmpty>
                {!selectedCustomerId
                  ? 'Seleccione un cliente primero.'
                  : allEmployees.length === 0
                    ? 'No hay empleados activos disponibles.'
                    : 'No se encontraron empleados que coincidan.'}
              </CommandEmpty>

              {selectedCustomerId && (
                <div className="px-3 py-1.5 text-xs text-muted-foreground">
                  Los empleados marcados en naranja no están asignados al cliente. Los marcados en rojo no tienen
                  diagrama.
                </div>
              )}

              {selectedCustomerId &&
                allEmployees.length > 0 &&
                positionsArray.map((position) => (
                  <CommandGroup key={position} heading={position.charAt(0).toUpperCase() + position.slice(1)}>
                    {positionsMap[position].map((employee) => {
                      const isAssigned = employee.contractor_employee?.some(
                        (ce) => ce.customers?.id === selectedCustomerId
                      );
                      const isDisabled = disabledEmployeeIds.includes(employee.id);
                      const isSelected = field.value === employee.id;
                      const hasNoDiagram = !!employee.deviation_no_diagram;
                      const hasNonWorkDay = !!employee.deviation_non_work_day;
                      const diagramTypeName = employee.current_diagram?.diagram_type?.name || null;

                      return (
                        <CommandItem
                          value={`${employee.lastname} ${employee.firstname}`}
                          key={employee.id}
                          disabled={isDisabled && !isSelected}
                          onSelect={() => {
                            if (isDisabled && !isSelected) return;
                            field.onChange(isSelected ? undefined : employee.id);
                            setOpen(false);
                          }}
                          className={cn(
                            !isAssigned && 'text-orange-700 bg-orange-50 hover:bg-orange-100',
                            isDisabled && !isSelected && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  !isAssigned && 'text-orange-600',
                                  isSelected ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {formatName(employee)}
                            </div>
                            <div className="flex items-center gap-1">
                              {isDisabled && !isSelected && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 bg-gray-100 text-gray-600 border-gray-300 text-[10px]"
                                >
                                  Seleccionado
                                </Badge>
                              )}
                              {!isAssigned && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 bg-orange-100 text-orange-800 border-orange-300 text-[10px]"
                                >
                                  No asignado
                                </Badge>
                              )}
                              {hasNoDiagram && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 bg-red-100 text-red-800 border-red-300 text-[10px]"
                                >
                                  Sin diagrama
                                </Badge>
                              )}
                              {hasNonWorkDay && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px]"
                                >
                                  {diagramTypeName || 'No laboral'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Mostrar el empleado seleccionado como badge */}
      {selectedEmployee && (
        <div className="flex flex-wrap gap-2 mt-2">
          <div
            className={cn(
              'text-xs px-2 py-1 rounded-md flex items-center gap-1',
              selectedEmployee.contractor_employee?.some((ce) => ce.customers?.id === selectedCustomerId)
                ? 'bg-primary/10 text-primary'
                : 'bg-orange-100 text-orange-800 border border-orange-300'
            )}
          >
            {formatName(selectedEmployee)}
            <button type="button" onClick={() => field.onChange(undefined)} className="ml-1 hover:opacity-80">
              <X className="h-3 w-3 text-red-500" />
            </button>
          </div>
          {selectedEmployee.deviation_no_diagram && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-red-400 bg-red-50 text-red-700">
              Sin diagrama
            </Badge>
          )}
          {selectedEmployee.deviation_non_work_day && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0.5 border-yellow-400 bg-yellow-50 text-yellow-700"
            >
              {selectedEmployee.current_diagram?.diagram_type?.name || 'No laboral'}
            </Badge>
          )}
        </div>
      )}
      <FormMessage />
    </FormItem>
  );
}
