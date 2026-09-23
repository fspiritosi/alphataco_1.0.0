import type { CurrentUserProfile } from '../actions/actions.navbar';

export type CompanyGroup = {
  label: string;
  teams: {
    label: string;
    value: string;
    logo?: string | null;
  }[];
};

export type NavbarClientProps = {
  user: CurrentUserProfile;
  companies: {
    sharedCompanies: Company[];
    allCompanies: Company[];
    currentCompany: Company[] | null;
  };
};

export type CompanySelectorProps = {
  sharedCompanies: Company[];
  allCompanies: Company[];
  currentCompany: Company[];
};
export type UserMenuProps = {
  /** Perfil de la sesión, tipado desde la query de Prisma (no desde los tipos generados por Supabase). */
  user: CurrentUserProfile;
};

export interface EmployeeDocumentWithDocumentTypes extends Omit<EmployeeDocument, 'id_document_types' | 'applies'> {
  id_document_types: DocumentTypes;
  applies: Employee;
}

export interface EquipmentDocumentWithDocumentTypes extends Omit<EquipmentDocument, 'id_document_types' | 'applies'> {
  id_document_types: DocumentTypes;
  applies: Vehicle;
}

