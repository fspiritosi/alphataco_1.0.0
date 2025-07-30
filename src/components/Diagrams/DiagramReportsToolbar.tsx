'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Download, Filter, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Calendar } from '../ui/calendar';
import { Checkbox } from '../ui/checkbox';
import { fetchEmployeesForReportsType, fetchNoveltyTypesForReportsType } from './DiagramReportsWrapper';

interface DiagramReportsToolbarProps {
  employees: fetchEmployeesForReportsType;
  noveltyTypes: fetchNoveltyTypesForReportsType;
  onFiltersChange: (filters: any) => void;
  onExport: () => void;
  totalRecords: number;
  filteredRecords: number;
}

export function DiagramReportsToolbar({
  employees,
  noveltyTypes,
  onFiltersChange,
  onExport,
  totalRecords,
  filteredRecords,
}: DiagramReportsToolbarProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedNovelties, setSelectedNovelties] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isEmployeePopoverOpen, setIsEmployeePopoverOpen] = useState(false);
  const [isNoveltyPopoverOpen, setIsNoveltyPopoverOpen] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  // Aplicar filtros cuando cambien los valores
  useEffect(() => {
    const filters = {
      search_text: searchText || undefined,
      employee_ids: selectedEmployees.length > 0 ? selectedEmployees : undefined,
      novelty_types: selectedNovelties.length > 0 ? selectedNovelties : undefined,
      start_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      end_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    };
    onFiltersChange(filters);
  }, [searchText, selectedEmployees, selectedNovelties, dateRange, onFiltersChange]);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const handleNoveltyToggle = (noveltyId: string) => {
    setSelectedNovelties((prev) =>
      prev.includes(noveltyId) ? prev.filter((id) => id !== noveltyId) : [...prev, noveltyId]
    );
  };

  const clearAllFilters = () => {
    setSearchText('');
    setSelectedEmployees([]);
    setSelectedNovelties([]);
    setDateRange(undefined);
  };

  const hasActiveFilters = searchText || selectedEmployees.length > 0 || selectedNovelties.length > 0 || dateRange;

  return (
    <div className="space-y-4">
      {/* Barra principal de filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-1">
          {/* Búsqueda */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empleado, CUIL o novedad..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Filtro de empleados */}
          <Popover open={isEmployeePopoverOpen} onOpenChange={setIsEmployeePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Empleados
                {selectedEmployees.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {selectedEmployees.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Seleccionar Empleados</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEmployees([])}
                    disabled={selectedEmployees.length === 0}
                  >
                    Limpiar
                  </Button>
                </div>
                <Separator />
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={employee.id}
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => handleEmployeeToggle(employee.id)}
                      />
                      <Label htmlFor={employee.id} className="text-sm cursor-pointer flex-1">
                        {employee.firstname} {employee.lastname} ({employee.cuil})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtro de novedades */}
          <Popover open={isNoveltyPopoverOpen} onOpenChange={setIsNoveltyPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Novedades
                {selectedNovelties.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {selectedNovelties.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Seleccionar Novedades</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedNovelties([])}
                    disabled={selectedNovelties.length === 0}
                  >
                    Limpiar
                  </Button>
                </div>
                <Separator />
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {noveltyTypes.map((novelty) => (
                    <div key={novelty.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={novelty.id}
                        checked={selectedNovelties.includes(novelty.id)}
                        onCheckedChange={() => handleNoveltyToggle(novelty.id)}
                      />
                      <Label htmlFor={novelty.id} className="text-sm cursor-pointer flex-1 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: novelty.color }} />
                        {novelty.name} ({novelty.short_description})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtro de fechas */}
          <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} -{' '}
                      {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy', { locale: es })
                  )
                ) : (
                  'Seleccionar fechas'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          )}
          <Button onClick={onExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Contador de registros */}
      <div className="text-sm text-muted-foreground">
        Mostrando {filteredRecords.toLocaleString()} de {totalRecords.toLocaleString()} registros
        {hasActiveFilters && ' (filtrados)'}
      </div>
    </div>
  );
}
