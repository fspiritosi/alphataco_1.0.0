'use client';

import { useOperatorContext } from '@/app/operator/operator-layout-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getWorkOrdersForOperator, operatorLogout } from '@/features/OperatorPanel/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Wrench } from 'lucide-react';
import { useState } from 'react';

const logger = new Logger('OperatorPanel/OperatorHeader');

export function OperatorHeader() {
  const context = useOperatorContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: workOrders } = useQuery({
    queryKey: ['operator-work-orders', context.sectorId],
    queryFn: () => getWorkOrdersForOperator(context.sectorId),
  });

  const activeCount = workOrders?.filter((wo) => !wo.is_blocked).length ?? 0;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await operatorLogout();
    } catch (error) {
      logger.error('Logout error', { data: { error } });
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
        <div className="flex flex-1 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
            <Wrench className="h-4.5 w-4.5 text-primary sm:h-5 sm:w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold sm:text-base">{context.employeeName}</span>
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs tabular-nums">
                  {activeCount} OT
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
              <span>{context.sectorName}</span>
              <span className="hidden sm:inline"> · {context.workshopName}</span>
            </div>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut} className="gap-2 h-10">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
