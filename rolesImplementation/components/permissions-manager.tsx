// 'use client';

// import { ModulePermissions } from '@/components/module-permissions';
// import { RoleManager } from '@/components/role-manager';
// import { RoleSelector } from '@/components/role-selector';
// import { Button } from '@/components/ui/button';
// import { Card } from '@/components/ui/card';
// import { Label } from '@/components/ui/label';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { MOCK_MODULES, MOCK_ROLES } from '@/lib/mock-data';
// import type { Module, Permission, Role } from '@/lib/types';
// import { Save, Shield, User, X } from 'lucide-react';
// import { useState } from 'react';

// export function PermissionsManager() {
//   const [selectedUser, setSelectedUser] = useState({
//     id: '1',
//     name: 'Juan Pérez',
//     email: 'juan@example.com',
//   });
//   const [permissions, setPermissions] = useState<Permission[]>([]);
//   const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
//   const [modules] = useState<Module[]>(MOCK_MODULES);
//   const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);

//   const handleRoleChange = (roleIds: string[]) => {
//     setSelectedRoles(roleIds);

//     // Aplicar permisos de los roles seleccionados
//     const rolePermissions: Permission[] = [];
//     roleIds.forEach((roleId) => {
//       const role = roles.find((r) => r.id === roleId);
//       if (role) {
//         rolePermissions.push(...role.permissions);
//       }
//     });

//     setPermissions(rolePermissions);
//   };

//   const handlePermissionChange = (permission: Permission) => {
//     setPermissions((prev) => {
//       const exists = prev.find(
//         (p) => p.moduleId === permission.moduleId && p.tabId === permission.tabId && p.action === permission.action
//       );

//       if (exists) {
//         return prev.filter(
//           (p) => !(p.moduleId === permission.moduleId && p.tabId === permission.tabId && p.action === permission.action)
//         );
//       } else {
//         return [...prev, permission];
//       }
//     });
//   };

//   const handleSave = () => {
//     console.log('Guardando permisos:', {
//       userId: selectedUser.id,
//       roles: selectedRoles,
//       permissions,
//     });
//     alert('Permisos guardados exitosamente');
//   };

//   return (
//     <div className="container mx-auto p-6 max-w-7xl">
//       <div className="mb-8">
//         <div className="flex items-center gap-3 mb-2">
//           <Shield className="h-8 w-8 text-primary" />
//           <h1 className="text-3xl font-bold text-balance">Gestión de Permisos</h1>
//         </div>
//         <p className="text-muted-foreground text-pretty">
//           Configura los permisos de acceso para módulos, tabs y acciones
//         </p>
//       </div>

//       <Tabs defaultValue="user-permissions" className="space-y-6">
//         <TabsList className="grid w-full max-w-md grid-cols-2">
//           <TabsTrigger value="user-permissions">
//             <User className="h-4 w-4 mr-2" />
//             Permisos de Usuario
//           </TabsTrigger>
//           <TabsTrigger value="role-management">
//             <Shield className="h-4 w-4 mr-2" />
//             Gestión de Roles
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="user-permissions" className="space-y-6">
//           <Card className="p-6">
//             <div className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <Label className="text-base font-semibold">Usuario Seleccionado</Label>
//                   <div className="flex items-center gap-2 mt-2">
//                     <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
//                       <User className="h-5 w-5 text-primary" />
//                     </div>
//                     <div>
//                       <p className="font-medium">{selectedUser.name}</p>
//                       <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex gap-2">
//                   <Button variant="outline" size="sm">
//                     <X className="h-4 w-4 mr-2" />
//                     Cancelar
//                   </Button>
//                   <Button size="sm" onClick={handleSave}>
//                     <Save className="h-4 w-4 mr-2" />
//                     Guardar Cambios
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           </Card>

//           <RoleSelector roles={roles} selectedRoles={selectedRoles} onRoleChange={handleRoleChange} />

//           <ModulePermissions modules={modules} permissions={permissions} onPermissionChange={handlePermissionChange} />
//         </TabsContent>

//         <TabsContent value="role-management">
//           <RoleManager roles={roles} modules={modules} onRolesChange={setRoles} />
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
