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
  // notifications: FormattedNotifications[]; // COMMENTED OUT — notifications unused
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
export type NotificationsModalProps = {
  notifications: FormattedNotifications[];
};
export type NotificationItemProps = {
  notification: FormattedNotifications;
  formattedDate: string;
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

export type FormattedNotifications = {
  id: string;
  description: string;
  category: string;
  created_at: string;
  document: {
    id: number;
    documentName: string;
    resource: string;
    reference: 'employee' | 'vehicle';
  };
};
