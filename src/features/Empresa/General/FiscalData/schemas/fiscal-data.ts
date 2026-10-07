import { z } from 'zod';

/**
 * Schemas de Datos fiscales. Módulo sin directiva: lo usan los forms (cliente) y las server
 * actions (servidor). Nunca moverlos a un archivo `'use client'`.
 */

export const TAX_CONDITIONS = ['responsable_inscripto', 'monotributo', 'exento'] as const;
export const GROSS_INCOME_REGIMES = ['local', 'convenio_multilateral', 'exento'] as const;
export const ARCA_ENVIRONMENTS = ['homologacion', 'produccion'] as const;

export const fiscalProfileSchema = z.object({
  tax_condition: z.enum(TAX_CONDITIONS, { required_error: 'Elegí la condición frente al IVA' }),
  gross_income_regime: z.enum(GROSS_INCOME_REGIMES).nullable(),
  gross_income_number: z
    .string()
    .trim()
    .max(30, 'Máximo 30 caracteres')
    .transform((v) => v || null)
    .nullable(),
  activity_start_date: z.string({ required_error: 'La fecha de inicio de actividades es requerida' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  fiscal_street: z.string().trim().min(1, 'El domicilio fiscal es requerido').max(255, 'Máximo 255 caracteres'),
  fiscal_city: z.string().trim().min(1, 'La localidad es requerida').max(120, 'Máximo 120 caracteres'),
  fiscal_province_id: z.string().min(1, 'Elegí la provincia'),
  fiscal_postal_code: z
    .string()
    .trim()
    .min(4, 'Código postal inválido')
    .max(10, 'Código postal inválido')
    .regex(/^[A-Za-z0-9]+$/, 'Solo letras y números'),
});

export type FiscalProfileValues = z.infer<typeof fiscalProfileSchema>;

export const salesPointSchema = z.object({
  number: z.coerce
    .number({ invalid_type_error: 'Ingresá el número' })
    .int('Solo números enteros')
    .min(1, 'Entre 1 y 99999')
    .max(99999, 'Entre 1 y 99999'),
  name: z.string().trim().min(1, 'Poné un nombre para reconocerlo').max(120, 'Máximo 120 caracteres'),
});

export type SalesPointValues = z.infer<typeof salesPointSchema>;

export const certificateAliasSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9._-]{1,50}$/, 'Solo letras, números, punto, guion y guion bajo (hasta 50)');

export const TAX_CONDITION_LABELS: Record<(typeof TAX_CONDITIONS)[number], string> = {
  responsable_inscripto: 'Responsable Inscripto',
  monotributo: 'Monotributo',
  exento: 'IVA Exento',
};

export const TAX_CONDITION_LETTERS: Record<(typeof TAX_CONDITIONS)[number], string> = {
  responsable_inscripto: 'Emitís Facturas A y B.',
  monotributo: 'Emitís Facturas C.',
  exento: 'Emitís Facturas C.',
};

export const GROSS_INCOME_REGIME_LABELS: Record<(typeof GROSS_INCOME_REGIMES)[number], string> = {
  local: 'Local',
  convenio_multilateral: 'Convenio Multilateral',
  exento: 'Exento',
};

export const ENVIRONMENT_LABELS: Record<(typeof ARCA_ENVIRONMENTS)[number], string> = {
  homologacion: 'Homologación',
  produccion: 'Producción',
};
