import { z } from 'zod';

/**
 * Salida de `get_documents_expiry_summary(p_days_ahead int, p_detail_limit int, p_company_id uuid)`
 * (`prisma/sql/documents.sql`), que devuelve un único `jsonb`.
 *
 * El tercer parámetro lo agregó la Task 4 de P1 pensando en este job: con `p_company_id` la
 * función filtra `employees.company_id`, `vehicles.company_id` y `documents_company.applies`,
 * así que el resumen es de UNA empresa. Con `NULL` volvería al comportamiento viejo (todas
 * juntas), que es exactamente lo que el job no debe hacer.
 */
const expiringEmployeeSchema = z.object({
  id: z.string(),
  employee_id: z.string(),
  document_type_id: z.string(),
  file_number: z.coerce.string(),
  employee_name: z.string(),
  document_type_name: z.string(),
  validity: z.string(),
  days_remaining: z.coerce.number(),
});

const expiringEquipmentSchema = z.object({
  id: z.string(),
  vehicle_id: z.string(),
  document_type_id: z.string(),
  domain: z.string(),
  intern_number: z.string(),
  document_type_name: z.string(),
  validity: z.string(),
  days_remaining: z.coerce.number(),
});

const expiringCompanySchema = z.object({
  id: z.string(),
  document_type_id: z.string(),
  document_type_name: z.string(),
  validity: z.string(),
  validity_raw: z.string().nullable(),
  days_remaining: z.coerce.number(),
});

const countsSchema = z.object({
  employees: z.coerce.number(),
  equipment: z.coerce.number(),
  company: z.coerce.number(),
});

export const expirySummarySchema = z.object({
  generated_at: z.string(),
  today: z.string(),
  window_end: z.string(),
  days_ahead: z.coerce.number(),
  detail_limit: z.coerce.number(),
  expiring_soon: z.object({
    employees: z.object({ total: z.coerce.number(), detail: z.array(expiringEmployeeSchema) }),
    equipment: z.object({ total: z.coerce.number(), detail: z.array(expiringEquipmentSchema) }),
    company: z.object({ total: z.coerce.number(), detail: z.array(expiringCompanySchema) }),
  }),
  expired_counts: countsSchema,
  expired_doc_type_ids: z.object({
    employees: z.array(z.string()),
    equipment: z.array(z.string()),
    company: z.array(z.string()),
  }),
  pending_counts: countsSchema,
});

export type ExpiringEmployeeItem = z.infer<typeof expiringEmployeeSchema>;
export type ExpiringEquipmentItem = z.infer<typeof expiringEquipmentSchema>;
export type ExpiringCompanyItem = z.infer<typeof expiringCompanySchema>;
export type ExpirySummary = z.infer<typeof expirySummarySchema>;
