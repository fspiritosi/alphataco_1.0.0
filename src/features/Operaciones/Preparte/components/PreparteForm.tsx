'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, CalendarIcon } from 'lucide-react';
import { Cliente } from '../components/PreparteManager';

interface PreparteFormProps {
  formData: PreparteItem;
  clientes: Cliente[];
  isEditing: boolean;
  onInputChange: (field: keyof PreparteItem, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

type PreparteItem = {
  id: string;
  clienteId: string;
  clienteName: string;
  requestDate: Date;
  executionDate: Date;
  observaciones: string;
};
export function PreparteForm({ formData, clientes, isEditing, onInputChange, onSubmit, onCancel }: PreparteFormProps) {
  const handleInputChange = (field: keyof PreparteItem, value: any) => {
    onInputChange(field, value);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Selector de Clientes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Cliente</label>
          <Select value={formData.clienteId} onValueChange={(value) => handleInputChange('clienteId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente">
                {formData.clienteId ? (
                  clientes.find((c) => c.id === formData.clienteId)?.name
                ) : (
                  <span className="flex items-center">
                    <Building className="mr-2 h-4 w-4" />
                    Seleccionar cliente
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fecha de Solicitud */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha de Solicitud</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.requestDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.requestDate ? (
                  format(formData.requestDate, 'PPP', { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.requestDate}
                onSelect={(date) => date && handleInputChange('requestDate', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Fecha de Ejecución Solicitada */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha de Ejecución Solicitada</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.executionDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.executionDate ? (
                  format(formData.executionDate, 'PPP', { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.executionDate}
                onSelect={(date) => date && handleInputChange('executionDate', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Campo de Observaciones */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Observaciones</label>
          <Textarea
            placeholder="Ingrese observaciones adicionales..."
            value={formData.observaciones}
            onChange={(e) => handleInputChange('observaciones', e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{isEditing ? 'Actualizar' : 'Guardar'}</Button>
      </div>
    </form>
  );
}
