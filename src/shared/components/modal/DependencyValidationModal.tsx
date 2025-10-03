'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Database } from '../../../../database.types';

export interface DependencyConfig {
  sourceTable: keyof Database['public']['Tables'];
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  displayColumns: string[];
  displayLabels: string[];
  relationName?: string;
}

export interface DependencyValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'force' | 'replace', replacementValue?: string) => void;
  recordId: string;
  recordName: string;
  dependencies: DependencyConfig[];
  title?: string;
  description?: string;
  fetchDependencies: (config: DependencyConfig, recordId: string) => Promise<{ data: any[]; count: number }>;
  fetchReplacementOptions?: (config: DependencyConfig, excludeId?: string) => Promise<{ id: string; name: string }[]>;
}

interface DependencyResult {
  config: DependencyConfig;
  records: any[];
  totalCount: number;
  loading: boolean;
  error?: string;
}

export default function DependencyValidationModal({
  isOpen,
  onClose,
  onConfirm,
  recordId,
  recordName,
  dependencies,
  title = 'Confirmar desactivación',
  description = 'Este registro está siendo utilizado por otros elementos del sistema.',
  fetchDependencies,
  fetchReplacementOptions,
}: DependencyValidationModalProps) {
  const [dependencyResults, setDependencyResults] = useState<DependencyResult[]>([]);
  const [allReplacementOptions, setAllReplacementOptions] = useState<{ id: string; name: string }[]>([]);
  const [globalReplacement, setGlobalReplacement] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && dependencies.length > 0) {
      loadDependencies();
      if (fetchReplacementOptions) {
        loadReplacementOptions();
      }
    }
  }, [isOpen, dependencies, recordId]);

  const loadDependencies = async () => {
    setLoading(true);
    const results: DependencyResult[] = [];

    for (const config of dependencies) {
      try {
        const { data, count } = await fetchDependencies(config, recordId);
        results.push({
          config,
          records: data,
          totalCount: count,
          loading: false,
        });
      } catch (error) {
        results.push({
          config,
          records: [],
          totalCount: 0,
          loading: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    setDependencyResults(results);
    setLoading(false);
  };

  const loadReplacementOptions = async () => {
    if (!fetchReplacementOptions) return;

    try {
      // Usar la primera configuración para obtener las opciones (asumiendo que todas son del mismo tipo)
      const configOptions = await fetchReplacementOptions(dependencies[0], recordId);
      setAllReplacementOptions(configOptions);
    } catch (error) {
      console.error('Error loading replacement options:', error);
    }
  };

  const getTotalDependencies = () => {
    return dependencyResults.reduce((total, result) => total + result.totalCount, 0);
  };

  const handleConfirm = (action: 'force' | 'replace') => {
    if (action === 'replace') {
      // Crear objeto de reemplazos para todas las tablas dependientes
      // const replacements: { [key: string]: string } = {};
      // dependencyResults.forEach(result => {
      //     if (result.totalCount > 0) {
      //         replacements[result.config.targetTable] = globalReplacement;
      //     }
      // });

      onConfirm(action, globalReplacement);
    } else {
      onConfirm(action);
    }
  };

  const totalDependencies = getTotalDependencies();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-800">
              <Users className="h-4 w-4" />
              <span className="font-medium">
                El registro {recordName} está siendo utilizado por {totalDependencies} elemento(s)
              </span>
            </div>
          </div>

          <div className="mt-3 p-3  border border-red-300 rounded-md flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-700 flex-shrink-0 mt-0.5" />
            <div className="text-red-800 text-sm">
              <strong className="font-semibold">Atención:</strong> Por favor revisa si este registro tiene documentos
              especiales asociados luego de proceder.
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Cargando dependencias...</p>
            </div>
          ) : (
            <>
              {/* Select global para reemplazo */}
              {totalDependencies > 0 && fetchReplacementOptions && allReplacementOptions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-blue-900">Opciones de reemplazo</h4>
                  <p className="text-sm text-blue-700">
                    Selecciona con qué valor reemplazar todas las referencias a {recordName}:
                  </p>
                  <Select value={globalReplacement} onValueChange={setGlobalReplacement}>
                    <SelectTrigger className="bg-white dark:bg-gray-800 dark:text-white">
                      <SelectValue
                        className="dark:text-white placeholder:text-white"
                        placeholder="Seleccionar opción de reemplazo..."
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NULL__">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Dejar vacío</span>
                          <span className="text-xs text-gray-500">Remover la referencia sin reemplazar</span>
                        </div>
                      </SelectItem>
                      {allReplacementOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{option.name}</span>
                            <span className="text-xs text-gray-500">Reemplazar con este valor</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <ScrollArea className="max-h-[calc(80vh-200px)]">
                <div className="space-y-6">
                  {dependencyResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">
                        {result.config.relationName || result.config.targetTable} ({result.totalCount} registros)
                      </h4>

                      {result.error ? (
                        <div className="text-red-600 text-sm">Error: {result.error}</div>
                      ) : result.totalCount > 0 ? (
                        <div className="mb-4 max-h-32 overflow-y-auto">
                          <div className="grid gap-2">
                            {result.records.map((record, recordIndex) => (
                              <div key={recordIndex} className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                {result.config.displayColumns.map((column, colIndex) => (
                                  <span key={colIndex} className="mr-4">
                                    <strong>{result.config.displayLabels[colIndex]}:</strong> {record[column] || 'N/A'}
                                  </span>
                                ))}
                              </div>
                            ))}
                            {result.totalCount > 10 && (
                              <div className="text-sm text-gray-500 italic">
                                ... y {result.totalCount - 10} registros más
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-green-600 text-sm">✓ Sin dependencias</div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          {totalDependencies > 0 && (
            <>
              {fetchReplacementOptions && allReplacementOptions.length > 0 && (
                <Button
                  variant="default"
                  onClick={() => handleConfirm('replace')}
                  disabled={loading || !globalReplacement}
                >
                  Reemplazar y desactivar
                </Button>
              )}
              {/* <Button variant="destructive" onClick={() => handleConfirm('force')} disabled={loading}>
                                Desactivar igualmente
                            </Button> */}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
