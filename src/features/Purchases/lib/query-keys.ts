/**
 * Claves de React Query de las tablas de Compras. Las tablas corren en client-side mode: despues
 * de mutar hay que invalidarlas (un `router.refresh()` solo no las actualiza).
 */
export const PURCHASES_QUERY_KEYS = {
  requests: ['purchase-requests'],
  suppliers: ['suppliers'],
  quotes: ['purchase-quotes'],
  orders: ['purchase-orders'],
  receipts: ['purchase-receipts'],
  invoices: ['supplier-invoices'],
  payments: ['payment-orders'],
  dueInvoices: ['due-invoices'],
  vatBook: ['purchases-vat-book'],
  expenseCategories: ['purchase-expense-categories'],
} as const;
