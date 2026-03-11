'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getOrdersPendingValidation,
  getPendingApprovalTasks,
  getReturnedTasks,
  type PendingTasksData,
  type ReturnedTasksData,
  type ValidationOrdersData,
} from '../actions/actionsServer';

export const APPROVAL_INBOX_QUERY_KEY = ['maintenance', 'approval-inbox'] as const;

export function useValidationOrders(initialData?: ValidationOrdersData) {
  return useQuery({
    queryKey: [...APPROVAL_INBOX_QUERY_KEY, 'validation-orders'],
    queryFn: () => getOrdersPendingValidation(),
    initialData,
  });
}

export function usePendingTasks(initialData?: PendingTasksData) {
  return useQuery({
    queryKey: [...APPROVAL_INBOX_QUERY_KEY, 'pending'],
    queryFn: () => getPendingApprovalTasks(),
    initialData,
  });
}

export function useReturnedTasks(initialData?: ReturnedTasksData) {
  return useQuery({
    queryKey: [...APPROVAL_INBOX_QUERY_KEY, 'returned'],
    queryFn: () => getReturnedTasks(),
    initialData,
  });
}
