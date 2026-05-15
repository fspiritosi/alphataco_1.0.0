import type { Ticket } from '@/shared/lib/taskapp/types';
import type { CategorySlug } from '../constants/categories';

export type { CategorySlug, CategoryDef } from '../constants/categories';
export type { StatusDef } from '../constants/ticket-status';

export interface ReporterIdentity {
  email: string;
  name: string | null;
}

export interface CreateSupportTicketInput {
  category: CategorySlug;
  title: string;
  description: string;
}

export type MyTicketsData = Ticket[];
