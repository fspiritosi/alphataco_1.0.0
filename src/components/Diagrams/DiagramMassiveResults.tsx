'use client';

import { CheckCircle2, Download, RefreshCw, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface ProcessingResult {
  success?: boolean;
  summary?: {
    total_created?: number;
    total_updated?: number;
    total_errors?: number;
    total_processed?: number;
    // Nueva estructura de la función SQL
    records_created?: number;
    records_updated?: number;
    records_skipped?: number;
    records_error?: number;
  };
  details?: {
    created_records?: CreatedRecord[];
    updated_records?: UpdatedRecord[];
    error_records?: ErrorRecord[];
  };
  // Nueva estructura de la función SQL
  work_diagram_id?: string;
  active_novelty_id?: string;
  inactive_novelty_id?: string;
  report?: any[];
  processing_time?: number;
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

  console.log('🔧 [DEBUG] DiagramMassiveResults - results:', results);

  //   {
  //     "summary": {
  //         "records_created": 0,
  //         "records_updated": 0,
  //         "records_skipped": 8,
  //         "records_error": 0,
  //         "total_processed": 8
  //     },
  //     "work_diagram_id": "5ab76fab-6f7f-4446-aa15-07e5a7e63b23",
  //     "active_novelty_id": "6e074fdd-6e7f-4386-9893-b3e43fb1c7fd",
  //     "inactive_novelty_id": "33e7a3cd-8c14-452b-8072-d3b727b3e404",
  //     "report": []
  // }

  // Funciones auxiliares para manejar compatibilidad entre estructuras
  const getSummary = () => {
    if (!results) return { total_created: 0, total_updated: 0, total_errors: 0, total_processed: 0 };

    // Nueva estructura (de la función SQL)
    if (results.summary?.records_created !== undefined) {
      return {
        total_created: results.summary.records_created || 0,
        total_updated: results.summary.records_updated || 0,
        total_errors: results.summary.records_error || 0,
        total_processed: results.summary.total_processed || 0,
      };
    }

    // Estructura antigua (por compatibilidad)
    return {
      total_created: results.summary?.total_created || 0,
      total_updated: results.summary?.total_updated || 0,
      total_errors: results.summary?.total_errors || 0,
      total_processed: results.summary?.total_processed || 0,
    };
  };

  const getDetails = () => {
    if (!results) return { created_records: [], updated_records: [], error_records: [] };

    // Si existe la estructura antigua, usarla
    if (results.details) {
      return {
        created_records: results.details.created_records || [],
        updated_records: results.details.updated_records || [],
        error_records: results.details.error_records || [],
      };
    }

    // Nueva estructura: convertir desde 'report' si existe
    const reportData = results.report || [];
    return {
      created_records: reportData.filter((r: any) => r.type === 'CREATED') || [],
      updated_records: reportData.filter((r: any) => r.type === 'UPDATED') || [],
      error_records: reportData.filter((r: any) => r.type === 'ERROR') || [],
    };
  };

  const details = getDetails();

  const generateTxtReport = () => {
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
        const oldType = record.old_diagram_type || 'tipo anterior';
        const newType = record.new_diagram_type || 'nuevo tipo';
        report += `     Actualizado de "${oldType}" a "${newType}"\n`;
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
    const summary = getSummary();
    const successfulRecords = summary.total_created + summary.total_updated;
    return summary.total_processed > 0 ? Math.round((successfulRecords / summary.total_processed) * 100) : 0;
  };

  const getSuccessIcon = () => {
    const summary = getSummary();
    if (summary.total_errors > 0) {
      return 'warning'; // Hay errores
    }
    return 'success'; // Todo exitoso
  };

  const summary = getSummary();

  return (
    <div className="space-y-6">
      {/* Header con estado general */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          {getSummary().total_errors === 0 ? (
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-yellow-600" />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Operación Completada</h2>
      </div>

      {/* Resumen visual con métricas */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600">{summary.total_created}</div>
              <div className="text-sm text-green-700 font-medium">Creados</div>
              <div className="text-xs text-green-600 mt-1">Nuevos registros</div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{summary.total_updated}</div>
              <div className="text-sm text-blue-700 font-medium">Actualizados</div>
              <div className="text-xs text-blue-600 mt-1">Registros modificados</div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-3xl font-bold text-red-600">{summary.total_errors}</div>
              <div className="text-sm text-red-700 font-medium">Errores</div>
              <div className="text-xs text-red-600 mt-1">Registros fallidos</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-3xl font-bold text-gray-600">{summary.total_processed}</div>
              <div className="text-sm text-gray-700 font-medium">Total</div>
              <div className="text-xs text-gray-600 mt-1">Registros procesados</div>
            </div>

            {results.processing_time && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Tiempo de procesamiento: {results.processing_time.toFixed(2)} segundos
              </div>
            )}
          </div>
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
                <Badge variant="secondary">{details.created_records.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="updated" className="flex items-center space-x-2">
                <span>Actualizados</span>
                <Badge variant="secondary">{details.updated_records.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center space-x-2">
                <span>Errores</span>
                <Badge variant="secondary">{details.error_records.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="created" className="mt-4">
              {details.created_records && details.created_records.length > 0 ? (
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
                      {details.created_records.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{record.employee_name}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 flex items-center">
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Creado
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
              {details.updated_records && details.updated_records.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Novedad Previa</TableHead>
                        <TableHead>Novedad Actual</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.updated_records.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{record.employee_name}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-gray-600">
                              {record.previous_diagram || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {record.diagram_type || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 flex items-center">
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Actualizado
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
              {details.error_records && details.error_records.length > 0 ? (
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
                      {details.error_records.map((record, index) => (
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
