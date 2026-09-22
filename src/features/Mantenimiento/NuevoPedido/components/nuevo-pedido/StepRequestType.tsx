'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  PREVENTIVE_TYPES,
  PREVENTIVE_TYPE_DESCRIPTIONS,
  PREVENTIVE_TYPE_ICONS,
  type PreventiveType,
} from '@/features/Mantenimiento/shared/preventive-maintenance';
import { cn } from '@/lib/utils';
import { Check, ClipboardList, Info, PencilLine, Wrench } from 'lucide-react';
import type { ChecklistTemplatesForEquipment } from '../../actions/queries.server';
import { RequestTypeCard } from './SelectableCard';
import type { RequestType } from './types';

export interface StepRequestTypeProps {
  handleChangeRequestType: (type: RequestType) => void;
  handleSelectTemplate: (templateId: string) => void;
  isLoadingTemplates: boolean;
  isOtherEquipment: boolean;
  preventiveDescription: string;
  requestType: RequestType;
  selectedPreventiveType: PreventiveType | '';
  selectedTemplateId: string;
  setPreventiveDescription: (value: string) => void;
  setSelectedPreventiveType: (value: PreventiveType | '') => void;
  templates: ChecklistTemplatesForEquipment | undefined;
  templatesError: Error | null;
  visibleRequestTypes: RequestType[];
}

/** Paso "Tipo": checklist, mantenimiento preventivo o carga manual. */
export function StepRequestType({
  handleChangeRequestType,
  handleSelectTemplate,
  isLoadingTemplates,
  isOtherEquipment,
  preventiveDescription,
  requestType,
  selectedPreventiveType,
  selectedTemplateId,
  setPreventiveDescription,
  setSelectedPreventiveType,
  templates,
  templatesError,
  visibleRequestTypes,
}: StepRequestTypeProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label id="request-type-label" className="text-base font-medium">
          Tipo de pedido
        </Label>
        <div
          role="radiogroup"
          aria-labelledby="request-type-label"
          className={cn('grid gap-3 mt-2 items-stretch', isOtherEquipment ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}
        >
          <RequestTypeCard
            type="checklist"
            order={visibleRequestTypes}
            icon={ClipboardList}
            title="Checklist"
            description="Desde desvíos de inspección"
            selected={requestType === 'checklist'}
            onSelect={handleChangeRequestType}
            disabledReason={
              isOtherEquipment ? 'No hay checklists configurados para equipamientos. Elegí Carga Manual.' : undefined
            }
          />
          {/* Ticket 654: los equipamientos no tienen programa preventivo, la tarjeta no se ofrece */}
          {!isOtherEquipment && (
            <RequestTypeCard
              type="preventive"
              order={visibleRequestTypes}
              icon={Wrench}
              title="Mant. Preventivo"
              description="Programa planificado de mantenimiento"
              selected={requestType === 'preventive'}
              onSelect={handleChangeRequestType}
            />
          )}
          <RequestTypeCard
            type="manual"
            order={visibleRequestTypes}
            icon={PencilLine}
            title="Carga Manual - Mant. Correctivo"
            description="Cargá las reparaciones sin pasar por un checklist"
            selected={requestType === 'manual'}
            onSelect={handleChangeRequestType}
          />
        </div>
      </div>

      <Separator />

      {requestType === 'checklist' ? (
        <div className="space-y-4">
          <Label>Selecciona el checklist base</Label>
          {isLoadingTemplates ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : templatesError ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">Error al cargar los checklists</div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedTemplateId === template.id && 'border-primary bg-primary/5'
                  )}
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.checklist_template_sections?.length || 0} secciones
                      </p>
                    </div>
                    {selectedTemplateId === template.id && <Check className="h-5 w-5 text-primary" />}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-muted text-center rounded-lg">
              No hay checklists disponibles para este tipo de equipo
            </div>
          )}
        </div>
      ) : requestType === 'preventive' ? (
        <div className="space-y-4">
          <Label>Selecciona el programa</Label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(PREVENTIVE_TYPES) as [PreventiveType, string][]).map(([key, label]) => {
              const Icon = PREVENTIVE_TYPE_ICONS[key];
              return (
                <Card
                  key={key}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedPreventiveType === key && 'border-primary bg-primary/5'
                  )}
                  onClick={() => setSelectedPreventiveType(key)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{PREVENTIVE_TYPE_DESCRIPTIONS[key]}</p>
                    </div>
                    {selectedPreventiveType === key && <Check className="h-4 w-4 text-primary" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="preventive-description">Descripción (opcional)</Label>
            <Textarea
              id="preventive-description"
              placeholder="Agrega detalles del mantenimiento preventivo (motivo, observaciones, etc.)"
              value={preventiveDescription}
              onChange={(e) => setPreventiveDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            En el paso siguiente vas a cargar directamente las reparaciones que necesita el equipo, sin partir de un
            checklist.
          </p>
        </div>
      )}
    </div>
  );
}
