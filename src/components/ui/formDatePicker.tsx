'use client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';

function formatDate(date: moment.Moment | Date | undefined) {
  if (!date) return '';
  return moment(date).format('DD/MM/YYYY');
}

function isValidDate(date: moment.Moment | Date | undefined) {
  return date && moment(date).isValid();
}

export function FormDatePicker({ field, disabled = false }: { field: any; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(
    field.value ? moment(field.value, 'YYYY-MM-DD').toDate() : undefined
  );
  const [value, setValue] = useState(formatDate(field.value ? moment(field.value, 'YYYY-MM-DD') : undefined));

  return (
    <div className="relative flex w-[300px]">
      <FormControl>
        <Input
          value={value}
          onChange={(e) => {
            const inputDate = moment(e.target.value, 'DD/MM/YYYY', true);
            setValue(e.target.value);
            if (inputDate.isValid()) {
              field.onChange(inputDate.format('YYYY-MM-DD'));
              setMonth(inputDate.toDate());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
            }
          }}
          disabled={disabled}
          placeholder="DD/MM/AAAA"
          className="bg-background pr-10"
        />
      </FormControl>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-1"
          >
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
          <Calendar
            mode="single"
            selected={field.value ? moment(field.value, 'YYYY-MM-DD').toDate() : undefined}
            month={month}
            onMonthChange={(d) => setMonth(d)}
            onSelect={(date) => {
              if (date) {
                const m = moment(date);
                field.onChange(m.format('YYYY-MM-DD'));
                setValue(m.format('DD/MM/YYYY'));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
