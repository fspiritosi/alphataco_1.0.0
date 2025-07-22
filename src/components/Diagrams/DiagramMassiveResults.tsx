'use client';

import { Download, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface ProcessingResult {
  success: boolean;
  summary: {
    total_created: number;
    total_updated: number;
    total_errors: number;
    total_processed: number;
  };
  details: {
    created_records: CreatedRecord[];
    updated_records: UpdatedRecord[];
    error_records: ErrorRecord[];
  };
  processing_time: number;
}

interface CreatedRecord {
  employee_id: string;
  employee_name: string;
  date: string;
  diagram_type: string;
}

interface UpdatedRecord {
  employee_id: string;
  employee_name: string;
  date: string;
  old_diagram_type: string;
  new_diagram_type: string;
}

interface ErrorRecord {
  employee_id: string;
  employee_name: string;
  date: string | null;
  error_type: string;
  error_message: string;
}

interface Props {
  results: ProcessingResult;
  onStartOver: () => void;
}

export function DiagramMassiveResults({ results, onStartOver }: Props) {
  const [downloading, setDownloading] = useState(false);

  const generateTxtReport = () => {
    const { summary, details } = results;
    const timestamp = new Date().toLocaleString('es-ES');

    let report = `REPORTE DE CARGA MASIVA DE DIAGRAMAS\n`;
    report += `Fecha y Hora: ${timestamp}\n`;
    report += `=====================================\n\n`;

    report += `RESUMEN EJECUTIVO:\n`;
    report += `- Total de registros procesados: ${summary.total_processed}\n`;
    report += `- Líneas creadas exitosamente: ${summary.total_created}\n`;
    report += `- Líneas actualizadas: ${summary.total_updated}\n`;
    report += `- Líneas con errores: ${summary.total_errors}\n`;
    report += `- Tiempo de procesamiento: ${results.processing_time?.toFixed(2) || 'N/A'} segundos\n\n`;

    if (details.created_records && details.created_records.length > 0) {
      report += `LÍNEAS CREADAS (${details.created_records.length}):\n`;
      report += `${'='.repeat(50)}\n`;
      details.created_records.forEach((record, index) => {
        report += `${(index + 1).toString().padStart(3, ' ')}. ${record.employee_name} - ${record.date}\n`;
      });
      report += `\n`;
    }

    if (details.updated_records && details.updated_records.length > 0) {
      report += `LÍNEAS ACTUALIZADAS (${details.updated_records.length}):\n`;
      report += `${'='.repeat(50)}\n`;
      details.updated_records.forEach((record, index) => {
        report += `${(index + 1).toString().padStart(3, ' ')}. ${record.employee_name} - ${record.date}\n`;
        report += `     Actualizado de tipo anterior a nuevo tipo\n`;
      });
      report += `\n`;
    }

    if (details.error_records && details.error_records.length > 0) {
      report += `LÍNEAS CON ERRORES (${details.error_records.length}):\n`;
      report += `${'='.repeat(50)}\n`;
      details.error_records.forEach((record, index) => {
        report += `${(index + 1).toString().padStart(3, ' ')}. ${record.employee_name} - ${record.date || 'N/A'}\n`;
        report += `     Tipo de Error: ${record.error_type}\n`;
        report += `     Descripción: ${record.error_message}\n`;
        report += `\n`;
      });
    }

    report += `\nFIN DEL REPORTE\n`;
    report += `Generado automáticamente por el sistema de gestión de diagramas\n`;

    return report;
  };

  const downloadReport = async () => {
    setDownloading(true);

    try {
      const report = generateTxtReport();
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-diagramas-masivos-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Reporte descargado correctamente');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Error al descargar el reporte');
    } finally {
      setDownloading(false);
    }
  };

  const getSuccessRate = () => {
    const successful = results.summary.total_created + results.summary.total_updated;
    const total = results.summary.total_processed;
    return total > 0 ? ((successful / total) * 100).toFixed(1) : '0';
  };

  return (
    <div className="space-y-6">
      {/* Header con estado general */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          {results.summary.total_errors === 0 ? (
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          ) : (
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Operación Completada</h2>
        <p className="text-muted-foreground">
          Tasa de éxito: {getSuccessRate()}% ({results.summary.total_created + results.summary.total_updated} de{' '}
          {results.summary.total_processed})
        </p>
      </div>

      {/* Resumen visual con métricas */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600">{results.summary.total_created}</div>
              <div className="text-sm text-green-700 font-medium">Creados</div>
              <div className="text-xs text-green-600 mt-1">Nuevos registros</div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{results.summary.total_updated}</div>
              <div className="text-sm text-blue-700 font-medium">Actualizados</div>
              <div className="text-xs text-blue-600 mt-1">Registros modificados</div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-3xl font-bold text-red-600">{results.summary.total_errors}</div>
              <div className="text-sm text-red-700 font-medium">Errores</div>
              <div className="text-xs text-red-600 mt-1">Registros fallidos</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-3xl font-bold text-gray-600">{results.summary.total_processed}</div>
              <div className="text-sm text-gray-700 font-medium">Total</div>
              <div className="text-xs text-gray-600 mt-1">Registros procesados</div>
            </div>
          </div>

          {results.processing_time && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Tiempo de procesamiento: {results.processing_time.toFixed(2)} segundos
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalles por categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Operación</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="created" className="w-full">
            <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
              <TabsTrigger value="created" className="flex items-center space-x-2">
                <span>Creados</span>
                <Badge variant="secondary">{results.details.created_records?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="updated" className="flex items-center space-x-2">
                <span>Actualizados</span>
                <Badge variant="secondary">{results.details.updated_records?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center space-x-2">
                <span>Errores</span>
                <Badge variant="destructive">{results.details.error_records?.length || 0}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="created" className="mt-4">
              {results.details.created_records && results.details.created_records.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.details.created_records.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{record.employee_name}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              ✅ Creado
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">No se crearon nuevos registros</div>
              )}
            </TabsContent>

            <TabsContent value="updated" className="mt-4">
              {results.details.updated_records && results.details.updated_records.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.details.updated_records.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{record.employee_name}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              🔄 Actualizado
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">No se actualizaron registros</div>
              )}
            </TabsContent>

            <TabsContent value="errors" className="mt-4">
              {results.details.error_records && results.details.error_records.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo de Error</TableHead>
                        <TableHead>Descripción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.details.error_records.map((record, index) => (
                        <TableRow key={index} className="bg-red-25">
                          <TableCell className="font-medium">{record.employee_name}</TableCell>
                          <TableCell>{record.date || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{record.error_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-red-600">{record.error_message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">No se encontraron errores</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={downloadReport}
          disabled={downloading}
          className="flex-1 flex items-center justify-center space-x-2"
          variant="outline"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Descargando...' : 'Descargar Reporte TXT'}</span>
        </Button>

        <Button onClick={onStartOver} className="flex-1 flex items-center justify-center space-x-2">
          <RotateCcw className="w-4 h-4" />
          <span>Nueva Carga Masiva</span>
        </Button>
      </div>

      {/* Nota informativa */}
      <div className="text-sm text-muted-foreground text-center bg-gray-50 p-4 rounded-lg">
        <p>
          <strong>Nota:</strong> El reporte TXT contiene todos los detalles de la operación incluyendo empleados, fechas
          y tipos de error específicos para revisión manual.
        </p>
      </div>
    </div>
  );
}
