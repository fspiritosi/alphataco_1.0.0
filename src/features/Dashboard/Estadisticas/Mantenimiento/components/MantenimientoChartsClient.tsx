'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import * as React from 'react';
import { getMaintenanceMonthSummary } from '../actions/actions.server';
import { OWNERSHIP_CATEGORIES, type MaintenanceMonthSummary, type OwnershipCategory } from '../types';
import { CategorySection } from './CategorySection';
import { OwnershipDonutChart } from './OwnershipDonutChart';

const MONTH_KEY_FORMAT = 'YYYY-MM';

interface Props {
  initialSummary: MaintenanceMonthSummary;
  initialMonthKey: string;
}

export function MantenimientoChartsClient({ initialSummary, initialMonthKey }: Props) {
  const [selectedMonth, setSelectedMonth] = React.useState(() => moment(initialMonthKey, MONTH_KEY_FORMAT));
  const [typeFilters, setTypeFilters] = React.useState<Record<OwnershipCategory, string[]>>({
    Propios: [],
    Leasing: [],
    Contratados: [],
  });
  // Todas las secciones inician CERRADAS — el detalle se carga lazy al abrir.
  const [openSections, setOpenSections] = React.useState<Record<OwnershipCategory, boolean>>({
    Propios: false,
    Leasing: false,
    Contratados: false,
  });

  const monthKey = selectedMonth.format(MONTH_KEY_FORMAT);

  const { data: summary, isFetching } = useQuery({
    queryKey: ['mantenimiento-summary', monthKey],
    queryFn: () => getMaintenanceMonthSummary(monthKey),
    initialData: monthKey === initialMonthKey ? initialSummary : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const earliestMonth = React.useMemo(() => {
    const fromData = summary?.earliestMonth ?? initialSummary.earliestMonth;
    return fromData ? moment(fromData, MONTH_KEY_FORMAT) : moment().subtract(1, 'year').startOf('month');
  }, [summary?.earliestMonth, initialSummary.earliestMonth]);

  const maxMonth = React.useMemo(() => moment().add(1, 'month').startOf('month'), []);

  const canGoBack = selectedMonth.isAfter(earliestMonth, 'month');
  const canGoForward = selectedMonth.isBefore(maxMonth, 'month');

  const monthLabel = React.useMemo(() => {
    const formatted = selectedMonth.clone().locale('es').format('MMMM YYYY');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [selectedMonth]);

  // Reset filtros + cierra secciones al cambiar de mes: typeIds del mes anterior
  // pueden no existir en el nuevo mes y dejarian la lista vacia silenciosamente.
  // Cerrar secciones ademas evita disparar fetches pesados en el cambio de mes.
  const goToMonth = React.useCallback((next: moment.Moment) => {
    setSelectedMonth(next);
    setTypeFilters({ Propios: [], Leasing: [], Contratados: [] });
    setOpenSections({ Propios: false, Leasing: false, Contratados: false });
  }, []);

  const handleTypeFilterChange = React.useCallback(
    (category: OwnershipCategory) => (values: string[]) => {
      setTypeFilters((prev) => ({ ...prev, [category]: values }));
    },
    []
  );

  const handleSectionOpenChange = React.useCallback(
    (category: OwnershipCategory) => (open: boolean) => {
      setOpenSections((prev) => ({ ...prev, [category]: open }));
    },
    []
  );

  const activeSummary = summary ?? initialSummary;

  return (
    <section className="grid grid-cols-1 gap-3 mb-4">
      {/* Donut card */}
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
            <CardTitle className="text-base flex items-center gap-2">
              Mantenimiento de equipos
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              Distribución de la flota por tipo de tenencia · {monthLabel}
              {activeSummary.daysElapsed > 0 && (
                <span className="ml-1 text-muted-foreground/80">
                  ({activeSummary.daysElapsed} de {activeSummary.daysInMonth} días transcurridos)
                </span>
              )}
            </CardDescription>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <div className="flex items-center gap-1 rounded-md border bg-card/40 p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!canGoBack}
                  onClick={() => goToMonth(selectedMonth.clone().subtract(1, 'month'))}
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center flex items-center justify-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {monthLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!canGoForward}
                  onClick={() => goToMonth(selectedMonth.clone().add(1, 'month'))}
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-6 pb-6 sm:px-6">
          <OwnershipDonutChart
            countsByCategory={activeSummary.countsByCategory}
            conditionCounts={activeSummary.conditionCounts}
          />
        </CardContent>
      </Card>

      {/* 3 secciones — cada una se autoabastece via useQuery cuando esta abierta */}
      {OWNERSHIP_CATEGORIES.map((category) => (
        <CategorySection
          key={category}
          category={category}
          monthKey={monthKey}
          totalCount={activeSummary.countsByCategory[category]}
          types={activeSummary.typesByCategory[category]}
          selectedTypeIds={typeFilters[category]}
          onTypeFilterChange={handleTypeFilterChange(category)}
          open={openSections[category]}
          onOpenChange={handleSectionOpenChange(category)}
          daysElapsed={activeSummary.daysElapsed}
        />
      ))}
    </section>
  );
}
