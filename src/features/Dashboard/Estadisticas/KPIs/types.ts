export interface KPI {
  id: string;
  company_id: string;
  name: string;
  code: string;
  number: string | null;
  validity_date: string;
  calculation_formula: string;
  technical_support: boolean;
  improvement_opportunities: string | null;
  filters: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KPIRevision {
  id: string;
  kpi_id: string;
  previous_number: string | null;
  new_number: string | null;
  previous_validity_date: string | null;
  new_validity_date: string | null;
  change_reason: string | null;
  changed_by: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateKPIInput {
  name: string;
  number?: string;
  validity_date: string;
  calculation_formula: string;
  technical_support?: boolean;
  filters?: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateKPIInput {
  id: string;
  name?: string;
  number?: string;
  validity_date?: string;
  calculation_formula?: string;
  technical_support?: boolean;
  improvement_opportunities?: string;
  filters?: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateKPINumberInput {
  kpi_id: string;
  new_number: string;
  new_validity_date: string;
  change_reason: string;
}
