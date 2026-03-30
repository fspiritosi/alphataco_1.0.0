'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { type document_applies } from '@/generated/prisma/enums';

import { _DocumentTypeFormModal } from './_DocumentTypeFormModal';

// ============================================
// TIPOS
// ============================================

interface CreateDocumentTypeButtonProps {
  defaultApplies?: document_applies;
}

// ============================================
// COMPONENTE
// ============================================

export function _CreateDocumentTypeButton({ defaultApplies }: CreateDocumentTypeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Crear tipo de documento
      </Button>
      <_DocumentTypeFormModal open={open} onOpenChange={setOpen} documentType={null} defaultApplies={defaultApplies} />
    </>
  );
}
