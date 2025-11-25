'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import Cookies from 'js-cookie';
import { Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

interface PositionFilterProps {
  positions: { label: string; value: string }[];
}

export function PositionFilterCard({ positions }: PositionFilterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  // Leer cookie al cargar
  useEffect(() => {
    const cookieValue = Cookies.get('position-filter');
    const initialValues = cookieValue ? cookieValue.split(',').filter(Boolean) : [];
    setSelectedValues(initialValues);
  }, []);

  const handlePositionChange = (newSelectedValues: string[]) => {
    setSelectedValues(newSelectedValues);
  };

  const handleApplyFilter = (e: React.MouseEvent) => {
    e.preventDefault();

    // Guardar o borrar cookie
    if (selectedValues.length > 0) {
      Cookies.set('position-filter', selectedValues.join(','), {
        expires: 7,
        path: '/',
        sameSite: 'strict',
      });
    } else {
      Cookies.remove('position-filter', { path: '/' });
    }

    // Refrescar página con transición
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="w-full">
      <Card className="p-2">
        {/* <h1 className="text-lg font-semibold">Indicadores por posiciones:</h1> */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {/* <h1 className="text-2xl font-bold text-gray-900 mb-2">Filtrar por Tipo de unidad:</h1> */}
            <p className="text-gray-600">Filtrar por posiciones</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <MultiSelectCombobox
              options={positions}
              selectedValues={selectedValues}
              onChange={handlePositionChange}
              placeholder="Seleccionar posiciones..."
              showSelectAll={true}
              emptyMessage="No hay posiciones"
            />
            <Button
              type="button"
              onClick={handleApplyFilter}
              className="whitespace-nowrap min-w-[100px] ml-2"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Filtrando...
                </span>
              ) : (
                <>
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrar
                </>
              )}
            </Button>
          </div>
        </div>
        {selectedValues.length > 0 && (
          <div className="flex w-full flex-wrap gap-2 p-2">
            {selectedValues.length === positions.length ? (
              <div className="relative">
                <Badge className="pr-6 relative">
                  Todas las posiciones
                  <button
                    onClick={() => setSelectedValues([])}
                    className="absolute -top-0 -right-0 text-red-500 hover:text-red-700 p-0"
                    aria-label="Quitar todas"
                    type="button"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M18 6L6 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 6L18 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </Badge>
              </div>
            ) : (
              selectedValues.map((value) => {
                const label = positions.find((position) => position.value === value)?.label;
                if (!label) return null;

                return (
                  <div key={value} className="relative">
                    <Badge className="pr-6 relative">
                      {label}
                      <button
                        onClick={() => setSelectedValues((prev) => prev.filter((id) => id !== value))}
                        className="absolute -top-0 -right-0 text-red-500 hover:text-red-700 p-0"
                        aria-label="Eliminar posición"
                        type="button"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M18 6L6 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6 6L18 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>
    </form>
  );
}
