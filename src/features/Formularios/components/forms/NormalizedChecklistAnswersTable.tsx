'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import moment from 'moment';
import Link from 'next/link';

type ChecklistAnswer = {
  id: string;
  created_at: string | null;
  result: string | null;
  answer_data:
    | {
        chofer?: string;
        fecha?: string;
        hora?: string;
        kilometraje?: string;
        horometro?: string;
      }
    | any;
  equipment:
    | {
        id: string;
        domain: string | null;
        serie: string | null;
        intern_number: string | null;
        brand: { name: string } | null;
        model: { name: string } | null;
      }
    | null
    | any;
  user:
    | {
        id: string;
        fullname: string | null;
      }
    | null
    | any;
};

export function NormalizedChecklistAnswersTable({
  answers,
  templateId,
}: {
  answers: ChecklistAnswer[];
  templateId: string;
}) {
  if (answers.length === 0) {
    return (
      <div className="p-8 border rounded-lg text-center">
        <p className="text-muted-foreground">No hay respuestas registradas para este checklist.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Equipo</TableHead>
            <TableHead>Chofer</TableHead>
            <TableHead>Kilometraje</TableHead>
            <TableHead>Horómetro</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {answers.map((answer) => {
            const equipment = Array.isArray(answer.equipment) ? answer.equipment[0] : answer.equipment;
            const user = Array.isArray(answer.user) ? answer.user[0] : answer.user;
            const equipmentLabel = equipment
              ? equipment.domain
                ? `${equipment.domain} - ${equipment.intern_number || ''}`
                : `${equipment.serie || ''} - ${equipment.intern_number || ''}`
              : 'N/A';

            return (
              <TableRow key={answer.id}>
                <TableCell>
                  {answer.answer_data?.fecha
                    ? moment(answer.answer_data.fecha).format('DD/MM/YYYY')
                    : answer.created_at
                      ? moment(answer.created_at).format('DD/MM/YYYY')
                      : '-'}
                  {answer.answer_data?.hora && ` ${answer.answer_data.hora}`}
                </TableCell>
                <TableCell>{equipmentLabel}</TableCell>
                <TableCell>{answer.answer_data?.chofer || 'N/A'}</TableCell>
                <TableCell>{answer.answer_data?.kilometraje || 'N/A'}</TableCell>
                <TableCell>{answer.answer_data?.horometro || 'N/A'}</TableCell>
                <TableCell>
                  {answer.result === 'M' || answer.result === 'failed' ? (
                    <Badge variant="destructive">Fallido</Badge>
                  ) : answer.result === 'B' || answer.result === 'passed' ? (
                    <Badge variant="default">Aprobado</Badge>
                  ) : (
                    <Badge variant="outline">Pendiente</Badge>
                  )}
                </TableCell>
                <TableCell>{user?.fullname || 'N/A'}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/forms/${templateId}/view/${answer.id}`}>
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
