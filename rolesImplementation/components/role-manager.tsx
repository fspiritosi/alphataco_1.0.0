// 'use client';

// import { ModulePermissions } from '@/components/module-permissions';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { Card } from '@/components/ui/card';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from '@/components/ui/dialog';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import type { Module, Permission, Role } from '@/lib/types';
// import { Pencil, Plus, Shield, Trash2 } from 'lucide-react';
// import { useState } from 'react';

// interface RoleManagerProps {
//   roles: Role[];
//   modules: Module[];
//   onRolesChange: (roles: Role[]) => void;
// }

// export function RoleManager({ roles, modules, onRolesChange }: RoleManagerProps) {
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [editingRole, setEditingRole] = useState<Role | null>(null);
//   const [roleName, setRoleName] = useState('');
//   const [roleDescription, setRoleDescription] = useState('');
//   const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

//   const handleCreateRole = () => {
//     setEditingRole(null);
//     setRoleName('');
//     setRoleDescription('');
//     setRolePermissions([]);
//     setIsDialogOpen(true);
//   };

//   const handleEditRole = (role: Role) => {
//     setEditingRole(role);
//     setRoleName(role.name);
//     setRoleDescription(role.description);
//     setRolePermissions(role.permissions);
//     setIsDialogOpen(true);
//   };

//   const handleSaveRole = () => {
//     if (!roleName.trim()) {
//       alert('El nombre del rol es requerido');
//       return;
//     }

//     if (editingRole) {
//       // Editar rol existente
//       const updatedRoles = roles.map((r) =>
//         r.id === editingRole.id
//           ? { ...r, name: roleName, description: roleDescription, permissions: rolePermissions }
//           : r
//       );
//       onRolesChange(updatedRoles);
//     } else {
//       // Crear nuevo rol
//       const newRole: Role = {
//         id: `role-${Date.now()}`,
//         name: roleName,
//         description: roleDescription,
//         permissions: rolePermissions,
//       };
//       onRolesChange([...roles, newRole]);
//     }

//     setIsDialogOpen(false);
//   };

//   const handleDeleteRole = (roleId: string) => {
//     if (confirm('¿Estás seguro de eliminar este rol?')) {
//       onRolesChange(roles.filter((r) => r.id !== roleId));
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <Card className="p-6">
//         <div className="flex items-center justify-between mb-4">
//           <div>
//             <Label className="text-base font-semibold">Roles Disponibles</Label>
//             <p className="text-sm text-muted-foreground mt-1">Crea y gestiona roles con permisos predefinidos</p>
//           </div>
//           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//             <DialogTrigger asChild>
//               <Button onClick={handleCreateRole}>
//                 <Plus className="h-4 w-4 mr-2" />
//                 Crear Rol
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
//               <DialogHeader>
//                 <DialogTitle>{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</DialogTitle>
//                 <DialogDescription>Define el nombre, descripción y permisos para este rol</DialogDescription>
//               </DialogHeader>

//               <div className="space-y-4 py-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="role-name">Nombre del Rol</Label>
//                   <Input
//                     id="role-name"
//                     placeholder="Ej: Administrador, Editor, Visor"
//                     value={roleName}
//                     onChange={(e) => setRoleName(e.target.value)}
//                   />
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="role-description">Descripción</Label>
//                   <Textarea
//                     id="role-description"
//                     placeholder="Describe las responsabilidades de este rol"
//                     value={roleDescription}
//                     onChange={(e) => setRoleDescription(e.target.value)}
//                     rows={3}
//                   />
//                 </div>

//                 <div className="space-y-2">
//                   <Label>Permisos del Rol</Label>
//                   <ModulePermissions
//                     modules={modules}
//                     permissions={rolePermissions}
//                     onPermissionChange={(permission) => {
//                       const exists = rolePermissions.find(
//                         (p) =>
//                           p.moduleId === permission.moduleId &&
//                           p.tabId === permission.tabId &&
//                           p.action === permission.action
//                       );

//                       if (exists) {
//                         setRolePermissions(
//                           rolePermissions.filter(
//                             (p) =>
//                               !(
//                                 p.moduleId === permission.moduleId &&
//                                 p.tabId === permission.tabId &&
//                                 p.action === permission.action
//                               )
//                           )
//                         );
//                       } else {
//                         setRolePermissions([...rolePermissions, permission]);
//                       }
//                     }}
//                   />
//                 </div>
//               </div>

//               <DialogFooter>
//                 <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
//                   Cancelar
//                 </Button>
//                 <Button onClick={handleSaveRole}>{editingRole ? 'Guardar Cambios' : 'Crear Rol'}</Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {roles.map((role) => (
//             <Card key={role.id} className="p-4 hover:shadow-md transition-shadow">
//               <div className="flex items-start justify-between mb-3">
//                 <div className="flex items-center gap-2">
//                   <Shield className="h-5 w-5 text-primary" />
//                   <h3 className="font-semibold">{role.name}</h3>
//                 </div>
//                 <Badge variant="secondary">{role.permissions.length}</Badge>
//               </div>

//               <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{role.description}</p>

//               <div className="flex gap-2">
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   className="flex-1 bg-transparent"
//                   onClick={() => handleEditRole(role)}
//                 >
//                   <Pencil className="h-3 w-3 mr-2" />
//                   Editar
//                 </Button>
//                 <Button variant="outline" size="sm" onClick={() => handleDeleteRole(role.id)}>
//                   <Trash2 className="h-3 w-3" />
//                 </Button>
//               </div>
//             </Card>
//           ))}
//         </div>
//       </Card>
//     </div>
//   );
// }
