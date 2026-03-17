'use client';

import { getPendingDeviations } from '@/app/maintenance/actions';
import { getChecklistAnswersByEquipment } from '@/app/server/GET/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PendingDeviationsAlert } from '@/features/Mantenimiento/shared/components/pending-deviations-alert';
import { Calendar, CheckCircle, ClipboardList, Link as LinkIcon, User, XCircle } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface VehicleChecklistsTabContentProps {
  equipmentId: string;
}

type ChecklistAnswer = {
  id: string;
  created_at: string;
  result: 'B' | 'M' | null;
  observations: string | null;
  critical_items_failed: string[] | string | object | null;
  ut_checklist_answer_id: string | null;
  checklist_templates?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  profile?: {
    id: string;
    fullname: string | null;
    email: string | null;
  } | null;
  checklist_deviations?: Array<{
    id: string;
    item_code: string;
    item_label: string;
    section_code: string | null;
    created_at: string;
  }>;
  ut_checklist_answer?: {
    id: string;
    equipment_id: string;
    equipment?: {
      id: string;
      domain: string | null;
      serie: string | null;
      intern_number: string | null;
    } | null;
  } | null;
};

export function VehicleChecklistsTabContent({ equipmentId }: VehicleChecklistsTabContentProps) {
  const [answers, setAnswers] = useState<ChecklistAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDeviations, setPendingDeviations] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [checklistAnswers, deviations] = await Promise.all([
          getChecklistAnswersByEquipment(equipmentId),
          getPendingDeviations(equipmentId),
        ]);
        setAnswers(checklistAnswers as any);
        setPendingDeviations(deviations as any);
      } catch (error) {
        console.error('Error loading checklist answers:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (equipmentId) {
      loadData();
    }
  }, [equipmentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Cargando checklists...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de desvíos pendientes */}
      {pendingDeviations.length > 0 && <PendingDeviationsAlert equipmentId={equipmentId} />}

      {/* Tabla de respuestas de checklist */}
      {answers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay respuestas de checklist para este equipo.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Historial de Checklists ({answers.length})
            </CardTitle>
            <CardDescription>Listado de todas las respuestas de checklist realizadas para este equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Items Críticos Fallidos</TableHead>
                    <TableHead>Unidad Tractor</TableHead>
                    <TableHead>Realizado por</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {answers.map((answer) => (
                    <TableRow key={answer.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{moment(answer.created_at).format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{answer.checklist_templates?.name || 'Checklist sin nombre'}</div>
                        {answer.checklist_templates?.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {answer.checklist_templates.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {answer.result === 'B' ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Bueno
                          </Badge>
                        ) : answer.result === 'M' ? (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Malo
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sin resultado</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {answer.critical_items_failed &&
                        ((Array.isArray(answer.critical_items_failed) && answer.critical_items_failed.length > 0) ||
                          (typeof answer.critical_items_failed === 'string' &&
                            answer.critical_items_failed.length > 0) ||
                          (typeof answer.critical_items_failed === 'object' &&
                            Object.keys(answer.critical_items_failed).length > 0)) ? (
                          <div className="space-y-1">
                            <Badge variant="destructive" className="text-xs">
                              {(() => {
                                // Manejar diferentes formatos de critical_items_failed
                                if (Array.isArray(answer.critical_items_failed)) {
                                  return answer.critical_items_failed.length;
                                }
                                // Si es string, intentar parsearlo como JSON
                                if (typeof answer.critical_items_failed === 'string') {
                                  try {
                                    const parsed = JSON.parse(answer.critical_items_failed);
                                    return Array.isArray(parsed) ? parsed.length : 1;
                                  } catch {
                                    return 1;
                                  }
                                }
                                return 1;
                              })()}{' '}
                              item(s)
                            </Badge>
                            <div className="text-xs text-muted-foreground max-w-md break-words">
                              {(() => {
                                // Extraer los labels de los items críticos fallidos
                                let items: string[] = [];
                                let dataToProcess: any = answer.critical_items_failed;

                                // Si es null o undefined, retornar vacío
                                if (dataToProcess === null || dataToProcess === undefined) {
                                  return '';
                                }

                                // Si es string, intentar parsearlo
                                if (typeof dataToProcess === 'string') {
                                  try {
                                    dataToProcess = JSON.parse(dataToProcess);
                                  } catch (e) {
                                    // Si falla el parseo, tratarlo como string simple
                                    items = [dataToProcess as string];
                                    return items.slice(0, 2).join(', ') + (items.length > 2 ? '...' : '');
                                  }
                                }

                                // Ahora procesar como array o objeto
                                if (Array.isArray(dataToProcess)) {
                                  items = dataToProcess.map((item: any) => {
                                    // Si el elemento es un string JSON, parsearlo primero
                                    if (typeof item === 'string') {
                                      try {
                                        const parsed = JSON.parse(item);
                                        // Si después de parsear es un objeto con item_label, usarlo
                                        if (parsed && typeof parsed === 'object' && parsed.item_label) {
                                          return parsed.item_label;
                                        }
                                        // Si después de parsear es un objeto con item_code, usarlo
                                        if (parsed && typeof parsed === 'object' && parsed.item_code) {
                                          return parsed.item_code;
                                        }
                                        // Si no se puede extraer nada, retornar el string original
                                        return item;
                                      } catch {
                                        // Si falla el parseo, tratarlo como string simple
                                        return item;
                                      }
                                    }

                                    // Si es objeto directamente, extraer item_label o item_code
                                    if (item && typeof item === 'object') {
                                      if (item.item_label) return item.item_label;
                                      if (item.item_code) return item.item_code;
                                    }

                                    // Si no podemos extraer nada útil, retornar representación del objeto
                                    return String(item);
                                  });
                                } else if (dataToProcess && typeof dataToProcess === 'object') {
                                  // Si es un objeto único (no array), intentar extraer el label
                                  const obj = dataToProcess as { item_label?: string; item_code?: string };
                                  if (obj.item_label) {
                                    items = [obj.item_label];
                                  } else if (obj.item_code) {
                                    items = [obj.item_code];
                                  } else {
                                    items = [JSON.stringify(dataToProcess)];
                                  }
                                } else {
                                  items = [String(dataToProcess)];
                                }

                                return items.slice(0, 2).join(', ') + (items.length > 2 ? '...' : '');
                              })()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Ninguno</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {answer.ut_checklist_answer && answer.ut_checklist_answer.equipment ? (
                          <Link
                            href={`/dashboard/equipment/action?id=${answer.ut_checklist_answer.equipment_id}&action=view`}
                          >
                            <Button variant="outline" size="sm" className="gap-2">
                              <LinkIcon className="h-3 w-3" />
                              {answer.ut_checklist_answer.equipment.domain
                                ? `${answer.ut_checklist_answer.equipment.domain} - ${answer.ut_checklist_answer.equipment.intern_number || ''}`
                                : `${answer.ut_checklist_answer.equipment.serie || ''} - ${answer.ut_checklist_answer.equipment.intern_number || ''}`}
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {answer.profile?.fullname ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{answer.profile.fullname}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Usuario desconocido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {answer.observations ? (
                          <div className="max-w-xs">
                            <p className="text-sm truncate" title={answer.observations}>
                              {answer.observations}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            window.open(`/dashboard/forms/${answer.id}/view`, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <LinkIcon className="h-4 w-4" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
