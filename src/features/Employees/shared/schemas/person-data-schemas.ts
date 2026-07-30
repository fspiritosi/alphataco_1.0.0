import { z } from 'zod';

/**
 * Schemas de los datos de una persona compartidos entre el legajo de empleado
 * y el pre legajo (ticket 505). Son la unica fuente de verdad de esos campos:
 * si cambia una validacion o un mensaje, cambia para ambos formularios.
 *
 * La obligatoriedad vive aca (capa de aplicacion), no en el DDL: en la base
 * `employees` y `pre_employees` admiten null en varios de estos campos.
 */

// ─── Datos personales ─────────────────────────────────────────────────────────
export const personalDataSchema = z.object({
  firstname: z.string().min(1, 'Nombre es requerido'),
  lastname: z.string().min(1, 'Apellido es requerido'),
  nationality: z.string().min(1, 'Nacionalidad es requerida'),
  born_date: z.string().min(1, 'Fecha de nacimiento es requerida'),
  cuil: z.string().min(1, 'CUIL es requerido'),
  document_type: z.string().min(1, 'Tipo de documento es requerido'),
  document_number: z.string().min(1, 'Número de documento es requerido'),
  birthplace: z.string().min(1, 'País de nacimiento es requerido'),
  gender: z.string().min(1, 'Sexo es requerido'),
  marital_status: z.string().min(1, 'Estado civil es requerido'),
  level_of_education: z.string().min(1, 'Nivel de instrucción es requerido'),
  picture: z.string().optional(),
});

export type PersonalDataValues = z.infer<typeof personalDataSchema>;

// ─── Datos de contacto ────────────────────────────────────────────────────────
export const contactDataSchema = z.object({
  street: z.string().min(1, 'Calle es requerida'),
  street_number: z.string().min(1, 'Altura es requerida'),
  province: z.number().min(1, 'Provincia es requerida'),
  city: z.number().min(1, 'Ciudad es requerida'),
  postal_code: z.string().min(1, 'Código postal es requerido'),
  phone: z.string().min(1, 'Teléfono es requerido'),
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
});

export type ContactDataValues = z.infer<typeof contactDataSchema>;

/** Campos agrupados por seccion — se usan para derivar que tab tiene errores. */
export const PERSONAL_DATA_FIELD_NAMES = Object.keys(personalDataSchema.shape) as (keyof PersonalDataValues)[];
export const CONTACT_DATA_FIELD_NAMES = Object.keys(contactDataSchema.shape) as (keyof ContactDataValues)[];
