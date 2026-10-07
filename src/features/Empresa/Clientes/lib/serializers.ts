/**
 * `customers.cuit` / `customers.client_phone` / `contacts.contact_phone` son `bigint` en
 * Postgres. Hacia el cliente viajan como string: los filtros de las tablas comparan contra
 * opciones de texto y `JSON.stringify` (cookies de preferencias) no serializa `bigint`.
 */
export interface CustomerRow {
  id: string;
  name: string;
  cuit: string;
  client_email: string | null;
  client_phone: string | null;
  address: string | null;
  is_active: boolean | null;
  company_id: string;
  reason_for_termination: string | null;
  termination_date: Date | null;
  created_at: Date;
  /** Datos fiscales (facturación ARCA). `fiscal_province_id` viaja como string (id del select). */
  vat_condition_id: number | null;
  fiscal_street: string | null;
  fiscal_city: string | null;
  fiscal_province_id: string | null;
  fiscal_postal_code: string | null;
}

interface CustomerDbRow {
  id: string;
  name: string;
  cuit: bigint;
  client_email: string | null;
  client_phone: bigint | null;
  address: string | null;
  is_active: boolean | null;
  company_id: string;
  reason_for_termination: string | null;
  termination_date: Date | null;
  created_at: Date;
  vat_condition_id: number | null;
  fiscal_street: string | null;
  fiscal_city: string | null;
  fiscal_province_id: bigint | null;
  fiscal_postal_code: string | null;
}

export function serializeCustomer(row: CustomerDbRow): CustomerRow {
  return {
    id: row.id,
    name: row.name,
    cuit: row.cuit.toString(),
    client_email: row.client_email,
    client_phone: row.client_phone === null ? null : row.client_phone.toString(),
    address: row.address,
    is_active: row.is_active,
    company_id: row.company_id,
    reason_for_termination: row.reason_for_termination,
    termination_date: row.termination_date,
    created_at: row.created_at,
    vat_condition_id: row.vat_condition_id,
    fiscal_street: row.fiscal_street,
    fiscal_city: row.fiscal_city,
    fiscal_province_id: row.fiscal_province_id === null ? null : row.fiscal_province_id.toString(),
    fiscal_postal_code: row.fiscal_postal_code,
  };
}

/** Sólo lo que las tablas/selects necesitan de un cliente embebido en otra entidad. */
export interface CustomerRef {
  id: string;
  name: string;
}
