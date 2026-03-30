import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Mail } from 'lucide-react';
import moment from 'moment';
import type { EmployeeDetailData } from '../actions.server';

interface EmployeeHeaderContentProps {
  employee: NonNullable<EmployeeDetailData>;
}

export function EmployeeHeaderContent({ employee }: EmployeeHeaderContentProps) {
  const fullName = `${employee.lastname} ${employee.firstname}`;
  const initials = `${employee.lastname?.[0] || ''}${employee.firstname?.[0] || ''}`;

  return (
    <div>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Foto de perfil */}
          <div className="flex-shrink-0">
            <Avatar className="h-24 w-24">
              <AvatarImage src={employee.picture || undefined} alt={fullName} />
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>

          {/* Información del empleado */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
              <p className="text-muted-foreground">{employee.company_positions?.name || 'Sin posición asignada'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{employee.email || 'Sin email'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">DNI: {employee.document_number || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={employee.is_active ? 'default' : 'secondary'}
                  className={employee.is_active ? 'bg-green-100 text-green-800' : ''}
                >
                  {employee.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>

            {employee.hierarchy?.name && (
              <div className="text-sm text-muted-foreground">
                <strong>Posición Jerárquica:</strong> {employee.hierarchy.name}
              </div>
            )}
          </div>
        </div>

        {/* Sección de baja (solo si el empleado está inactivo) */}
        {!employee.is_active && (
          <div className="mt-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {employee.termination_date && (
                <div className="flex gap-2 text-red-400">
                  <p className="font-medium">Fecha de Baja:</p>
                  <p className="font-medium">{moment(employee.termination_date).format('DD/MM/YYYY')}</p>
                </div>
              )}
              {employee.reason_for_termination && (
                <div className="flex gap-2 text-red-400">
                  <p className="font-medium">Razón de Baja:</p>
                  <p className="font-medium">{employee.reason_for_termination}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <Separator className="my-2 mt-0" />
    </div>
  );
}
