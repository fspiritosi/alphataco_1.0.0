import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { contactColumns } from '@/features/Empresa/Contactos/components/columns';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { cookies } from 'next/headers';
import { fetchContacts } from '../../actions/contacts';

// This matches the Colum type from columns.tsx
type Contact = {
  id: string;
  contact_name: string | null;
  constact_email: string | null; // Note the typo to match the API
  contact_phone: number | null;
  contact_charge: string | null;
  customer_id: string | null;
  customers: {
    id: string;
    name: string;
  } | null;
  showInactive: boolean;
  status: string;
  company_id: string | null;
  created_at: string;
  is_active: boolean | null;
  reason_for_termination: string | null;
  termination_date: string | null;
};

export default async function Contact() {
  const coockiesStore = await cookies();
  const actualCompany = coockiesStore.get('actualComp')?.value;
  const saved = coockiesStore.get('contactTable')?.value;
  const savedVisibility = saved ? JSON.parse(saved) : {};
  const savedFilters = coockiesStore.get('contactTable-filters')?.value;
  const contacts = await fetchContacts();

  const contractorCompanies = (contacts
    ?.filter((company) => company.company_id?.toString() === actualCompany)
    .map((contact) => ({
      ...contact,
      showInactive: false,
      status: 'active',
    })) || []) as Contact[];

  const names = createFilterOptions(contractorCompanies, (contact) => contact.contact_name || '');
  const Email = createFilterOptions(contractorCompanies, (contact) => contact.constact_email || '');
  const phone = createFilterOptions(contractorCompanies, (contact) => contact.contact_phone?.toString() || '');
  const charge = createFilterOptions(contractorCompanies, (contact) => contact.contact_charge || '');
  const client = createFilterOptions(contractorCompanies, (contact) => contact.customers?.name || '');

  return (
    <BaseDataTable
      columns={contactColumns}
      data={contractorCompanies}
      savedVisibility={savedVisibility}
      tableId="contactTable"
      toolbarOptions={{
        initialVisibleFilters: savedFilters ? JSON.parse(savedFilters) : [],
        filterableColumns: [
          {
            columnId: 'Nombre',
            title: 'Nombre',
            options: names,
          },
          {
            columnId: 'Email',
            title: 'Email',
            options: Email,
          },
          {
            columnId: 'Teléfono',
            title: 'Teléfono',
            options: phone,
          },
          {
            columnId: 'Cliente',
            title: 'Cliente',
            options: client,
          },
          {
            columnId: 'Cargo',
            title: 'Cargo',
            options: charge,
          },
        ],
      }}
    />
  );
}
