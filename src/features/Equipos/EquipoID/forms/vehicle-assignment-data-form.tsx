'use client';

import { fetchAllContractorForVehicles } from '@/app/dashboard/employee/action/actions/actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import { use, useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

interface VehicleAssignmentDataFormProps {
  form: UseFormReturn<any>;
  readOnly?: boolean;
  costCentersPromise: ReturnType<typeof fetchAllCostCenters>;
  contractorsPromise: ReturnType<typeof fetchAllContractorForVehicles>;
}

export function VehicleAssignmentDataForm({
  form,
  readOnly = false,
  contractorsPromise,
  costCentersPromise,
}: VehicleAssignmentDataFormProps) {
  const costCenters = use(costCentersPromise);
  const contractors = use(contractorsPromise);

  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);

  // useEffect(() => {
  //     const loadCatalogs = async () => {
  //         try {
  //             const [costCentersData, contractorsData] = await Promise.all([fetchAllCostCenter(), fetchContractorCompanies()])

  //             setCostCenters(costCentersData)
  //             setContractors(contractorsData)
  //         } catch (error) {
  //             console.error("Error loading catalogs:", error)
  //         }
  //     }

  //     loadCatalogs()
  // }, [])

  useEffect(() => {
    const allocatedTo = form.getValues('allocated_to') || [];
    setSelectedContractors(allocatedTo);
  }, [form]);

  const handleContractorChange = (contractorId: string, checked: boolean) => {
    let newSelected: string[];

    if (checked) {
      newSelected = [...selectedContractors, contractorId];
    } else {
      newSelected = selectedContractors.filter((id) => id !== contractorId);
    }

    setSelectedContractors(newSelected);
    form.setValue('allocated_to', newSelected);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="cost_center_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Centro de costo</FormLabel>
              <Select disabled={readOnly} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro de costo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {costCenters.map((costCenter) => (
                    <SelectItem key={costCenter.id} value={costCenter.id}>
                      {costCenter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Selecciona el centro de costo</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Contractor Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Asignación a Contratistas</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="allocated_to"
            render={() => (
              <FormItem>
                <div className="space-y-4">
                  {readOnly ? (
                    <div>
                      {selectedContractors.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedContractors.map((contractorId) => {
                            const contractor = contractors.find((c) => c.id === contractorId);
                            return (
                              <Badge key={contractorId} variant="secondary">
                                {contractor?.name || contractorId}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No hay contratistas asignados</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {contractors.map((contractor) => (
                        <div key={contractor.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={contractor.id}
                            checked={selectedContractors.includes(contractor.id)}
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
                  )}
                </div>
                <FormDescription>Selecciona los contratistas a los que se asignará este equipo</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
