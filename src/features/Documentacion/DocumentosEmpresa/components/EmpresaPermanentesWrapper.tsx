'use client';

import { DataTable } from '@/app/dashboard/company/actualCompany/components/data-table';
import { columnsDocuments } from '@/app/dashboard/company/actualCompany/components/document-colums';
import { Card } from '@/components/ui/card';
import { CompanyDocumentsType, useLoggedUserStore } from '@/store/loggedUser';

export default function EmpresaPermanentesWrapper({ companyData }: { companyData: CompanyDocumentsType[] }) {
  const ownerUser = useLoggedUserStore.getState().profile;
  const sharedUsersAll = useLoggedUserStore.getState().sharedUsers;
  const sharedUsers =
    sharedUsersAll?.map((user) => {
      return {
        email: user.profile_id.email,
        fullname: user.profile_id.fullname,
        role: user?.role,
        alta: user.created_at,
        id: user.id,
        img: user.profile_id.avatar || '',
      };
    }) || [];
  const owner = ownerUser?.map((user) => {
    return {
      email: user.email,
      fullname: user.fullname as string,
      role: 'Propietario',
      alta: user.created_at ? new Date(user.created_at) : new Date(),
      id: user.id || '',
      img: user.avatar || '',
    };
  });

  const data = owner?.concat(
    sharedUsers?.map((user) => ({
      ...user,
      fullname: user.fullname || '',
    })) || []
  );

  const documentCompany = companyData
    ?.filter((e) => !e.id_document_types.private && !e.id_document_types.is_it_montlhy)
    .map((document) => {
      const sharedUserRole = data?.find((e) => e.email === document.user_id?.email)?.role;
      return {
        email: document.user_id?.email ?? 'Documento pendiente',
        fullname: document.id_document_types.name,
        role: sharedUserRole ?? 'Documento pendiente',
        alta: (document.user_id?.email && document.created_at) ?? 'Documento pendiente',
        id: document.id_document_types.id,
        img: document.user_id?.avatar,
        vencimiento: document.validity
          ? document.validity
          : document.id_document_types.explired
            ? 'Documento pendiente'
            : 'No expira',
        documentId: document.id,
        private: document.id_document_types.private,
      };
    });

  return (
    <Card className="p-6">
      <DataTable isDocuments data={documentCompany || []} columns={columnsDocuments} />
    </Card>
  );
}
