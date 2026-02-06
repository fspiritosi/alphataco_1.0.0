'use client';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getServicesDetailByClient } from '@/features/Operaciones/PartesDiarios/actions/actions';
import { useEffect, useState } from 'react';

export function ServicesDetailByClient() {
  // const servicesDetail = use(getServicesDetailByClient());
  const [servicesDetail, setServicesDetail] = useState<Awaited<ReturnType<typeof getServicesDetailByClient>> | null>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchServicesDetail = async () => {
    try {
      setIsLoading(true);
      const data = await getServicesDetailByClient();
      setServicesDetail(data);
    } catch (error) {
      console.error('Error fetching services detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesDetail();
  }, []);

  // Función para formatear los estados
  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const totalMensual = servicesDetail?.reduce((sum, client) => sum + client.mensual_count, 0);
  const totalAdicional = servicesDetail?.reduce((sum, client) => sum + client.adicional_count, 0);
  const grandTotal = (totalMensual || 0) + (totalAdicional || 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton para la tabla principal */}
        <div>
          <CardContent>
            <div className="space-y-3">
              {/* Skeleton para el header de la tabla */}
              <div className="grid grid-cols-5 gap-4 pb-2 border-b">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20 mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
                <Skeleton className="h-4 w-12 mx-auto" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
              {/* Skeleton para las filas */}
              {[...Array(5)].map((_, i) => (
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabla principal por cliente */}
      <div>
        <CardContent>
          <div className="overflow-x-auto">
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
                {(servicesDetail?.length || 0) > 0 ? (
                  servicesDetail?.map((client, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{client.client_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {client.mensual_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay datos disponibles
                    </TableCell>
                  </TableRow>
                )}
                {/* Fila de resumen total */}
                {(servicesDetail?.length || 0) > 0 && (
                  <TableRow className="font-semibold border-t-2">
                    <TableCell className="font-bold">TOTAL GENERAL</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-green-200 text-green-900 font-bold">
                        {totalMensual}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-blue-200 text-blue-900 font-bold">
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
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
