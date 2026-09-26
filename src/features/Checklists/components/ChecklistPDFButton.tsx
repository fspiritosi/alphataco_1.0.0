'use client';

import { ChecklistPDFPreviewDialog } from '@/features/Checklists/components/checklist-pdf-preview-dialog';

interface ChecklistPDFButtonProps {
  templateName: string;
  templateCode: string;
  sections: Array<{
    id: string;
    code: string;
    name: string;
    order_index: number;
    checklist_template_items: Array<{
      id: string;
      code: string;
      label: string;
      order_index: number;
      is_critical?: boolean;
      requires_side_validation?: boolean;
      input_type?: string;
    }>;
  }>;
  date?: string;
  revision?: string;
}

export function ChecklistPDFButton({ templateName, templateCode, sections, date, revision }: ChecklistPDFButtonProps) {

  return (
    <ChecklistPDFPreviewDialog
      buttonText="Imprimir PDF vacío"
      templateName={templateName}
      templateCode={templateCode}
      sections={sections}
      date={date}
      revision={revision}
    />
  );
}
