'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import type { CurrentUserForSupervisorCheck } from '../../actions/queries.server';
import type { SupervisorOption } from './types';

export interface StepSupervisorProps {
  currentUser: CurrentUserForSupervisorCheck | undefined;
  isCurrentUserSupervisor: boolean | null;
  isLoadingCurrentUser: boolean;
  isLoadingSupervisors: boolean;
  selectedSupervisor: SupervisorOption | undefined;
  selectedSupervisorId: string;
  setIsCurrentUserSupervisor: (value: boolean | null) => void;
  setSelectedSupervisorId: (value: string) => void;
  setSupervisorOpen: (value: boolean) => void;
  skipSupervisorQuestion: boolean;
  supervisorOpen: boolean;
  supervisors: SupervisorOption[];
}

/** Paso "Supervisor": el usuario declara si es supervisor o elige al de turno. */
export function StepSupervisor({
  currentUser,
  isCurrentUserSupervisor,
  isLoadingCurrentUser,
  isLoadingSupervisors,
  selectedSupervisor,
  selectedSupervisorId,
  setIsCurrentUserSupervisor,
  setSelectedSupervisorId,
  setSupervisorOpen,
  skipSupervisorQuestion,
  supervisorOpen,
  supervisors,
}: StepSupervisorProps) {
  return (
    <div className="space-y-4">
      {/* Pregunta inicial: ¿Eres el supervisor? (omitir si skipSupervisorQuestion) */}
      {isLoadingCurrentUser ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          {!skipSupervisorQuestion && (
            <div className="space-y-3">
              <Label className="text-base font-medium">¿Eres el supervisor de este pedido?</Label>
              <p className="text-sm text-muted-foreground">
                Si eres el supervisor, el pedido se creará directamente. Si no lo eres, el pedido deberá ser aprobado
                por el supervisor que selecciones.
              </p>
              <div className="flex gap-3 mt-4">
                <Button
                  type="button"
                  variant={isCurrentUserSupervisor === true ? 'default' : 'outline'}
                  className={cn('flex-1', isCurrentUserSupervisor === true && 'bg-green-600 hover:bg-green-700')}
                  onClick={() => {
                    setIsCurrentUserSupervisor(true);
                    setSelectedSupervisorId('');
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Sí, soy el supervisor
                </Button>
                <Button
                  type="button"
                  variant={isCurrentUserSupervisor === false ? 'default' : 'outline'}
                  className={cn('flex-1', isCurrentUserSupervisor === false && 'bg-blue-600 hover:bg-blue-700')}
                  onClick={() => {
                    setIsCurrentUserSupervisor(false);
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  No, seleccionaré uno
                </Button>
              </div>
            </div>
          )}

          {skipSupervisorQuestion && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Seleccionar Supervisor</Label>
            </div>
          )}

          {/* Si ES supervisor: mostrar información del usuario actual */}
          {isCurrentUserSupervisor === true && currentUser && (
            <Card className="mt-4 border-green-200 bg-green-50 dark:bg-green-950/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">{currentUser.fullname}</p>
                    <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                    <Badge variant="success" className="mt-1">
                      Supervisor del pedido
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-green-700 dark:text-green-400 mt-3">
                  El pedido se creará directamente y aparecerá en &quot;Pedidos de Mantenimiento&quot; →
                  &quot;Pendientes&quot;.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Si NO es supervisor: mostrar selector */}
          {isCurrentUserSupervisor === false && (
            <div className="mt-4 space-y-3">
              <Label>Selecciona el supervisor de turno</Label>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg mb-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  La solicitud será enviada al supervisor para su aprobación. Una vez aprobada, pasará a &quot;Pedidos
                  de Mantenimiento&quot;.
                </p>
              </div>

              {isLoadingSupervisors ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Popover open={supervisorOpen} onOpenChange={setSupervisorOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className={cn('w-full justify-between')}>
                      {selectedSupervisor ? selectedSupervisor.fullName : 'Selecciona un supervisor'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar supervisor..." />
                      <CommandList>
                        <CommandEmpty>No se encontró supervisor</CommandEmpty>
                        <CommandGroup>
                          {supervisors.map((supervisor) => (
                            <CommandItem
                              key={supervisor.id}
                              value={supervisor.fullName}
                              disabled={!supervisor.isAvailable}
                              className={cn(!supervisor.isAvailable && 'opacity-50')}
                              onSelect={() => {
                                if (!supervisor.isAvailable) return;
                                setSelectedSupervisorId(supervisor.id);
                                setSupervisorOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  supervisor.id === selectedSupervisorId ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span>{supervisor.fullName}</span>
                                  {!supervisor.hasLinkedEmployee && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Sin empleado vinculado
                                    </Badge>
                                  )}
                                  {supervisor.hasLinkedEmployee && !supervisor.hasActiveDiagram && (
                                    <Badge variant="warning" className="text-[10px]">
                                      Sin diagrama activo
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">{supervisor.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {selectedSupervisor && (
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedSupervisor.fullName}</p>
                        <p className="text-sm text-muted-foreground">{selectedSupervisor.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
