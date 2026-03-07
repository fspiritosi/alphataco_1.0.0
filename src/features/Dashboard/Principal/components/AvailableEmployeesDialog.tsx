'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { EmployeeNotInReportResult } from '../actions/actions.server';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeNotInReportResult[];
  count: number;
}

export default function AvailableEmployeesDialog({ open, onOpenChange, employees, count }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const term = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.lastname?.toLowerCase().includes(term) ||
        e.firstname?.toLowerCase().includes(term) ||
        e.file_number?.toLowerCase().includes(term) ||
        e.cuil?.toLowerCase().includes(term)
    );
  }, [employees, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Empleados Disponibles ({count})</DialogTitle>
          <DialogDescription>
            Empleados con diagrama activo que no estan asignados al parte diario de hoy.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <Input
            placeholder="Buscar por legajo, nombre o CUIL..."
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>CUIL</TableHead>
                  <TableHead>Posicion</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Diagrama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => {
                  const customerNames = emp.customers?.map((c) => c.customer_name).filter(Boolean) ?? [];
                  return (
                    <TableRow key={emp.employee_id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/employee/action?action=view&employee_id=${emp.employee_id}`}
                          target="_blank"
                          className="font-medium hover:underline"
                        >
                          [{emp.file_number ?? '-'}] {emp.lastname}, {emp.firstname}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emp.cuil ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.position_name ?? 'Sin posicion'}</TableCell>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {emp.diagram_color && (
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: emp.diagram_color }}
                            />
                          )}
                          <span className="text-muted-foreground">{emp.diagram_short_description ?? '-'}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No hay empleados disponibles</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
