'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Role } from '@/lib/types';
import { Shield } from 'lucide-react';

interface RoleSelectorProps {
  roles: Role[];
  selectedRoles: string[];
  onRoleChange: (roleIds: string[]) => void;
}

export function RoleSelector({ roles, selectedRoles, onRoleChange }: RoleSelectorProps) {
  const handleRoleToggle = (roleId: string) => {
    if (selectedRoles.includes(roleId)) {
      onRoleChange(selectedRoles.filter((id) => id !== roleId));
    } else {
      onRoleChange([...selectedRoles, roleId]);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Roles / Presets</Label>
        </div>
        <p className="text-sm text-muted-foreground">Selecciona uno o más roles para aplicar permisos predefinidos</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleRoleToggle(role.id)}
            >
              <Checkbox
                checked={selectedRoles.includes(role.id)}
                onCheckedChange={() => handleRoleToggle(role.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{role.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {role.permissions.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
