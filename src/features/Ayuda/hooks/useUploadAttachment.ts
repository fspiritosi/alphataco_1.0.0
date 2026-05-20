'use client';

import { useMutation } from '@tanstack/react-query';
import { uploadSupportTicketAttachment } from '../actions/support-attachments';

export function useUploadAttachment() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return uploadSupportTicketAttachment(fd);
    },
  });
}
