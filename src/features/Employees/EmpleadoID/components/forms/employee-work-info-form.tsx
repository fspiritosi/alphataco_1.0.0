'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Edit, Save, X } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  fetchAllCostCenters,
  fetchCategories,
  fetchCompanyPositions,
  fetchContractorCompanies,
  fetchCovenants,
  fetchGuilds,
  fetchHierarchicalPositions,
} from '../../lib/actions/catalog-actions';
import { updateEmployeeWorkInfo } from '../../lib/actions/employee-actions';
import { useEmployeeForm } from '../../lib/hooks/use-employee-form';
import { EmployeeFormSkeleton } from '../skeletons/employee-form-skeleton';

const workInfoSchema = z.object({
  company_position: z.string().optional(),
  hierarchical_position: z.string().optional(),
  cost_center_id: z.string().optional(),
  date_of_admission: z.date().optional(),
  normal_hours: z.number().optional(),
  type_of_contract: z.string().optional(),
  file: z.string().optional(),
  allocated_to: z.array(z.string()).optional(),
  guild_id: z.string().optional(),
  covenants_id: z.string().optional(),
  category_id: z.string().optional(),
  affiliate_status: z.string().optional(),
  is_active: z.boolean().default(true),
  reason_for_termination: z.string().optional(),
  termination_date: z.date().optional(),
});

type WorkInfoFormData = z.infer<typeof workInfoSchema>;

interface EmployeeWorkInfoFormProps {
  employeeId: string;
  isEditable?: boolean;
}

function EmployeeWorkInfoFormContent({ employeeId, isEditable = true }: EmployeeWorkInfoFormProps) {
  const [companyPositions, setCompanyPositions] = useState<any[]>([]);
  const [hierarchicalPositions, setHierarchicalPositions] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [contractorCompanies, setContractorCompanies] = useState<any[]>([]);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [covenants, setCovenants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<WorkInfoFormData>({
    resolver: zodResolver(workInfoSchema),
    defaultValues: {
      company_position: '',
      hierarchical_position: '',
      cost_center_id: '',
      date_of_admission: undefined,
      normal_hours: undefined,
      type_of_contract: '',
      file: '',
      allocated_to: [],
      guild_id: '',
      covenants_id: '',
      category_id: '',
      affiliate_status: '',
      is_active: true,
      reason_for_termination: '',
      termination_date: undefined,
    },
  });

  const { isPending, isEditing, handleSubmit, handleEdit, handleCancel } = useEmployeeForm({
    initialData: form.getValues(),
    onSubmit: async (data) => {
      return await updateEmployeeWorkInfo(employeeId, {
        ...data,
        date_of_admission: data.date_of_admission?.toISOString().split('T')[0],
        termination_date: data.termination_date?.toISOString().split('T')[0],
      } as any);
    },
  });

  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        const [
          companyPositionsData,
          hierarchicalPositionsData,
          costCentersData,
          contractorCompaniesData,
          guildsData,
          covenantsData,
          categoriesData,
        ] = await Promise.all([
          fetchCompanyPositions(),
          fetchHierarchicalPositions(),
          fetchAllCostCenters(),
          fetchContractorCompanies(),
          fetchGuilds(),
          fetchCovenants(),
          fetchCategories(),
        ]);

        setCompanyPositions(companyPositionsData);
        setHierarchicalPositions(hierarchicalPositionsData);
        setCostCenters(costCentersData);
        setContractorCompanies(contractorCompaniesData);
        setGuilds(guildsData);
        setCovenants(covenantsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading catalog data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCatalogData();
  }, []);

  if (loading) {
    return <EmployeeFormSkeleton />;
  }

  const onSubmit = (data: WorkInfoFormData) => {
    handleSubmit(data);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Información Laboral</CardTitle>
        {isEditable && !isEditing && (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información de Posición */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posición en la Empresa</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar posición" />
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

              <FormField
                control={form.control}
                name="hierarchical_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posición Jerárquica</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar posición jerárquica" />
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

              <FormField
                control={form.control}
                name="cost_center_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Costo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar centro de costo" />
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

              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legajo</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Información de Contrato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_admission"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Ingreso</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            disabled={!isEditing}
                          >
                            {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type_of_contract"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contrato</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo de contrato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Indefinido">Indefinido</SelectItem>
                        <SelectItem value="Temporal">Temporal</SelectItem>
                        <SelectItem value="Por obra">Por obra</SelectItem>
                        <SelectItem value="Pasantía">Pasantía</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="normal_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas Normales</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        disabled={!isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affiliate_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de Afiliación</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Afiliado">Afiliado</SelectItem>
                        <SelectItem value="No afiliado">No afiliado</SelectItem>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Información Sindical */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información Sindical</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="guild_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gremio</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar gremio" />
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

                <FormField
                  control={form.control}
                  name="covenants_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Convenio</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar convenio" />
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

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
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
              </div>
            </div>

            {/* Asignación a Contratistas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Asignación a Contratistas</h3>
              <FormField
                control={form.control}
                name="allocated_to"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {contractorCompanies.map((company) => (
                        <FormField
                          key={company.id}
                          control={form.control}
                          name="allocated_to"
                          render={({ field }) => {
                            return (
                              <FormItem key={company.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(company.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      return checked
                                        ? field.onChange([...currentValue, company.id])
                                        : field.onChange(currentValue.filter((value) => value !== company.id));
                                    }}
                                    disabled={!isEditing}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">{company.name}</FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estado del Empleado */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Estado del Empleado</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!isEditing} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Empleado Activo</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {!form.watch('is_active') && (
                  <>
                    <FormField
                      control={form.control}
                      name="reason_for_termination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo de Terminación</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="termination_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Terminación</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                  disabled={!isEditing}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP', { locale: es })
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function EmployeeWorkInfoForm(props: EmployeeWorkInfoFormProps) {
  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <EmployeeWorkInfoFormContent {...props} />
    </Suspense>
  );
}
