'use client';

import { getEmployeeById } from '@/app/server/GET/actions';
import BackButton from '@/components/BackButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useEmployeeFormReset } from '@/store/employeeFormReset';
import { Edit, FileText, Mail, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EmployeeQuickActions } from './employee-quick-actions';

interface EmployeeHeaderProps {
  employee: Awaited<ReturnType<typeof getEmployeeById>>;
  isEditable?: boolean;
  showEditButton: boolean;
  exitEditMode: boolean;
}

function EmployeeHeaderContent({ employee, isEditable, showEditButton, exitEditMode }: EmployeeHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { triggerReset } = useEmployeeFormReset();

  if (!employee) {
    return (
      <Card className="">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">No se pudo cargar la información del empleado</div>
        </CardContent>
      </Card>
    );
  }

  const fullName = `${employee.lastname} ${employee.firstname}`;
  const initials = `${employee.lastname?.[0] || ''}${employee.firstname?.[0] || ''}`;

  const onEdit = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('action', 'edit');
    router.push(`${pathname}?${params.toString()}`);
  };
  const onExitEditMode = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('action', 'view');
    router.push(`${pathname}?${params.toString()}`);
    triggerReset(); // Reset del formulario
  };

  return (
    <div className="">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <Avatar className="h-24 w-24">
              <AvatarImage src={employee.picture || undefined} alt={fullName} />
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>

          {/* Employee Info */}
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
                <span className="text-sm">DNI: {employee.document_number}</span>
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

          {/* Action Buttons */}
          {showEditButton && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit()}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          )}
          {exitEditMode && (
            <Button variant="outline" size="sm" onClick={() => onExitEditMode()}>
              <X className="h-4 w-4 mr-2 text-red-400" />
              Cancelar
            </Button>
          )}
          <EmployeeQuickActions employeeId={employee.id} isActive={employee.is_active!} email={employee.email!} />
          <Separator orientation="vertical" className="w-[1px] h-10 my-0" />

          <div className="flex items-center justify-end gap-4 mb-4">
            <BackButton size="sm" />
          </div>
        </div>
        {!employee?.is_active && (
          <div className="mt-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {employee?.termination_date && (
                <div className="flex gap-2 text-red-400">
                  <p className="font-medium">Fecha de Baja:</p>
                  <p className="font-medium">{new Date(employee.termination_date).toLocaleDateString()}</p>
                </div>
              )}
              {employee?.reason_for_termination && (
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

export function EmployeeHeader(props: EmployeeHeaderProps) {
  return <EmployeeHeaderContent {...props} />;
}
