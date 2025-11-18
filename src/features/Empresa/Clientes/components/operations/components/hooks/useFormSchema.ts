import { useMemo } from 'react';
import { z } from 'zod';

export function useFormSchema(isCreating: boolean) {
  return useMemo(() => {
    const baseSchema = {
      customer: z.string().min(1, 'El cliente es requerido'),
      services: z.string().min(1, 'El servicio es requerido'),
      item: z.string().min(1, 'El ítem es requerido'),
      working_day: z.string().min(1, 'La jornada es requerida'),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      employees: z.array(z.string()).optional(),
      equipment: z.array(z.string()).optional(),
      equipos_cliente: z.array(z.string()).max(2, 'Solo se pueden seleccionar 2 equipos cliente').optional(), // Opcional
      observations: z.string().optional(),
      sector_service_id: z.string().min(1, 'El sector es requerido'), // Obligatorio
      areas_service_id: z.string().min(1, 'El área es requerida'), // Obligatorio
    };

    if (isCreating) {
      // En modo creación, remit_number y date son obligatorios
      return z
        .object({
          ...baseSchema,
          date: z.date({ required_error: 'La fecha es requerida' }),
          remit_number: z.string().min(1, 'El número de remito es requerido'),
        })
        .refine(
          (data) => {
            // Al menos 1 empleado O 1 equipo
            const hasEmployees = data.employees && data.employees.length > 0;
            const hasEquipment = data.equipment && data.equipment.length > 0;
            return hasEmployees || hasEquipment;
          },
          {
            message: 'Debe seleccionar al menos un empleado o un equipo',
            path: ['employees'],
          }
        );
    }

    // En modo edición
    return z
      .object({
        ...baseSchema,
        status: z.string().min(1, 'El estado es requerido'),
        remit_number: z.string().optional(),
      })
      .refine(
        (data) => {
          // Si el estado es "en_certificacion", remit_number es obligatorio
          if (data.status === 'en_certificacion') {
            return data.remit_number && data.remit_number.length > 0;
          }
          return true;
        },
        {
          message: 'El número de remito es requerido cuando el estado es "En certificación"',
          path: ['remit_number'],
        }
      );
  }, [isCreating]);
}
