export type CompanyGroup = {
  label: string;
  teams: {
    label: string;
    value: string;
    logo?: string | null;
  }[];
};

export type NavbarClientProps = {
  user: UserProfile | null;
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
  user: UserProfile | null;
};

export interface EmployeeDocumentWithDocumentTypes extends Omit<EmployeeDocument, 'id_document_types' | 'applies'> {
  id_document_types: DocumentTypes;
  applies: Employee;
}

export interface EquipmentDocumentWithDocumentTypes extends Omit<EquipmentDocument, 'id_document_types' | 'applies'> {
  id_document_types: DocumentTypes;
  applies: Vehicle;
}

