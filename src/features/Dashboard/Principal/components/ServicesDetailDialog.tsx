'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import { CalendarIcon, Download, Loader2 } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { getServicesDetailByClient } from '../actions/actions.server';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatStatus = (status: string) =>
  status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

export default function ServicesDetailDialog({ open, onOpenChange }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const dateString = moment(selectedDate).format('YYYY-MM-DD');

  const { data: servicesDetail, isLoading } = useQuery({
    queryKey: ['services-detail-by-client', dateString],
    queryFn: () => getServicesDetailByClient(dateString),
    enabled: open,
  });

  const totalMensual = servicesDetail?.reduce((sum, c) => sum + c.mensual_count, 0) ?? 0;
  const totalAdicional = servicesDetail?.reduce((sum, c) => sum + c.adicional_count, 0) ?? 0;
  const grandTotal = totalMensual + totalAdicional;

  const handleExportImage = useCallback(async () => {
    if (!captureRef.current) return;

    // Use flushSync to force React to re-render synchronously BEFORE we
    // capture. The JSX conditionally removes overflow classes when isExporting
    // is true, so html-to-image's DOM clone won't have them.
    flushSync(() => setIsExporting(true));

    // Wait one frame so the browser applies the layout without overflow constraints
    await new Promise((r) => requestAnimationFrame(r));

    try {
      const node = captureRef.current;

      // After overflow constraints are removed, the node's dimensions reflect
      // the true content size. Add padding (32px each side) to the canvas.
      const pad = 32;
      const fullWidth = node.scrollWidth + pad * 2;
      const fullHeight = node.scrollHeight + pad * 2;

      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        width: fullWidth,
        height: fullHeight,
        style: {
          padding: `${pad}px`,
          overflow: 'visible',
        },
      });

      const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
      const filename = `servicios-por-cliente-${formattedDate}-${grandTotal}-servicios.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsExporting(false);
    }
  }, [selectedDate, grandTotal]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-4xl', !isExporting && 'max-h-[80vh] overflow-y-auto')}>
        <DialogHeader>
          <DialogTitle>Detalle de servicios por cliente</DialogTitle>
          <DialogDescription>Distribución detallada de servicios mensuales y adicionales por cliente</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Fecha:</span>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[220px] justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {moment(selectedDate).locale('es').format('DD [de] MMMM [de] YYYY')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportImage}
            disabled={isExporting || isLoading || !servicesDetail?.length}
          >
            {isExporting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Descargar imagen
          </Button>
        </div>

        {/* Capturable content — this div is what gets exported as image */}
        <div ref={captureRef}>
          {/* Title + description — hidden on screen, visible only in exported image */}
          <div className={isExporting ? 'mb-2' : 'hidden'}>
            <h3 className="text-lg font-semibold">Detalle de servicios por cliente</h3>
            <p className="text-sm text-muted-foreground">
              Distribucion detallada de servicios mensuales y adicionales por cliente
            </p>
          </div>

          {/* Date header for the image export */}
          <div className="mb-3 text-sm font-medium text-muted-foreground">
            Fecha: {moment(selectedDate).locale('es').format('DD [de] MMMM [de] YYYY')}
          </div>

          {isLoading ? (
            <CardContent className="p-0">
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-4 pb-2 border-b">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                  <Skeleton className="h-4 w-12 mx-auto" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 py-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-8 mx-auto rounded-full" />
                    <Skeleton className="h-6 w-8 mx-auto rounded-full" />
                    <Skeleton className="h-6 w-8 mx-auto rounded-full" />
                    <div className="flex gap-1 justify-center">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          ) : (
            <div className={isExporting ? '' : 'overflow-x-auto'}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Mensuales</TableHead>
                    <TableHead className="text-center">Adicionales</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Estados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(servicesDetail?.length ?? 0) > 0 ? (
                    <>
                      {servicesDetail?.map((client, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{client.client_name}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            >
                              {client.mensual_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            >
                              {client.adicional_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default">{client.total_count}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {client.status_distribution.map((status, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                  title={`${formatStatus(status.status)}: ${status.count} servicios`}
                                >
                                  {formatStatus(status.status)}: {status.count}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total row */}
                      <TableRow className="font-semibold border-t-2">
                        <TableCell className="font-bold">TOTAL GENERAL</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className="bg-green-200 text-green-900 font-bold dark:bg-green-900/50 dark:text-green-300"
                          >
                            {totalMensual}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className="bg-blue-200 text-blue-900 font-bold dark:bg-blue-900/50 dark:text-blue-300"
                          >
                            {totalAdicional}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="bg-gray-700 text-white font-bold">
                            {grandTotal}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">-</TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay datos disponibles para esta fecha
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
