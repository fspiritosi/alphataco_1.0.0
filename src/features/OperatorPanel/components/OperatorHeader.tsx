'use client';

import { useOperatorContext } from '@/app/operator/operator-layout-provider';
import { Button } from '@/components/ui/button';
import { operatorLogout } from '@/features/OperatorPanel/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { LogOut, Wrench } from 'lucide-react';
import { useState } from 'react';

const logger = new Logger('OperatorPanel/OperatorHeader');

export function OperatorHeader() {
  const context = useOperatorContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        <div className="flex flex-1 items-center gap-2 sm:gap-3">
          <Wrench className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold sm:text-base">{context.employeeName}</span>
              <span className="text-xs text-muted-foreground sm:text-sm">{context.sectorName}</span>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:inline sm:text-sm">• {context.workshopName}</span>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
