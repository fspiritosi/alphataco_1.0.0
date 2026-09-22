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
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { condition_enum } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, MoreHorizontal, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { toggleVehicleStatus } from '../lib/actions/vehicle-actions';

interface VehicleQuickActionsProps {
  equipmentId: string | undefined;
  isActive: boolean | undefined;
  condition: condition_enum | null | undefined;
}

const terminationSchema = z.object({
  reason_for_termination: z.string({ required_error: 'La razón de baja es requerida.' }).min(1, 'La razón de baja es requerida.'),
  termination_date: z.date({ required_error: 'La fecha de baja es requerida.' }),
});

const termination_reason_enum_equipment = ['venta', 'destrucción total', 'devolución', 'otro'];

export function VehicleQuickActions({ equipmentId, isActive, condition }: VehicleQuickActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  const handleToggleStatus = (activate: boolean) => {
    startTransition(async () => {
      try {
        // Here you would call your server action to toggle employee status
        await toggleVehicleStatus(equipmentId!, activate, condition ?? condition_enum.operativo);
        toast.success(`Equipo ${activate ? 'activado' : 'dado de baja'} correctamente`);
        setShowDeactivateDialog(false);
        setShowActivateDialog(false);
        router.refresh();
      } catch (error) {
        toast.error('Error al cambiar el estado del equipo');
      }
    });
  };

  const form = useForm<z.infer<typeof terminationSchema>>({
    resolver: zodResolver(terminationSchema),
    defaultValues: {
      reason_for_termination: '',
      termination_date: undefined,
    },
  });

  if (!equipmentId) return null;

  async function onSubmit(values: z.infer<typeof terminationSchema>) {
    startTransition(async () => {
      try {
        await toggleVehicleStatus(
          equipmentId!,
          false,
          condition_enum.no_operativo,
          values.reason_for_termination,
          values.termination_date
        );
        toast.success(`Equipo dado de baja correctamente`);
        setShowDeactivateDialog(false);
        form.reset();
        router.refresh();
      } catch (error) {
        toast.error('Error al dar de baja al equipo');
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isActive ? (
            <DropdownMenuItem onClick={() => setShowDeactivateDialog(true)} className="text-destructive">
              <Truck className="h-4 w-4 mr-2" />
              Dar de Baja Equipo
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowActivateDialog(true)} className="text-green-600">
              <Truck className="h-4 w-4 mr-2" />
              Activar Equipo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deactivate Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción dará de baja al equipo. Podrás reactivarlo más tarde si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="w-full">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="reason_for_termination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo de Baja</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona la razón" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {termination_reason_enum_equipment.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Elige la razón por la que deseas dar de baja al empleado</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="termination_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Baja</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={'outline'} className={cn(' pl-3 text-left font-normal')}>
                              {field.value ? (
                                format(field.value, 'P', {
                                  locale: es,
                                })
                              ) : (
                                <span>Elegir fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Fecha en la que se dio de baja</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4 justify-end">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Dando de baja...' : 'Dar de baja'}
                  </Button>
                  <AlertDialogCancel onClick={() => setShowDeactivateDialog(false)}>Cancelar</AlertDialogCancel>
                </div>
              </form>
            </Form>
          </div>
          {/* <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleToggleStatus(false)} disabled={isPending}>
              {isPending ? 'Dando de baja...' : 'Dar de baja'}
            </AlertDialogAction>
          </AlertDialogFooter> */}
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar equipo?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción activará al equipo y podrá acceder al sistema.</AlertDialogDescription>
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
