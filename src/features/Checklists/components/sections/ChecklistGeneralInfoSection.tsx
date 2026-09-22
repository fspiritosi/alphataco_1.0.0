'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Customer, Employee, Equipment } from '@/features/Checklists/lib/checklist-form-schema';
import { cn } from '@/lib/utils';
import { AlertCircle, Check, ChevronsUpDown, Link as LinkIcon, X } from 'lucide-react';
import type { Control, FieldValues, UseFormReturn } from 'react-hook-form';

type ChecklistGeneralInfoSectionProps = {
  form: UseFormReturn<FieldValues>;
  typedControl: Control<FieldValues>;
  readOnly: boolean;
  shouldDisabledInputs: boolean;
  equipments: Equipment[];
  customers: Customer[];
  employees: Employee[];
  /** Equipo elegido, para mostrar marca/modelo/serie sin pedirlos a mano. */
  selectedEquipmentSummary: Equipment | undefined;
  selectedHitchEquipment: string | null;
  setSelectedHitchEquipment: (value: string | null) => void;
  shouldShowHitchButton: boolean;
  handleOpenHitchSelector: () => void;
  /** Secciones del acoplado que quedan ocultas hasta declarar la unidad enganchada. */
  hiddenHitchSectionNames: string[];
  /** Equipos compatibles para enganche, ya cargados por el selector. */
  compatibleHitchEquipment: Equipment[];
  selectedEquipmentId: string | undefined;
  minKilometer: number | null;
  kilometerError: string | null;
  setKilometerError: (value: string | null) => void;
  minEngineHours: number | null;
  engineHoursError: string | null;
  setEngineHoursError: (value: string | null) => void;
};

/**
 * Bloque "Información General" del checklist normalizado: equipo, enganche, cliente,
 * chofer, fecha/hora, kilometraje, horómetro y observaciones generales.
 */
