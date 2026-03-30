'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form } from '@/components/ui/form';
import {
  TerminationFormFields,
  terminationSchema,
  type TerminationFormValues,
} from '@/features/Employees/components/shared/TerminationFormFields';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MoreHorizontal, UserCheck, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { toggleEmployeeStatus } from '../lib/actions/document-actions';

interface EmployeeQuickActionsProps {
  employeeId: string;
  isActive: boolean;
  email?: string;
}

export function EmployeeQuickActions({ employeeId, isActive, email }: EmployeeQuickActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const router = useRouter();

  const form = useForm<TerminationFormValues>({
    resolver: zodResolver(terminationSchema),
    defaultValues: {
      reason_for_termination: '',
      termination_date: undefined,
    },
  });

  async function onSubmit(values: TerminationFormValues) {
    startTransition(async () => {
      try {
        await toggleEmployeeStatus(
          employeeId,
          false,
          values.reason_for_termination as Parameters<typeof toggleEmployeeStatus>[2],
          values.termination_date
        );
        toast.success('Empleado dado de baja correctamente');
        setShowDeactivateDialog(false);
        form.reset();
        router.refresh();
      } catch {
        toast.error('Error al dar de baja al empleado');
      }
    });
  }

  const handleToggleStatus = (activate: boolean) => {
    if (activate) {
      startTransition(async () => {
        try {
          await toggleEmployeeStatus(employeeId, true);
          toast.success('Empleado activado correctamente');
          setShowActivateDialog(false);
          router.refresh();
        } catch {
          toast.error('Error al activar al empleado');
        }
      });
    } else {
      setShowDeactivateDialog(true);
    }
  };

  const handleSendEmail = () => {
    if (email) {
      window.open(`mailto:${email}`, '_blank');
    } else {
      toast.error('El empleado no tiene email registrado');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSendEmail} disabled={!email}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar Email
          </DropdownMenuItem>
          {isActive ? (
            <DropdownMenuItem onClick={() => setShowDeactivateDialog(true)} className="text-destructive">
              <UserX className="h-4 w-4 mr-2" />
              Dar de Baja Empleado
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowActivateDialog(true)} className="text-green-600">
              <UserCheck className="h-4 w-4 mr-2" />
              Activar Empleado
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deactivate Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion dara de baja al empleado. Podras reactivarlo mas tarde si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="w-full">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <TerminationFormFields form={form} />
                <div className="flex gap-4 justify-end">
                  <Button variant="destructive" type="submit" disabled={isPending}>
                    {isPending ? 'Procesando...' : 'Dar de Baja'}
                  </Button>
                  <AlertDialogCancel onClick={() => setShowDeactivateDialog(false)}>Cancelar</AlertDialogCancel>
                </div>
              </form>
            </Form>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion activara al empleado y podra acceder al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleToggleStatus(true)} disabled={isPending}>
              {isPending ? 'Activando...' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
