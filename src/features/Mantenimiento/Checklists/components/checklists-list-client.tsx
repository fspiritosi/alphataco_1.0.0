'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/features/Mantenimiento/shared/components/empty-state';
import { MaintenanceHeader } from '@/features/Mantenimiento/shared/components/maintenance-header';
import { Calendar, ChevronRight, ClipboardList } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';

type Checklist = {
  id: string;
  name: string;
  form: {
    description?: string;
    frequency?: string;
    title?: string;
    vehicle_type?: string[];
  } | null;
  created_at: string;
};

interface ChecklistsListClientProps {
  equipmentId: string;
  checklists: Checklist[];
  employeeName?: string | null;
  employeeCuil?: string | null;
}

export default function ChecklistsListClient({
  equipmentId,
  checklists,
  employeeName,
  employeeCuil,
}: ChecklistsListClientProps) {
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    return moment(dateStr).format('DD/MM/YYYY');
  };

  const handleSelectChecklist = (checklistId: string) => {
    router.push(`/maintenance/equipment/${equipmentId}/checklists/${checklistId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MaintenanceHeader
        title="Checklists"
        showBack
        backHref={`/maintenance/equipment/${equipmentId}`}
        employeeName={employeeName}
        employeeCuil={employeeCuil}
      />

      <main className="flex-1 p-4 pb-24">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Tipos de checklist</h2>
          <p className="text-sm text-muted-foreground">Seleccione el checklist de mantenimiento a completar</p>
        </div>

        {checklists.length > 0 ? (
          <div className="space-y-3">
            {checklists.map((checklist) => (
              <Card
                key={checklist.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.99]"
                onClick={() => handleSelectChecklist(checklist.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {(checklist.form && typeof checklist.form === 'object' && 'description' in checklist.form
                            ? checklist.form.description
                            : null) || checklist.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {checklist.form &&
                            typeof checklist.form === 'object' &&
                            'frequency' in checklist.form &&
                            checklist.form.frequency && (
                              <Badge variant="secondary" className="text-xs">
                                {checklist.form.frequency}
                              </Badge>
                            )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(checklist.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{checklist.name}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No hay checklists disponibles"
            description="No hay checklists configurados para este tipo de equipo"
          />
        )}
      </main>
    </div>
  );
}
