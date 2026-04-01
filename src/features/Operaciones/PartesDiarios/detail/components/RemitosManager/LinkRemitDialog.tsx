'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Link2, Search } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import React from 'react';
import { toast } from 'sonner';

import type { AvailableRemitoForLinking } from './actions.server';
import { getAvailableRemitosForLinking, linkExistingRemito } from './actions.server';

interface LinkRemitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowId: string;
  dailyReportId: string;
  onSuccess: () => void;
}

export function LinkRemitDialog({ open, onOpenChange, rowId, dailyReportId, onSuccess }: LinkRemitDialogProps) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setSearchInput('');
      setDebouncedSearch('');
    }
  }, [open]);

  const { data: availableRemitos = [], isLoading } = useQuery({
    queryKey: ['available-remitos-for-linking', dailyReportId, rowId],
    queryFn: () => getAvailableRemitosForLinking(dailyReportId, rowId),
    enabled: open && !!dailyReportId && !!rowId,
    staleTime: 2 * 60 * 1000,
  });

  // Client-side filter by search input (server already limits to 50)
  const filteredRemitos = React.useMemo(() => {
    if (!debouncedSearch.trim()) return availableRemitos;
    const q = debouncedSearch.trim().toLowerCase();
    return availableRemitos.filter((r) => r.remit_number.toLowerCase().includes(q));
  }, [availableRemitos, debouncedSearch]);

  const linkMutation = useMutation({
    mutationFn: (remitoId: string) => linkExistingRemito(remitoId, rowId),
    onSuccess: (newRemito) => {
      queryClient.invalidateQueries({ queryKey: ['remitos', rowId] });
      toast.success(`Remito ${newRemito.remit_number} vinculado exitosamente`);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al vincular el remito');
    },
  });

  const handleLink = (remitoId: string) => {
    linkMutation.mutate(remitoId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Vincular Remito Existente
          </DialogTitle>
          <DialogDescription>
            Seleccione un remito de otra línea del mismo parte diario para vincularlo aquí
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número de remito..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="space-y-3 flex-shrink-0">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredRemitos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center py-10">
              <div className="space-y-2">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {debouncedSearch
                    ? 'No se encontraron remitos con ese número'
                    : 'No hay remitos disponibles para vincular en este parte diario'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="space-y-2 pr-1">
                {!debouncedSearch && (
                  <p className="text-xs text-muted-foreground px-1 mb-2">
                    Remitos de otras líneas de este parte diario
                  </p>
                )}
                {filteredRemitos.map((remito: AvailableRemitoForLinking) => {
                  const customer = remito.dailyreportrows?.customers;
                  const reportDate = remito.dailyreportrows?.dailyreport?.date;
                  const docCount = remito.remito_documents.length;
                  const isSameCustomer = remito.isSameCustomer;

                  return (
                    <div
                      key={remito.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        isSameCustomer
                          ? 'hover:bg-muted/50'
                          : 'border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base">{remito.remit_number}</span>
                            <Badge variant="secondary" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              {docCount} {docCount === 1 ? 'documento' : 'documentos'}
                            </Badge>
                            {!isSameCustomer && (
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                Cliente diferente
                              </Badge>
                            )}
                          </div>

                          {customer && (
                            <p className="text-sm text-muted-foreground">
                              Cliente: <span className="font-medium text-foreground">{customer.name}</span>
                            </p>
                          )}

                          {reportDate && (
                            <p className="text-xs text-muted-foreground">
                              Parte: {moment(reportDate).locale('es').format('D [de] MMMM, YYYY')}
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant={isSameCustomer ? 'default' : 'outline'}
                          onClick={() => handleLink(remito.id)}
                          disabled={linkMutation.isPending}
                        >
                          <Link2 className="h-4 w-4 mr-1.5" />
                          Vincular
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
