'use client';

import { useClothingContext } from '@/app/clothing/clothing-layout-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getEmployeesForDelivery,
  type EmployeeForDelivery,
} from '@/features/Clothing/ClothingDelivery/actions/queries.server';
import { Logger } from '@/lib/logger';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, CalendarDays, CreditCard, ScrollText, Search, User, X } from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useRef, useState } from 'react';

const logger = new Logger('Clothing/StepSelectEmployee');

interface StepSelectEmployeeProps {
  value: EmployeeForDelivery | null;
  onChange: (employee: EmployeeForDelivery | null) => void;
}

export function StepSelectEmployee({ value, onChange }: StepSelectEmployeeProps) {
  // Sólo discrimina la caché de React Query: la empresa real la resuelve el servidor.
  const { companyId } = useClothingContext();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['clothing-employees', companyId, debouncedSearch],
    queryFn: () => getEmployeesForDelivery(debouncedSearch),
    staleTime: 30_000,
    enabled: isOpen,
  });

  const handleSelect = useCallback(
    (emp: EmployeeForDelivery) => {
      logger.debug('Employee selected', { data: { id: emp.id } });
      onChange(emp);
      setIsOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setSearch('');
  }, [onChange]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1.5 text-foreground">Buscar empleado</p>
        <p className="text-sm text-muted-foreground mb-3">
          Ingrese el nombre, apellido o numero de legajo del empleado que recibe la entrega.
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Buscar por legajo o nombre..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="pl-9 h-11"
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-3 text-sm text-muted-foreground text-center">Buscando...</div>
            ) : employees.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                {debouncedSearch.length > 0 ? 'No se encontraron empleados' : 'Escriba para buscar empleados'}
              </div>
            ) : (
              employees.map((emp) => {
                const meta = [
                  emp.covenant?.name && `CCT ${emp.covenant.name}`,
                  emp.date_of_admission && `Ingreso ${moment(emp.date_of_admission).format('DD/MM/YYYY')}`,
                ].filter(Boolean);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelect(emp)}
                    className="w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3 border-b last:border-b-0"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        [{emp.file}] {emp.lastname} {emp.firstname}
                      </div>
                      {emp.company_positions?.name && (
                        <div className="text-xs text-muted-foreground truncate">{emp.company_positions.name}</div>
                      )}
                      {meta.length > 0 && (
                        <div className="text-[11px] text-muted-foreground/80 truncate">{meta.join(' · ')}</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected employee card */}
      {value && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {value.lastname} {value.firstname}
                </p>
                <p className="text-sm text-muted-foreground">Legajo #{value.file}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={handleClear} className="h-7 w-7 flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {value.company_positions?.name && (
              <Badge variant="secondary" className="gap-1.5">
                <Briefcase className="h-3 w-3" />
                {value.company_positions.name}
              </Badge>
            )}
            {value.cuil && (
              <Badge variant="outline" className="gap-1.5">
                <CreditCard className="h-3 w-3" />
                CUIL: {value.cuil}
              </Badge>
            )}
            {value.covenant?.name && (
              <Badge variant="outline" className="gap-1.5">
                <ScrollText className="h-3 w-3" />
                CCT: {value.covenant.name}
              </Badge>
            )}
            {value.date_of_admission && (
              <Badge variant="outline" className="gap-1.5">
                <CalendarDays className="h-3 w-3" />
                Ingreso: {moment(value.date_of_admission).format('DD/MM/YYYY')}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
