'use client';

import { CalendarIcon, X } from 'lucide-react';
import moment from 'moment';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { useDataTablePending } from './DataTablePendingContext';

interface DataTableDateRangeFilterProps {
  columnId: string;
  title: string;
}

export function DataTableDateRangeFilter({ columnId, title }: DataTableDateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { startTransition } = useDataTablePending();

  const fromKey = `${columnId}_from`;
  const toKey = `${columnId}_to`;

  const fromValue = searchParams.get(fromKey);
  const toValue = searchParams.get(toKey);

  const fromDate = fromValue ? new Date(fromValue) : undefined;
  const toDate = toValue ? new Date(toValue) : undefined;

  const hasValue = !!(fromValue || toValue);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(fromKey);
    params.delete(toKey);
    params.set('page', '1');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-8 border-dashed gap-1.5', hasValue && 'border-solid')}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {title}
          {hasValue && (
            <>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {fromValue && toValue
                  ? `${moment(fromValue).format('DD/MM')} - ${moment(toValue).format('DD/MM')}`
                  : fromValue
                    ? `Desde ${moment(fromValue).format('DD/MM')}`
                    : `Hasta ${moment(toValue).format('DD/MM')}`}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Desde</p>
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(date) => updateParam(fromKey, date ? moment(date).format('YYYY-MM-DD') : null)}
              initialFocus
            />
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Hasta</p>
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(date) => updateParam(toKey, date ? moment(date).format('YYYY-MM-DD') : null)}
            />
          </div>
          {hasValue && (
            <Button variant="ghost" size="sm" className="w-full h-7" onClick={clearFilter}>
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar fechas
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
