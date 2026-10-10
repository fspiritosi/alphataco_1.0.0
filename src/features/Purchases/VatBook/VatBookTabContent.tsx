import moment from 'moment';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getPurchasesVatBook, getPurchasesVatBookPeriods } from '../actions/vat-book.server';
import { NoPermission } from '../fallback/NoPermission';
import { VatBookView } from './components/VatBookView';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Libro IVA Compras del periodo elegido (`?period=YYYY-MM`, por defecto el mes actual). */
export default async function VatBookTabContent({
  searchParams,
  permissions,
}: {
  searchParams: DataTableSearchParams;
  permissions: Record<string, boolean>;
}) {
  if (permissions['compras:libro-iva:view'] !== true) return <NoPermission />;
  const raw = (searchParams as Record<string, string | string[] | undefined>).period;
  const requested = typeof raw === 'string' && PERIOD_RE.test(raw) ? raw : moment().format('YYYY-MM');
  const [book, periods] = await Promise.all([getPurchasesVatBook(requested), getPurchasesVatBookPeriods()]);
  if (!book) return <NoPermission />;
  return <VatBookView initialBook={book} periods={periods.includes(requested) ? periods : [requested, ...periods]} />;
}
