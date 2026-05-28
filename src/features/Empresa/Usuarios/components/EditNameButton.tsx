'use client';

import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { EditUserNameDialog } from './EditUserNameDialog';

interface EditNameButtonProps {
  profileId: string;
  currentFullname: string | null;
  employeeFullname: string | null;
}

export function EditNameButton({ profileId, currentFullname, employeeFullname }: EditNameButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Editar nombre del usuario"
        className="absolute right-4 top-4 z-10 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden text-xs font-medium sm:inline">Editar nombre</span>
      </Button>

      <EditUserNameDialog
        open={open}
        onOpenChange={setOpen}
        profileId={profileId}
        currentFullname={currentFullname}
        employeeFullname={employeeFullname}
      />
    </>
  );
}
