'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Module, Permission } from '@/lib/types';
import { ChevronRight, Eye, Pencil, Plus, Trash2 } from 'lucide-react';

interface ModulePermissionsProps {
  modules: Module[];
  permissions: Permission[];
  onPermissionChange: (permission: Permission) => void;
}

const ACTION_ICONS = {
  view: Eye,
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_LABELS = {
  view: 'Ver',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
};

export function ModulePermissions({ modules, permissions, onPermissionChange }: ModulePermissionsProps) {
  const isPermissionActive = (moduleId: string, tabId: string, action: string) => {
    return permissions.some((p) => p.moduleId === moduleId && p.tabId === tabId && p.action === action);
  };

  const isModuleFullySelected = (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return false;

    const totalActions = module.tabs.reduce((acc, tab) => acc + tab.actions.length, 0);
    const selectedActions = permissions.filter((p) => p.moduleId === moduleId).length;

    return totalActions === selectedActions;
  };

  const isTabFullySelected = (moduleId: string, tabId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    const tab = module?.tabs.find((t) => t.id === tabId);
    if (!tab) return false;

    const selectedActions = permissions.filter((p) => p.moduleId === moduleId && p.tabId === tabId).length;

    return tab.actions.length === selectedActions;
  };

  const toggleModule = (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return;

    const isFullySelected = isModuleFullySelected(moduleId);

    module.tabs.forEach((tab) => {
      tab.actions.forEach((action) => {
        const permission: Permission = { moduleId, tabId: tab.id, action };
        const exists = isPermissionActive(moduleId, tab.id, action);

        if (isFullySelected && exists) {
          onPermissionChange(permission);
        } else if (!isFullySelected && !exists) {
          onPermissionChange(permission);
        }
      });
    });
  };

  const toggleTab = (moduleId: string, tabId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    const tab = module?.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const isFullySelected = isTabFullySelected(moduleId, tabId);

    tab.actions.forEach((action) => {
      const permission: Permission = { moduleId, tabId, action };
      const exists = isPermissionActive(moduleId, tabId, action);

      if (isFullySelected && exists) {
        onPermissionChange(permission);
      } else if (!isFullySelected && !exists) {
        onPermissionChange(permission);
      }
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Permisos por Módulo</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Configura el acceso a módulos, tabs y acciones específicas
          </p>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {modules.map((module) => {
            const Icon = module.icon;
            const moduleSelected = isModuleFullySelected(module.id);
            const modulePartiallySelected = permissions.some((p) => p.moduleId === module.id) && !moduleSelected;

            return (
              <AccordionItem
                key={module.id}
                value={module.id}
                className="border border-border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={moduleSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = modulePartiallySelected;
                        }
                      }}
                      onCheckedChange={() => toggleModule(module.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{module.name}</span>
                    <Badge variant="secondary" className="ml-auto mr-2">
                      {permissions.filter((p) => p.moduleId === module.id).length} /{' '}
                      {module.tabs.reduce((acc, tab) => acc + tab.actions.length, 0)}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 pt-2">
                    {module.tabs.map((tab) => {
                      const tabSelected = isTabFullySelected(module.id, tab.id);
                      const tabPartiallySelected =
                        permissions.some((p) => p.moduleId === module.id && p.tabId === tab.id) && !tabSelected;

                      return (
                        <div key={tab.id} className="pl-8 space-y-2 border-l-2 border-border">
                          <div className="flex items-center gap-2 -ml-8 pl-8">
                            <Checkbox
                              checked={tabSelected}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate = tabPartiallySelected;
                                }
                              }}
                              onCheckedChange={() => toggleTab(module.id, tab.id)}
                            />
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{tab.name}</span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-6">
                            {tab.actions.map((action) => {
                              const ActionIcon = ACTION_ICONS[action as keyof typeof ACTION_ICONS];
                              const isActive = isPermissionActive(module.id, tab.id, action);

                              return (
                                <div
                                  key={action}
                                  className={`flex items-center gap-2 p-2 rounded border transition-colors cursor-pointer ${
                                    isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                  }`}
                                  onClick={() =>
                                    onPermissionChange({
                                      moduleId: module.id,
                                      tabId: tab.id,
                                      action,
                                    })
                                  }
                                >
                                  <Checkbox
                                    checked={isActive}
                                    onCheckedChange={() =>
                                      onPermissionChange({
                                        moduleId: module.id,
                                        tabId: tab.id,
                                        action,
                                      })
                                    }
                                  />
                                  <ActionIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{ACTION_LABELS[action as keyof typeof ACTION_LABELS]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </Card>
  );
}
