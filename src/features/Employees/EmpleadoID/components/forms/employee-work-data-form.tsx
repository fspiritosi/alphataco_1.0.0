'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { use } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { EmployeeFormData, Options } from './employee-form';

interface EmployeeWorkDataFormProps {
  form: UseFormReturn<EmployeeFormData>;
  readOnly: boolean;
  options: Options['workData']; // siempre viene
}

export function EmployeeWorkDataForm({ form, readOnly, options }: EmployeeWorkDataFormProps) {
  const costCenters = use(options.costCentersPromise);
  const hierarchicalPositions = use(options.hierarchicalPositionsPromise);
  const companyPositions = use(options.companyPositionsPromise);
  const workflowDiagrams = use(options.workflowDiagramsPromise);
  const guilds = use(options.guildsPromise);
  const covenants = use(options.covenantsPromise);
  const categories = use(options.categoriesPromise);
  const contractorCompanies = use(options.contractorCompaniesPromise);
  const typeOfContracts = use(options.typeOfContractsPromise);
  const aptitudes = use(options.aptitudesPromise);

  const allocatedTo = form.watch('allocated_to') || [];
  const selectedAptitudes = form.watch('aptitudes') || [];

  const handleContractorChange = (contractorId: string, checked: boolean) => {
    const currentAllocated = form.getValues('allocated_to') || [];
    if (checked) {
      form.setValue('allocated_to', [...currentAllocated, contractorId]);
    } else {
      form.setValue(
        'allocated_to',
        currentAllocated.filter((id: string) => id !== contractorId)
      );
    }
  };

  const handleAptitudeChange = (aptitudeId: string, checked: boolean) => {
    const currentAptitudes = form.getValues('aptitudes') || [];
    if (checked) {
      form.setValue('aptitudes', [...currentAptitudes, aptitudeId]);
    } else {
      form.setValue(
        'aptitudes',
        currentAptitudes.filter((id: string) => id !== aptitudeId)
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Legajo */}
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Legajo *</FormLabel>
              <FormControl>
                <Input {...field} readOnly={readOnly} placeholder="Ingrese el legajo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sector */}
        <FormField
          control={form.control}
          name="hierarchical_position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sector *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el sector" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {hierarchicalPositions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Puesto en la empresa */}
        <FormField
          control={form.control}
          name="company_position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Puesto en la empresa *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el puesto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {companyPositions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Diagrama de trabajo */}
        <FormField
          control={form.control}
          name="workflow_diagram"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diagrama de trabajo *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el diagrama" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {workflowDiagrams.map((diagram) => (
                    <SelectItem key={diagram.id} value={diagram.id}>
                      {diagram.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Horas normales */}
        <FormField
          control={form.control}
          name="normal_hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horas normales</FormLabel>
              <FormControl>
                <Input {...field} readOnly={readOnly} placeholder="Ingrese las horas normales" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo de contrato */}
        <FormField
          control={form.control}
          name="type_of_contract"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de contrato</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione tipo de contrato" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {typeOfContracts.map((contract) => (
                    <SelectItem key={contract.name} value={contract.name}>
                      {contract.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fecha de ingreso */}
        <FormField
          control={form.control}
          name="date_of_admission"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de ingreso</FormLabel>
              <FormControl>
                <Input {...field} type="date" readOnly={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gremio */}
        <FormField
          control={form.control}
          name="guild_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gremio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el gremio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {guilds.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id}>
                      {guild.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Convenio */}
        <FormField
          control={form.control}
          name="covenants_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Convenio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el convenio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {covenants.map((covenant) => (
                    <SelectItem key={covenant.id} value={covenant.id}>
                      {covenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Categoría */}
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione la categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Centro de costo */}
        <FormField
          control={form.control}
          name="cost_center_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Centro de costo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el centro de costo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {costCenters.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asignado a contratistas */}
        <Card>
          <CardHeader>
            <CardTitle>Asignado a contratistas</CardTitle>
          </CardHeader>
          <CardContent>
            {!readOnly && contractorCompanies.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {contractorCompanies.map((contractor) => (
                  <div key={contractor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={contractor.id}
                      checked={allocatedTo.includes(contractor.id)}
                      onCheckedChange={(checked) => handleContractorChange(contractor.id, checked as boolean)}
                    />
                    <label
                      htmlFor={contractor.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {contractor.name}
                    </label>
                  </div>
                ))}
              </div>
            ) : readOnly && allocatedTo.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allocatedTo.map((contractorId: string) => {
                  const contractor = contractorCompanies.find((c) => c.id === contractorId);
                  return contractor ? (
                    <span
                      key={contractorId}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {contractor.name}
                    </span>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay contratistas asignados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aptitudes Técnicas</CardTitle>
          </CardHeader>
          <CardContent>
            {!readOnly && aptitudes.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {aptitudes
                  .filter((aptitude) => aptitude.is_active)
                  .map((aptitude) => (
                    <div key={aptitude.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={aptitude.id}
                        checked={selectedAptitudes.includes(aptitude.id)}
                        onCheckedChange={(checked) => handleAptitudeChange(aptitude.id, checked as boolean)}
                      />
                      <label
                        htmlFor={aptitude.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {aptitude.nombre}
                      </label>
                    </div>
                  ))}
              </div>
            ) : readOnly && selectedAptitudes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedAptitudes.map((aptitudeId: string) => {
                  const aptitude = aptitudes.find((a) => a.id === aptitudeId);
                  return aptitude ? (
                    <span
                      key={aptitudeId}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {aptitude.nombre}
                    </span>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay aptitudes asignadas</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
