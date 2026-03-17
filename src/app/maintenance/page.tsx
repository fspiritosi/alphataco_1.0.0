'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
  completeMaintenanceEmployeeAnonymousSession,
  getCompanyIdForEquipment,
  searchEquipmentByDomain,
} from '@/features/Mantenimiento/actions/maintenance-actions';
import { handleSupabaseError } from '@/lib/errorHandler';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { cn, validarCUIL } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import cookies from 'js-cookie';
import { ArrowLeft, Check, ChevronsUpDown, Clipboard } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

function GHLoginContent() {
  const [step, setStep] = useState<'equipment-selection' | 'selection' | 'login'>('equipment-selection');
  const [loginType, setLoginType] = useState<'empleado' | 'invitado' | ''>('');
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();
  const equipment_id = searchParams.get('equipment');
  const router = useRouter();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(equipment_id);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [equipmentOptions, setEquipmentOptions] = useState<
    Array<{ id: string; label: string; domain: string | null; serie: string | null }>
  >([]);
  const [equipmentSearchOpen, setEquipmentSearchOpen] = useState(false);
  const [isSearchingEquipment, setIsSearchingEquipment] = useState(false);

  // Si hay equipment_id en query params, saltar la selección de equipo
  useEffect(() => {
    if (equipment_id) {
      setSelectedEquipmentId(equipment_id);
      setStep('selection');
    }
  }, [equipment_id]);

  // Buscar equipos cuando cambia el término de búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (equipmentSearchTerm.trim().length >= 2) {
        setIsSearchingEquipment(true);
        const result = await searchEquipmentByDomain(equipmentSearchTerm);
        if (result.ok) {
          setEquipmentOptions(result.equipment);
        } else {
          setEquipmentOptions([]);
        }
        setIsSearchingEquipment(false);
      } else {
        setEquipmentOptions([]);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [equipmentSearchTerm]);

  const equipmentFormSchema = z.object({
    equipment_id: z.string({ required_error: 'Debe seleccionar un equipo' }).min(1, 'Debe seleccionar un equipo'),
  });

  const equipmentForm = useForm<z.infer<typeof equipmentFormSchema>>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      equipment_id: selectedEquipmentId || '',
    },
  });

  // Sincronizar selectedEquipmentId con el formulario cuando cambia
  useEffect(() => {
    if (selectedEquipmentId) {
      equipmentForm.setValue('equipment_id', selectedEquipmentId);
    }
  }, [selectedEquipmentId, equipmentForm]);

  const formSchema = z.object({
    email:
      loginType === 'invitado'
        ? z
            .string({
              required_error: 'El correo electrónico es requerido.',
            })
            .email({
              message: 'El correo electrónico es inválido.',
            })
        : z.string().optional(),
    password:
      loginType === 'invitado'
        ? z
            .string({
              required_error: 'La contraseña es requerida.',
            })
            .min(6, {
              message: 'La contraseña debe tener al menos 6 caracteres.',
            })
        : z.string().optional(),
    cuil:
      loginType === 'empleado'
        ? z
            .string({
              required_error: 'El CUIL es requerido.',
            })
            .refine(
              (cuil) => {
                return validarCUIL(cuil);
              },
              { message: 'El CUIL es inválido' }
            )
        : z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      cuil: '',
    },
  });

  useEffect(() => {
    const clearDashboardSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !user.is_anonymous) {
        await supabase.auth.signOut();
      }
    };
    clearDashboardSession();
  }, []);

  async function onEquipmentSubmit({ equipment_id: selectedId }: z.infer<typeof equipmentFormSchema>) {
    setSelectedEquipmentId(selectedId);
    setStep('selection');
  }

  async function onSubmit({ cuil, email, password }: z.infer<typeof formSchema>) {
    const finalEquipmentId = selectedEquipmentId || equipment_id;
    toast.promise(
      async () => {
        if (!finalEquipmentId) {
          throw new Error('No se ha seleccionado un equipo. Por favor, seleccione un equipo primero.');
        }
        if (loginType === 'invitado' && email && password) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            throw new Error(handleSupabaseError(error.message));
          }
          const companyRes = await getCompanyIdForEquipment(finalEquipmentId);
          if (companyRes.ok) {
            // Mantener cookie compatible con el resto del sistema (server actions usan actualComp)
            cookies.set('actualComp', companyRes.companyId, { expires: 1 / 24 });
          }
          router.push(`/maintenance/equipment/${finalEquipmentId}`);
        } else {
          const { error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError) {
            throw new Error(handleSupabaseError(anonError.message));
          }

          const res = await completeMaintenanceEmployeeAnonymousSession({
            cuil: cuil || '',
            equipmentId: finalEquipmentId,
          });
          if (!res.ok) {
            throw new Error(res.error);
          }

          // Mantener cookie compatible con el resto del sistema (server actions usan actualComp)
          cookies.set('actualComp', res.companyId, { expires: 1 / 24 });
          router.push(`/maintenance/equipment/${finalEquipmentId}`);
        }
      },
      {
        loading: 'Iniciando sesión...',
        success: 'Sesión iniciada correctamente.',
        error: (error) => error,
      }
    );
  }

  const handleSelection = (type: 'empleado' | 'invitado') => {
    setLoginType(type);
    setStep('login');
  };
  const handleBack = () => {
    if (step === 'login') {
      setStep('selection');
      setLoginType('');
      form.reset();
    } else if (step === 'selection') {
      setStep('equipment-selection');
      equipmentForm.reset();
    }
  };

  const selectedEquipment = useMemo(() => {
    return equipmentOptions.find((eq) => eq.id === selectedEquipmentId);
  }, [equipmentOptions, selectedEquipmentId]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white  bg-cover bg-center p-4 ">
      <Card className="w-full max-w-md shadow-lg h-full">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Image src="/gh_logo.png" alt="Logo de Grupo Horizonte" width={240} height={60} className="h-15" />
          </div>
          <CardDescription className="text-center text-gray-600">
            Sistema de Checklist y Mantenimiento de Equipos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'equipment-selection' ? (
            <Form {...equipmentForm}>
              <form onSubmit={equipmentForm.handleSubmit(onEquipmentSubmit)} className="space-y-4">
                <CardDescription className="text-center text-gray-700 mb-4">
                  Ingrese el dominio o serie del equipo para continuar
                </CardDescription>
                <FormField
                  control={equipmentForm.control}
                  name="equipment_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Equipo</FormLabel>
                      <Popover open={equipmentSearchOpen} onOpenChange={setEquipmentSearchOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn('justify-between', !field.value && 'text-muted-foreground')}
                            >
                              {selectedEquipment ? selectedEquipment.label : 'Buscar por dominio o serie...'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Buscar equipo (mínimo 2 caracteres)..."
                              value={equipmentSearchTerm}
                              onValueChange={setEquipmentSearchTerm}
                            />
                            <CommandList>
                              {isSearchingEquipment && (
                                <div className="py-6 text-center text-sm text-muted-foreground">Buscando...</div>
                              )}
                              {!isSearchingEquipment &&
                                equipmentOptions.length === 0 &&
                                equipmentSearchTerm.trim().length >= 2 && (
                                  <CommandEmpty>No se encontraron equipos</CommandEmpty>
                                )}
                              {!isSearchingEquipment && equipmentSearchTerm.trim().length < 2 && (
                                <CommandEmpty>Ingrese al menos 2 caracteres para buscar</CommandEmpty>
                              )}
                              {!isSearchingEquipment && equipmentOptions.length > 0 && (
                                <CommandGroup>
                                  {equipmentOptions.map((equipment) => (
                                    <CommandItem
                                      value={equipment.label}
                                      key={equipment.id}
                                      onSelect={() => {
                                        equipmentForm.setValue('equipment_id', equipment.id);
                                        setSelectedEquipmentId(equipment.id);
                                        setEquipmentSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          equipment.id === field.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      {equipment.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full text-white">
                  Continuar
                </Button>
              </form>
            </Form>
          ) : step === 'selection' ? (
            <div className="space-y-4">
              <p className="text-center text-gray-700 mb-4">Seleccione su tipo de usuario para continuar:</p>
              <Button className="w-full" onClick={() => handleSelection('empleado')}>
                Empleado
              </Button>
              <Button
                className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                onClick={() => handleSelection('invitado')}
              >
                Invitado
              </Button>
              <Button
                className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                onClick={() => handleSelection('invitado')}
              >
                Mecanico
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <CardDescription className="text-center text-gray-700 mb-4">
                  {loginType === 'empleado'
                    ? 'Ingrese su CUIL para acceder al sistema de mantenimiento.'
                    : 'Ingrese sus credenciales para acceder al sistema de mantenimiento.'}
                </CardDescription>
                {loginType === 'empleado' ? (
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="cuil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cuil</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingrese su Cuil" {...field} />
                          </FormControl>
                          {/* <FormDescription>This is your public display name.</FormDescription> */}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Ingrese su correo" {...field} />
                          </FormControl>
                          {/* <FormDescription>This is your public display name.</FormDescription> */}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Ingrese su contraseña" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <Button type="submit" className="w-full  text-white">
                  <Clipboard className="mr-2 h-4 w-4" /> Acceder al Sistema
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        {(step === 'login' || step === 'selection') && (
          <CardFooter>
            <Button variant="outline" className="w-full  hover:bg-[#E6F7FF]" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default function GHLogin() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-md" />}>
      <GHLoginContent />
    </Suspense>
  );
}
