'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useState } from 'react';
import { getServicesDetailByClient } from '../actions/actions.server';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ServicesDetailDialog({ open, onOpenChange }: Props) {
  const [dateStr, setDateStr] = useState(moment().format('YYYY-MM-DD'));

  const { data, isLoading } = useQuery({
    queryKey: ['services-detail-by-client', dateStr],
    queryFn: () => getServicesDetailByClient(dateStr),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Servicios por Cliente</DialogTitle>
          <DialogDescription>Distribucion de servicios mensuales y adicionales por cliente.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mt-2">
          <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="w-[200px]" />
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Mensual</TableHead>
                  <TableHead className="text-right">Adicional</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.client_name}>
                    <TableCell className="font-medium">{row.client_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.mensual_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.adicional_count}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{row.total_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No hay servicios para esta fecha</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
