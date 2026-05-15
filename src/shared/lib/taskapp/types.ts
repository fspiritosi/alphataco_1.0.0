export interface TicketStatus {
  id: number;
  slug: string;
  name: string;
  color?: string;
}

export interface TicketLabel {
  id: number;
  name: string;
  slug: string;
  color?: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status_id: number;
  status?: TicketStatus;
  priority: string;
  reporter_email: string | null;
  reporter_name: string | null;
  attachments: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  labels: TicketLabel[];
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  reporter_email: string;
  reporter_name?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}
