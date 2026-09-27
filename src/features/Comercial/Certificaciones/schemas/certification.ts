import { z } from 'zod';

export const certificationFormSchema = z
  .object({
    customerId: z.string().uuid({ message: 'El cliente es requerido' }),
    customerServiceId: z.string().uuid({ message: 'El contrato es requerido' }),
    periodFrom: z.string().min(1, { message: 'La fecha desde es requerida' }),
    periodTo: z.string().min(1, { message: 'La fecha hasta es requerida' }),
    notes: z.string().trim().optional(),
  })
  .refine((v) => v.periodTo >= v.periodFrom, {
    message: 'El período no puede terminar antes de empezar',
    path: ['periodTo'],
  });

export type CertificationFormValues = z.infer<typeof certificationFormSchema>;
