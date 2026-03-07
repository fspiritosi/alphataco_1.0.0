'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { VehicleNotInReportResult } from '../actions/actions.server';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: VehicleNotInReportResult[];
  count: number;
}

export default function AvailableVehiclesDialog({ open, onOpenChange, vehicles, count }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles;
    const term = search.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.domain?.toLowerCase().includes(term) ||
        v.type_name?.toLowerCase().includes(term) ||
        v.sub_type_name?.toLowerCase().includes(term)
    );
  }, [vehicles, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vehiculos Disponibles ({count})</DialogTitle>
          <DialogDescription>Vehiculos con diagrama activo que no estan en el parte diario de hoy.</DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <Input
            placeholder="Buscar por dominio, tipo o subtipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="mt-4">
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dominio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>SubTipo</TableHead>
                  <TableHead>Clientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((vehicle) => {
                  const customerNames = vehicle.customers?.map((c) => c.customer_name).filter(Boolean) ?? [];
                  return (
                    <TableRow key={vehicle.vehicle_id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/equipment/action?action=view&id=${vehicle.vehicle_id}`}
                          target="_blank"
                          className="font-medium hover:underline"
                        >
                          {vehicle.domain}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{vehicle.type_name ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{vehicle.sub_type_name ?? '-'}</TableCell>
                      <TableCell>
                        {customerNames.length === 0 ? (
                          <Badge variant="outline">Sin afectar</Badge>
                        ) : (
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline">
                                  {customerNames[0]}
                                  {customerNames.length > 1 && ` +${customerNames.length - 1}`}
                                </Badge>
                              </TooltipTrigger>
                              {customerNames.length > 1 && (
                                <TooltipContent>
                                  <div className="flex flex-col gap-1">
                                    {customerNames.map((name) => (
                                      <span key={name}>{name}</span>
                                    ))}
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No hay vehiculos disponibles</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