export function ChecklistGeneralInfoSection({
  form,
  typedControl,
  readOnly,
  shouldDisabledInputs,
  equipments,
  customers,
  employees,
  selectedEquipmentSummary,
  selectedHitchEquipment,
  setSelectedHitchEquipment,
  shouldShowHitchButton,
  handleOpenHitchSelector,
  hiddenHitchSectionNames,
  compatibleHitchEquipment,
  selectedEquipmentId,
  minKilometer,
  kilometerError,
  setKilometerError,
  minEngineHours,
  engineHoursError,
  setEngineHoursError,
}: ChecklistGeneralInfoSectionProps) {
  return (
    <>
        {/* Campos básicos */}
        <Card>
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem className="pr-5" value="item-1">
              <AccordionTrigger className="text-start">
                <CardHeader className="flex-1 min-w-0">
                  <CardTitle>Información General</CardTitle>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4">
                <CardContent className="space-y-4">
                  <div className="space-y-4 w-full">
                    <FormField
                      control={typedControl}
                      name="equipment_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipo</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value} disabled={shouldDisabledInputs}>
                              <SelectTrigger className="w-full pointer-coarse:min-h-11">
                                <SelectValue placeholder="Seleccionar equipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {equipments.map((equipment) => (
                                  <SelectItem key={equipment.value} value={equipment.value}>
                                    <div className="flex flex-col items-start">
                                      <span>
                                        {equipment.label}
                                        <span className="ml-2 inline-flex gap-1">
                                          {/* {equipment.type_name && equipment.type_name !== 'N/A' && (
                                            <span className="rounded bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5">
                                              {equipment.type_name}
                                            </span>
                                          )} */}
                                          {equipment.sub_type_name && equipment.sub_type_name !== 'N/A' && (
                                            <span className="rounded bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5">
                                              {equipment.sub_type_name}
                                            </span>
                                          )}
                                        </span>
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Datos del equipo, de solo lectura: el papel los pide a mano
                        y el sistema ya los conoce */}
                    {selectedEquipmentSummary && (
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
                        {[
                          { label: 'Marca', value: selectedEquipmentSummary.brand },
                          { label: 'Modelo', value: selectedEquipmentSummary.model },
                          { label: 'N° de serie', value: selectedEquipmentSummary.serie },
                          { label: 'Interno', value: selectedEquipmentSummary.intern_number },
                        ]
                          .filter((f) => f.value && f.value !== 'N/A')
                          .map((f) => (
                            <div key={f.label}>
                              <dt className="text-xs text-muted-foreground">{f.label}</dt>
                              <dd className="text-sm font-medium">{f.value}</dd>
                            </div>
                          ))}
                      </dl>
                    )}

                    {/* Botón para agregar enganche (COD-290 - Condición 3) */}
                    {shouldShowHitchButton && (
                      <div className="space-y-2">
                        <FormLabel>Enganche</FormLabel>
                        <div className="flex items-center gap-2">
                          {readOnly ? (
                            // En modo readOnly, mostrar el texto del enganche con badge de subtipo
                            (() => {
                              const hitchEquipmentData =
                                equipments.find((eq) => eq.value === selectedHitchEquipment) ||
                                compatibleHitchEquipment.find((eq) => eq.value === selectedHitchEquipment);
                              return (
                                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                                  <LinkIcon className="h-4 w-4" />
                                  <span>
                                    {selectedHitchEquipment
                                      ? hitchEquipmentData?.label || 'Enganche seleccionado'
                                      : 'Sin enganche'}
                                  </span>
                                  {hitchEquipmentData?.sub_type_name && hitchEquipmentData.sub_type_name !== 'N/A' && (
                                    <span className="rounded bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5">
                                      {hitchEquipmentData.sub_type_name}
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant={selectedHitchEquipment ? 'outline' : 'default'}
                                onClick={handleOpenHitchSelector}
                                disabled={!selectedEquipmentId}
                                className="flex items-center gap-2"
                              >
                                <LinkIcon className="h-4 w-4" />
                                {selectedHitchEquipment
                                  ? compatibleHitchEquipment.find((eq) => eq.value === selectedHitchEquipment)?.label ||
                                    'Cambiar enganche'
                                  : 'Agregar enganche'}
                              </Button>
                              {selectedHitchEquipment && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedHitchEquipment(null);
                                  }}
                                  disabled={shouldDisabledInputs}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                        {selectedHitchEquipment && !readOnly && (
                          <p className="text-sm text-muted-foreground">
                            Enganche seleccionado:{' '}
                            {compatibleHitchEquipment.find((eq) => eq.value === selectedHitchEquipment)?.label}
                          </p>
                        )}
                        {/* Ticket 677: la sección del enganche no se muestra hasta declarar
                            la unidad, así que se explica por qué falta. */}
                        {!selectedHitchEquipment && !readOnly && hiddenHitchSectionNames.length > 0 && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {hiddenHitchSectionNames.length === 1
                                ? `La sección "${hiddenHitchSectionNames[0]}" describe la unidad enganchada.`
                                : `Las secciones ${hiddenHitchSectionNames.map((name) => `"${name}"`).join(', ')} describen la unidad enganchada.`}{' '}
                              Agregá el enganche para completarla: sus desvíos se imputan a la patente del acoplado, no
                              a la de esta unidad.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {/* Campo de cliente */}
                    {customers.length > 0 && (
                      <FormField
                        control={typedControl}
                        name="customer_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                                <SelectTrigger className="w-full pointer-coarse:min-h-11">
                                  <SelectValue placeholder="Seleccionar cliente (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      {customer.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="chofer"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Chofer</FormLabel>
                          {employees.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild disabled={readOnly}>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                    disabled={readOnly}
                                  >
                                    {field.value || 'Buscar chofer...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-100 p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar por nombre o documento..." />
                                  <CommandList>
                                    <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                                    <CommandGroup>
                                      {employees.map((employee) => (
                                        <CommandItem
                                          key={employee.id}
                                          value={`${employee.fullName} ${employee.document || ''}`}
                                          onSelect={() => {
                                            field.onChange(employee.fullName);
                                            // Guardar el ID del empleado como columna FK directa
                                            form.setValue('chofer_employee_id', employee.id);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              field.value === employee.fullName ? 'opacity-100' : 'opacity-0'
                                            )}
                                          />
                                          <div className="flex flex-col">
                                            <span>
                                              {employee.file_number ? `[${employee.file_number}] ` : ''}
                                              {employee.fullName}
                                            </span>
                                            {employee.document && (
                                              <span className="text-xs text-muted-foreground">{employee.document}</span>
                                            )}
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <FormControl>
                              <Input {...field} placeholder="Nombre del chofer" disabled={shouldDisabledInputs} />
                            </FormControl>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="kilometraje"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Kilometraje
                            {minKilometer !== null && !readOnly && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (mín: {minKilometer.toLocaleString('es-AR')} km)
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Kilometraje actual"
                              disabled={readOnly}
                              type="number"
                              min={minKilometer ?? undefined}
                              className={kilometerError ? 'border-destructive' : ''}
                              onChange={(e) => {
                                field.onChange(e);
                                // Validar que el kilometraje no sea menor al mínimo
                                const value = e.target.value;
                                if (value && minKilometer !== null) {
                                  const enteredKm = parseInt(value, 10);
                                  if (!isNaN(enteredKm) && enteredKm < minKilometer) {
                                    setKilometerError(
                                      `El kilometraje no puede ser menor a ${minKilometer.toLocaleString('es-AR')} km (actual del equipo)`
                                    );
                                  } else {
                                    setKilometerError(null);
                                  }
                                } else {
                                  setKilometerError(null);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                          {kilometerError && <p className="text-sm font-medium text-destructive">{kilometerError}</p>}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="horometro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Horómetro
                            {minEngineHours !== null && !readOnly && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (mín: {minEngineHours.toLocaleString('es-AR')} hs)
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Horómetro"
                              disabled={readOnly}
                              type="number"
                              min={minEngineHours ?? undefined}
                              className={engineHoursError ? 'border-destructive' : ''}
                              onChange={(e) => {
                                field.onChange(e);
                                // Validar que el horómetro no sea menor al mínimo
                                const value = e.target.value;
                                if (value && minEngineHours !== null) {
                                  const enteredHours = parseInt(value, 10);
                                  if (!isNaN(enteredHours) && enteredHours < minEngineHours) {
                                    setEngineHoursError(
                                      `El horómetro no puede ser menor a ${minEngineHours.toLocaleString('es-AR')} hs (actual del equipo)`
                                    );
                                  } else {
                                    setEngineHoursError(null);
                                  }
                                } else {
                                  setEngineHoursError(null);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                          {engineHoursError && (
                            <p className="text-sm font-medium text-destructive">{engineHoursError}</p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="fecha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={readOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="hora"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} disabled={readOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={typedControl}
                    name="observaciones"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observaciones</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Observaciones generales..." rows={3} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
    </>
  );
}
