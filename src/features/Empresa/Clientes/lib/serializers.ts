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
  };
}

/** Sólo lo que las tablas/selects necesitan de un cliente embebido en otra entidad. */
export interface CustomerRef {
  id: string;
  name: string;
}
