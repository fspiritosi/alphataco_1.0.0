'use client';

import { HandshakeIcon } from '@/components/Icons';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { ModulesWithTabsData } from '@/features/UserPermissionsManager/actions.server';
import { getModulesWithTabsServer } from '@/features/UserPermissionsManager/actions.server';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  ClipboardList,
  Eye,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
  Truck,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleItem = ModulesWithTabsData[number];
type TabItem = ModuleItem['tabs'][number];
type ActionItem = TabItem['actions'][number];

interface RolePermissionsEditorProps {
  permissions: Array<{ tabId: string; actionId: string }>;
  onPermissionsChange: (permissions: Array<{ tabId: string; actionId: string }>) => void;
  initialModules: ModulesWithTabsData;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  view: Eye,
  create: Plus,
  update: Pencil,
  delete: Trash2,
  view_all_requests: UsersRound,
};

const ACTION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  view_all_requests: 'Ver Todas',
};

const ACTION_COLORS: Record<string, string> = {
  view: 'text-blue-600',
  create: 'text-green-600',
  update: 'text-yellow-600',
  delete: 'text-red-600',
  view_all_requests: 'text-purple-600',
};

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  empresa: Building2,
  empleados: Users,
  equipos: Truck,
  comercial: HandshakeIcon,
  documentacion: FileText,
  operaciones: Calendar,
  mantenimiento: Wrench,
  formularios: ClipboardList,
  ayuda: HelpCircle,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RolePermissionsEditor({
  permissions,
  onPermissionsChange,
  initialModules,
}: RolePermissionsEditorProps) {
  // Usa initialModules como SSR data; re-fetch transparente en background
  const { data: modules = initialModules } = useQuery({
    queryKey: ['modules-with-tabs'],
    queryFn: getModulesWithTabsServer,
    initialData: initialModules,
    staleTime: 5 * 60 * 1000, // 5 minutos — los módulos/tabs cambian raramente
  });

  const permissionSet = useMemo(() => {
    return new Set(permissions.map((p) => `${p.tabId}:${p.actionId}`));
  }, [permissions]);

  const isPermissionActive = (tabId: string, actionId: string) => {
    return permissionSet.has(`${tabId}:${actionId}`);
  };

  const findTab = (items: TabItem[], tabId: string): TabItem | null => {
    for (const item of items) {
      if (item.id === tabId) return item;
      const found = findTab(item.subtabs as TabItem[], tabId);
      if (found) return found;
    }
    return null;
  };

  const togglePermission = (tabId: string, actionId: string) => {
    const key = `${tabId}:${actionId}`;
    const isAdding = !permissionSet.has(key);

    const allTabs = modules.flatMap((m) => m.tabs as TabItem[]);
    const targetTab = findTab(allTabs, tabId);

    const action = targetTab?.actions?.find((a) => a.id === actionId);
    const actionSlug = action?.slug;

    // Si estamos intentando REMOVER el permiso de 'view', verificar si hay otros permisos activos
    if (!isAdding && actionSlug === 'view') {
      const hasOtherPermissions = targetTab?.actions?.some((a) => {
        if (a.slug === 'view') return false;
        return permissionSet.has(`${tabId}:${a.id}`);
      });
      if (hasOtherPermissions) return;
    }

    const permissionsToToggle: Array<{ tabId: string; actionId: string }> = [{ tabId, actionId }];

    // Si es un tab padre, propagar a los hijos
    if (targetTab?.subtabs && targetTab.subtabs.length > 0) {
      const collectSubtabPermissions = (subtabs: TabItem[]) => {
        subtabs.forEach((subtab) => {
          const supportsAction = subtab.actions?.some((a) => a.id === actionId);
          if (supportsAction) permissionsToToggle.push({ tabId: subtab.id, actionId });
          if (subtab.subtabs) collectSubtabPermissions(subtab.subtabs as TabItem[]);
        });
      };
      collectSubtabPermissions(targetTab.subtabs as TabItem[]);
    }

    let newPermissions = [...permissions];

    if (isAdding) {
      permissionsToToggle.forEach((perm) => {
        if (!permissionSet.has(`${perm.tabId}:${perm.actionId}`)) newPermissions.push(perm);
      });

      // AUTO-ASSIGN VIEW: Si agregamos create/update/delete, también agregar 'view'
      if (actionSlug && ['create', 'update', 'delete'].includes(actionSlug)) {
        const viewAction = targetTab?.actions?.find((a) => a.slug === 'view');
        if (viewAction) {
          const viewKey = `${tabId}:${viewAction.id}`;
          if (!permissionSet.has(viewKey)) newPermissions.push({ tabId, actionId: viewAction.id });

          if (targetTab?.subtabs && targetTab.subtabs.length > 0) {
            const addViewToSubtabs = (subtabs: TabItem[]) => {
              subtabs.forEach((subtab) => {
                const subtabViewAction = subtab.actions?.find((a) => a.slug === 'view');
                if (subtabViewAction) {
                  const subtabViewKey = `${subtab.id}:${subtabViewAction.id}`;
                  if (!permissionSet.has(subtabViewKey)) {
                    newPermissions.push({ tabId: subtab.id, actionId: subtabViewAction.id });
                  }
                }
                if (subtab.subtabs) addViewToSubtabs(subtab.subtabs as TabItem[]);
              });
            };
            addViewToSubtabs(targetTab.subtabs as TabItem[]);
          }
        }
      }
    } else {
      const keysToRemove = new Set(permissionsToToggle.map((p) => `${p.tabId}:${p.actionId}`));
      newPermissions = newPermissions.filter((p) => !keysToRemove.has(`${p.tabId}:${p.actionId}`));
    }

    onPermissionsChange(newPermissions);
  };

  const countTabActions = (tab: TabItem): { total: number; selected: number } => {
    let total = tab.actions?.length ?? 0;
    let selected = tab.actions?.filter((action) => isPermissionActive(tab.id, action.id)).length ?? 0;

    if (tab.subtabs?.length) {
      (tab.subtabs as TabItem[]).forEach((subtab) => {
        const subtabCounts = countTabActions(subtab);
        total += subtabCounts.total;
        selected += subtabCounts.selected;
      });
    }

    return { total, selected };
  };

  const isTabFullySelected = (tab: TabItem): boolean => {
    const counts = countTabActions(tab);
    return counts.total > 0 && counts.selected === counts.total;
  };

  const toggleTab = (tab: TabItem) => {
    const isFullySelected = isTabFullySelected(tab);
    const toToggle: Array<{ tabId: string; actionId: string }> = [];

    const collectActions = (t: TabItem) => {
      t.actions?.forEach((action) => toToggle.push({ tabId: t.id, actionId: action.id }));
      if (t.subtabs?.length) (t.subtabs as TabItem[]).forEach(collectActions);
    };

    collectActions(tab);

    if (isFullySelected) {
      const keysToRemove = new Set(toToggle.map((p) => `${p.tabId}:${p.actionId}`));
      onPermissionsChange(permissions.filter((p) => !keysToRemove.has(`${p.tabId}:${p.actionId}`)));
    } else {
      const newPermissions = [...permissions];
      toToggle.forEach((perm) => {
        if (!permissionSet.has(`${perm.tabId}:${perm.actionId}`)) newPermissions.push(perm);
      });
      onPermissionsChange(newPermissions);
    }
  };

  const renderActions = (tab: TabItem) => {
    if (!tab.actions?.length) return null;

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {tab.actions.map((action: ActionItem) => {
          const ActionIcon = ACTION_ICONS[action.slug];
          const isActive = isPermissionActive(tab.id, action.id);

          return (
            <div
              key={action.id}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all cursor-pointer ${
                isActive ? 'border-primary/50 bg-primary/10' : 'border-border/50 hover:border-primary/30'
              }`}
              onClick={() => togglePermission(tab.id, action.id)}
            >
              <Checkbox
                checked={isActive}
                onCheckedChange={() => togglePermission(tab.id, action.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-3 w-3"
              />
              {ActionIcon && (
                <ActionIcon className={`h-3 w-3 ${ACTION_COLORS[action.slug] ?? 'text-muted-foreground'}`} />
              )}
              <span className="text-xs font-medium">{ACTION_LABELS[action.slug] ?? action.name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSubtab = (tab: TabItem) => {
    const hasSubtabs = tab.subtabs && tab.subtabs.length > 0;
    const counts = countTabActions(tab);
    const tabSelected = isTabFullySelected(tab);
    const tabPartiallySelected = counts.selected > 0 && !tabSelected;

    return (
      <div key={tab.id} className="space-y-2 pl-3 border-l border-border/50">
        <div className="flex items-start gap-2 py-1">
          <Checkbox
            checked={tabSelected}
            ref={(el: HTMLButtonElement | null) => {
              if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = tabPartiallySelected;
            }}
            onCheckedChange={() => toggleTab(tab)}
            className="mt-0.5 h-3 w-3"
          />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-medium text-xs text-muted-foreground">{tab.name}</span>
              {counts.total > 0 && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  {counts.selected}/{counts.total}
                </Badge>
              )}
            </div>
            {renderActions(tab)}
          </div>
        </div>

        {hasSubtabs && (
          <div className="space-y-1.5">{(tab.subtabs as TabItem[]).map((subtab) => renderSubtab(subtab))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
      <Label className="text-sm font-semibold">Permisos del Rol</Label>
      <Accordion type="multiple" className="space-y-2">
        {modules.map((module: ModuleItem) => {
          const moduleCounts = (module.tabs as TabItem[]).reduce(
            (acc, tab) => {
              const tabCounts = countTabActions(tab);
              return { total: acc.total + tabCounts.total, selected: acc.selected + tabCounts.selected };
            },
            { total: 0, selected: 0 }
          );

          const ModuleIcon = MODULE_ICONS[module.slug ?? ''] ?? Building2;

          return (
            <AccordionItem
              key={module.id}
              value={module.id}
              className="border border-border/50 rounded-md overflow-hidden"
            >
              <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-2 flex-1">
                  <ModuleIcon className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{module.name}</span>
                  <Badge variant="secondary" className="ml-auto mr-2 text-[10px] h-5">
                    {moduleCounts.selected}/{moduleCounts.total}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 pt-1">
                {module.tabs && module.tabs.length > 0 ? (
                  <Accordion type="multiple" className="space-y-2">
                    {(module.tabs as TabItem[]).map((tab) => {
                      const hasSubtabs = tab.subtabs && tab.subtabs.length > 0;
                      const counts = countTabActions(tab);
                      const tabSelected = isTabFullySelected(tab);
                      const tabPartiallySelected = counts.selected > 0 && !tabSelected;

                      return (
                        <AccordionItem
                          key={tab.id}
                          value={tab.id}
                          className="border-l-2 border-primary/20 pl-3 bg-muted/10 rounded-r-md"
                        >
                          <div className="flex items-center gap-2 py-1.5">
                            <Checkbox
                              checked={tabSelected}
                              ref={(el: HTMLButtonElement | null) => {
                                if (el)
                                  (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate =
                                    tabPartiallySelected;
                              }}
                              onCheckedChange={() => toggleTab(tab)}
                              className="h-3 w-3"
                            />
                            <AccordionTrigger className="flex-1 hover:no-underline py-0">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-semibold text-xs">{tab.name}</span>
                                {counts.total > 0 && (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                                    {counts.selected}/{counts.total}
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                          </div>
                          <AccordionContent>
                            <div className="space-y-3 pt-2 pb-1">
                              {renderActions(tab)}

                              {hasSubtabs && (
                                <>
                                  <Separator className="my-2" />
                                  <div className="space-y-1.5">
                                    {(tab.subtabs as TabItem[]).map((subtab) => renderSubtab(subtab))}
                                  </div>
                                </>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <div className="text-xs text-muted-foreground pt-1">No hay tabs disponibles</div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
