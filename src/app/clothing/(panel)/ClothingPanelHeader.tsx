'use client';

import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import { LogOut, Shirt } from 'lucide-react';
import { useState } from 'react';

const logger = new Logger('Clothing/PanelHeader');

interface ClothingPanelHeaderProps {
  employeeName: string;
  logoutAction: () => Promise<never> | Promise<void>;
}

export function ClothingPanelHeader({ employeeName, logoutAction }: ClothingPanelHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAction();
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
            <Shirt className="h-4.5 w-4.5 text-primary sm:h-5 sm:w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold sm:text-base">{employeeName}</span>
            <span className="text-xs text-muted-foreground sm:text-sm">Entrega de Indumentaria</span>
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
