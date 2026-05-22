import 'server-only';
import { Logger } from '@/lib/logger';
import { TaskAppError } from './errors';
import type { Comment, CreateCommentRequest, CreateTicketRequest, Ticket, UploadResult } from './types';

const logger = new Logger('shared/lib/taskapp');

function baseURL(): string {
  const url = process.env.TASKAPP_BASE_URL;
  if (!url) throw new TaskAppError(500, 'config', 'TASKAPP_BASE_URL not set');
  return url.replace(/\/$/, '');
}

function apiKey(): string {
  const key = process.env.TASKAPP_PROJECT_API_KEY;
  if (!key) throw new TaskAppError(500, 'config', 'TASKAPP_PROJECT_API_KEY not set');
  return key;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${baseURL()}/api/public/v1${path}`;
  const key = apiKey();

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Key': key,
        ...init.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof TaskAppError) throw error;
    logger.error('taskApp network error', { data: { url, error } });
    throw new TaskAppError(0, 'network', error instanceof Error ? error.message : 'network error');
  }

  if (!res.ok) {
    const body = await res.text();
    logger.error('taskApp request failed', { data: { url, status: res.status, body } });
    throw new TaskAppError(res.status, 'http', body || res.statusText);
  }

  try {
    return (await res.json()) as T;
  } catch (error) {
    logger.error('taskApp invalid JSON', { data: { url, error } });
    throw new TaskAppError(res.status, 'parse', 'invalid JSON');
  }
}

async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const url = `${baseURL()}${path}`;
  const key = apiKey();

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'X-Project-Key': key },
      body: formData,
      cache: 'no-store',
    });
  } catch (error) {
    logger.error('taskApp upload network error', { data: { url, error } });
    throw new TaskAppError(0, 'network', error instanceof Error ? error.message : 'network error');
  }

  if (!res.ok) {
    const body = await res.text();
    logger.error('taskApp upload failed', { data: { url, status: res.status, body } });
    throw new TaskAppError(res.status, 'http', body || res.statusText);
  }

  try {
    return (await res.json()) as T;
  } catch (error) {
    logger.error('taskApp upload invalid JSON', { data: { url, error } });
    throw new TaskAppError(res.status, 'parse', 'invalid JSON');
  }
}

export const taskAppClient = {
  createTicket: (body: CreateTicketRequest) =>
    request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(body) }),

  listTicketsByReporter: (reporterEmail: string) =>
    request<Ticket[]>(`/tickets?reporter_email=${encodeURIComponent(reporterEmail)}`),

  getTicketById: (id: number) =>
    request<Ticket>(`/tickets/${id}`),

  listComments: (ticketId: number) =>
    request<Comment[]>(`/tickets/${ticketId}/comments`),

  createComment: (ticketId: number, body: CreateCommentRequest) =>
    request<Comment>(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  approveTicket: (ticketId: number, approverEmail: string) =>
    request<Ticket>(`/tickets/${ticketId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approver_email: approverEmail }),
    }),

  rejectTicket: (ticketId: number, approverEmail: string) =>
    request<Ticket>(`/tickets/${ticketId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ approver_email: approverEmail }),
    }),

  attachToTicket: (ticketId: number, reporterEmail: string, keys: string[]) =>
    request<Ticket>(`/tickets/${ticketId}/attachments`, {
      method: 'POST',
      body: JSON.stringify({ reporter_email: reporterEmail, keys }),
    }),

  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestMultipart<UploadResult>('/api/public/v1/upload', formData);
  },
};
