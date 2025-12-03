'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { handleSupabaseError } from '@/lib/errorHandler';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { useLoggedUserStore } from '@/store/loggedUser';
import { ColumnDef } from '@tanstack/react-table';
import { formatRelative } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchCompanyUsers } from '../actions/server-actions';
import { useUserRoles } from '../hooks/useUserRoles';

// Extended ColumnDef to include exportFormatter
export type ExtendedColumnDef<TData, TValue = unknown> = ColumnDef<TData, TValue> & {
  exportFormatter?: (value: any, row: TData) => string;
  excludeFromExport?: boolean;
};

type CompanyUserData = Awaited<ReturnType<typeof fetchCompanyUsers>>['rows'][0];

const RoleCell = ({ userId }: { userId: string }) => {
  const { data, isLoading } = useUserRoles(userId);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!data) {
    return <span>-</span>;
  }

  const { roles, customPermissionsCount } = data;
  const hasRole = roles && roles.length > 0;
  const hasCustomPermissions = customPermissionsCount > 0;

  // Case 1: No role and no custom permissions
  if (!hasRole && !hasCustomPermissions) {
    return <span className="text-muted-foreground">Sin permisos</span>;
  }

  // Extract all roles with their data and permissions
  const rolesWithData = roles
    .map((roleRelation: any) => {
      const roleData = roleRelation.roles;
      const role = Array.isArray(roleData) ? roleData[0] : roleData;
      return {
        role,
        permissionsCount: roleRelation.permissionsCount || 0,
      };
    })
    .filter((item: any) => item.role); // Filter out any null/undefined roles

  // Case 2: Has role (with or without custom permissions)
  if (hasRole && rolesWithData.length > 0) {
    const firstRoleData = rolesWithData[0];
    const firstRole = firstRoleData.role;
    const roleName = firstRole?.name || 'Unknown';
    const roleColor = firstRole?.color || '#2563EB';
    const firstRolePermissionsCount = firstRoleData.permissionsCount || 0;
    const additionalRolesCount = rolesWithData.length > 1 ? rolesWithData.length - 1 : 0;
    const additionalRoles = rolesWithData.slice(1);

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {additionalRolesCount > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <Badge
                    variant="outline"
                    className="gap-1 flex items-center"
                    style={{
                      backgroundColor: `${roleColor}15`,
                      color: roleColor,
                      borderColor: `${roleColor}30`,
                    }}
                  >
                    <span>{roleName}</span>
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {firstRolePermissionsCount}
                    </span>
                    <span>{` +${additionalRolesCount}`}</span>
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs z-50">
                <div className="flex flex-col gap-2">
                  <p className="font-semibold text-sm mb-1">Roles adicionales:</p>
                  <div className="flex flex-col gap-2">
                    {additionalRoles.map((roleData: any, index: number) => {
                      const role = roleData.role;
                      const roleColor = role?.color || '#2563EB';
                      const permissionsCount = roleData.permissionsCount || 0;
                      return (
                        <div key={index} className="flex items-center">
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 w-full justify-start"
                            style={{
                              backgroundColor: `${roleColor}15`,
                              color: roleColor,
                              borderColor: `${roleColor}30`,
                            }}
                          >
                            <span>{role?.name || 'Unknown'}</span>
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {permissionsCount}
                            </span>
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 flex items-center"
            style={{
              backgroundColor: `${roleColor}15`,
              color: roleColor,
              borderColor: `${roleColor}30`,
            }}
          >
            <span>{roleName}</span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {firstRolePermissionsCount}
            </span>
          </Badge>
        )}
        {hasCustomPermissions && (
          <Badge
            variant="outline"
            className="text-xs flex items-center gap-1"
            style={{
              backgroundColor: '#64748B15',
              color: '#64748B',
              borderColor: '#64748B30',
            }}
            title={`${customPermissionsCount} permiso${customPermissionsCount !== 1 ? 's' : ''} personalizado${customPermissionsCount !== 1 ? 's' : ''}`}
          >
            <Shield className="h-3 w-3" />+{customPermissionsCount}
          </Badge>
        )}
      </div>
    );
  }

  // Case 3: Only custom permissions (no role)
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="flex items-center gap-1"
        style={{
          backgroundColor: '#64748B15',
          color: '#64748B',
          borderColor: '#64748B30',
        }}
      >
        <span>Permisos personalizados</span>
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          {customPermissionsCount}
        </span>
      </Badge>
    </div>
  );
};

export const columnsUsers: ExtendedColumnDef<CompanyUserData>[] = [
  {
    accessorKey: 'profile.fullname',
    id: 'profile.fullname',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => {
      const fullname = row.original.profile?.fullname || 'Sin nombre';
      const id = row.original.id;

      return (
        <Link href={`/dashboard/company/actualCompany/user/${id}`} className="hover:underline">
          {fullname}
        </Link>
      );
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    exportFormatter: (value, row) => row.profile?.fullname || '',
  },
  {
    accessorKey: 'profile.email',
    id: 'profile.email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Correo" />,
    cell: ({ row }) => {
      const email = row.original.profile?.email || '';
      const avatar = row.original.profile?.avatar || '';

      return (
        <div className="flex space-x-2 items-center">
          <Avatar>
            <AvatarImage src={avatar} alt="Avatar" className="rounded-full object-cover" />
            <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="max-w-[500px] truncate font-medium">{email}</span>
        </div>
      );
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    exportFormatter: (value, row) => row.profile?.email || '',
  },
  {
    accessorKey: 'user_roles.roles.name',
    id: 'user_roles.roles.name',
    header: 'Rol',
    cell: ({ row }) => {
      return <RoleCell userId={row.original.profile?.id || ''} />;
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    exportFormatter: (value, row: any) => {
      const r = row.roles;
      return (Array.isArray(r) ? r[0]?.name : r?.name) || '';
    },
  },
  {
    accessorKey: 'created_at',
    id: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de alta" />,
    cell: ({ row }) => {
      const date = row.getValue('created_at');
      if (!date) return <span>-</span>;
      return (
        <div className="flex items-center">
          <span>
            {formatRelative(new Date(date as string), new Date(), {
              locale: es,
            })}
          </span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return true;
    },
    exportFormatter: (value) => (value ? new Date(value).toLocaleDateString() : ''),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const router = useRouter();
      const handleDelete = async () => {
        const supabase = supabaseBrowser();

        toast.promise(
          async () => {
            const { error } = await supabase.from('share_company_users').delete().eq('id', row.original.id).select();

            if (error) {
              throw new Error(handleSupabaseError(error.message));
            }
          },
          {
            loading: 'Eliminando...',
            success: () => {
              useLoggedUserStore?.getState()?.FetchSharedUsers();
              return 'Usuario eliminado';
            },
            error: (error) => {
              return error;
            },
          }
        );
        router.refresh();
      };
      return (
        <PermissionGuard module="empresa" tab="usuarios-empleados" action="delete">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant={'destructive'}>Eliminar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar eliminación de la empresa</AlertDialogTitle>
                <AlertDialogDescription>Este usuario dejara de tener acceso a la empresa</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button onClick={handleDelete} variant={'destructive'}>
                    Eliminar
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </PermissionGuard>
      );
    },
    header: () => (
      <PermissionGuard module="empresa" tab="usuarios-empleados" action="delete">
        Eliminar
      </PermissionGuard>
    ),
    excludeFromExport: true,
  },
];
