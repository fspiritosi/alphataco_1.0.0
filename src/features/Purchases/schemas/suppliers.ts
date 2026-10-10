import { z } from 'zod';
import { isReceiverVatConditionId } from '@/shared/lib/arca/catalogs';
import { isValidCbu, isValidSupplierCuit } from '../lib/supplier-ids';

/**
 * Schemas de proveedores. Modulo SIN directiva: lo usan el formulario (cliente) y las actions
 * (servidor). Los campos de texto vacios viajan como '' y la action los guarda como NULL.
 */

const optionalText = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

export const supplierContactSchema = z.object({
  /** Id del contacto existente; vacio = contacto nuevo. */
  id: z.string(),
  name: z.string().trim().min(1, 'El nombre del contacto es obligatorio').max(150, 'Máximo 150 caracteres'),
  email: z.string().trim().max(200).refine((v) => !v || z.string().email().safeParse(v).success, 'Email inválido'),
  phone: optionalText(50),
  role: optionalText(100),
  isPrimary: z.boolean(),
});

export const supplierFormSchema = z
  .object({
    name: z.string().trim().min(1, 'La razón social es obligatoria').max(200, 'Máximo 200 caracteres'),
    tradeName: optionalText(200),
    cuit: z.string().trim().min(1, 'El CUIT es obligatorio').refine(isValidSupplierCuit, 'CUIT inválido'),
    vatConditionId: z
      .string()
      .min(1, 'Elegí la condición frente al IVA')
      .refine((v) => isReceiverVatConditionId(Number(v)), 'Condición frente al IVA inválida'),
    street: optionalText(200),
    city: optionalText(100),
    province: optionalText(100),
    postalCode: optionalText(20),
    paymentTermDays: z
      .string()
      .trim()
      .refine((v) => !v || (/^\d{1,3}$/.test(v) && Number(v) <= 365), 'Entre 0 y 365 días'),
    bankCbu: z.string().trim().refine((v) => !v || isValidCbu(v), 'CBU inválido'),
    bankAlias: z
      .string()
      .trim()
      .refine((v) => !v || /^[A-Za-z0-9.-]{6,20}$/.test(v), 'El alias tiene de 6 a 20 letras, números, puntos o guiones'),
    notes: optionalText(1000),
    contacts: z.array(supplierContactSchema),
    /** Rubros elegidos en el form. La action no los toma de aca: recibe altas y bajas explicitas. */
    categoryIds: z.array(z.string()),
  })
  .refine((v) => v.contacts.filter((c) => c.isPrimary).length <= 1, {
    message: 'Solo puede haber un contacto principal',
    path: ['contacts'],
  });

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
export type SupplierContactFormValues = z.infer<typeof supplierContactSchema>;

export function emptySupplierContact(isPrimary = false): SupplierContactFormValues {
  return { id: '', name: '', email: '', phone: '', role: '', isPrimary };
}

/** Altas y bajas explicitas de una relacion: la ausencia de un id NO significa borrarlo. */
export const idChangesSchema = z.object({
  add: z.array(z.string().uuid()),
  remove: z.array(z.string().uuid()),
});
export type IdChanges = z.infer<typeof idChangesSchema>;

export const supplierCategoryFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
});
export type SupplierCategoryFormValues = z.infer<typeof supplierCategoryFormSchema>;

/** Documento: el archivo viaja en el FormData; esto valida el resto. */
export const supplierDocumentSchema = z.object({
  name: z.string().trim().min(1, 'Indicá qué documento es').max(150, 'Máximo 150 caracteres'),
  expiresAt: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Fecha de vencimiento inválida'),
  replacesId: z.string().trim().refine((v) => !v || /^[0-9a-f-]{36}$/i.test(v), 'Documento inválido'),
});

/** 10 MB, PDF o imagen. */
export const SUPPLIER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const SUPPLIER_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
