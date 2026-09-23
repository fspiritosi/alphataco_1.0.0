import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Activity, ClipboardList, Container, Truck, Users } from 'lucide-react';
import { getChecklistMissingIndicator } from '../actions/checklists.server';
import { getDashboardKpis } from '../actions/kpis.server';
import { ChecklistMissingCard } from './ChecklistMissingCard';

export async function KpiCardsRow() {
  const [kpis, checklistMissing] = await Promise.all([getDashboardKpis(), getChecklistMissingIndicator()]);

  const cards = [
    {
      icon: Users,
      value: kpis.activeEmployees,
      subtitle: 'empleados activos',
      label: 'Empleados',
      colorClass: 'text-[var(--chart-2)] bg-[var(--chart-2)]/10',
    },
    {
      icon: Truck,
      value: kpis.activeVehicles,
      subtitle: 'unidades activas',
      label: 'Equipos Activos',
      colorClass: 'text-[var(--chart-5)] bg-[var(--chart-5)]/10',
    },
    {
      icon: Container,
      value: kpis.fleetMinusRepair,
      subtitle: 'total flota (activos - en reparacion)',
      label: 'Flota Total',
      colorClass: 'text-[var(--chart-3)] bg-[var(--chart-3)]/10',
    },
    {
      icon: ClipboardList,
      value: kpis.totalServices,
      subtitle: 'servicios registrados',
      label: 'Servicios del dia',
      colorClass: 'text-[var(--chart-1)] bg-[var(--chart-1)]/10',
    },
    {
      icon: Activity,
      value: kpis.operativityPercentage,
      subtitle: 'activos / flota total',
      label: 'Operatividad',
      tooltip: `(Equipos activos / Flota total) × 100 = (${kpis.operativeVehicles} / ${kpis.totalFleet}) × 100`,
      colorClass: cn(
        kpis.operativityPercentage >= 75
          ? 'text-emerald-600 bg-emerald-50/60'
          : kpis.operativityPercentage >= 50
            ? 'text-amber-600 bg-amber-50/60'
            : 'text-red-600 bg-red-50/60'
      ),
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isPercentage = card.label === 'Operatividad';
          const content = (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn('rounded-lg p-2.5', card.colorClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {isPercentage ? `${card.value}%` : card.value.toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );

          if (card.tooltip) {
            return (
              <Tooltip key={card.label}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{card.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return content;
        })}

        <ChecklistMissingCard
          historicalCount={checklistMissing.historicalCount}
          monthCount={checklistMissing.monthCount}
        />
      </div>
    </TooltipProvider>
  );
}
