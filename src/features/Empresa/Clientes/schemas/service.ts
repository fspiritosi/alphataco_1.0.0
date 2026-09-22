import { z } from 'zod';

/** Contrato (`customer_services`) con sus áreas y sectores. Compartido server/client. */
export const serviceFormSchema = z
  .object({
    customer_id: z.string().min(1, { message: 'Debe seleccionar un cliente' }),
    area_id: z.array(z.string()).min(1, { message: 'Debe seleccionar al menos un area' }),
    sector_id: z.array(z.string()).min(1, { message: 'Debe seleccionar al menos un sector' }),
    service_name: z.string().trim().min(1, { message: 'Debe ingresar el nombre del servicio' }),
    contract_number: z.string().trim().optional(),
    service_start: z.date(),
    service_validity: z.date(),
    is_active: z.boolean(),
  })
  .refine((data) => data.service_validity > data.service_start, {
    message: 'La validez del servicio debe ser mayor que el inicio del servicio',
    path: ['service_validity'],
  });

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
